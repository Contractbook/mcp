import { describe, expect, it } from "vitest";

import { ContractbookClient } from "../src/contractbook/client.js";
import {
  getDocumentContentConfig,
  getDocumentContentHandler,
  stripLineNumbers,
} from "../src/tools/get-document-content.js";
import { fakeFetch } from "./helpers/fake-fetch.js";

function makeClient(fetchImpl: typeof fetch) {
  return new ContractbookClient({
    baseUrl: "http://test",
    apiKey: "test-key",
    fetchImpl,
  });
}

describe("getDocumentContentConfig", () => {
  it("requires a document_id", () => {
    expect(() => getDocumentContentConfig.inputSchema.parse({})).toThrow();
  });

  it("accepts a document_id", () => {
    expect(getDocumentContentConfig.inputSchema.parse({ document_id: "abc" })).toEqual({
      document_id: "abc",
    });
  });
});

describe("stripLineNumbers", () => {
  it("removes the line #NNN: prefixes", () => {
    const input = "line #000: Hello\nline #001:\nline #002: World";
    expect(stripLineNumbers(input)).toBe("Hello\n\nWorld");
  });

  it("leaves content without prefixes untouched", () => {
    expect(stripLineNumbers("plain text\nno prefix")).toBe("plain text\nno prefix");
  });
});

describe("getDocumentContentHandler", () => {
  it("requests the markdown endpoint with the bearer token", async () => {
    const { fetchImpl, requests } = fakeFetch([
      {
        method: "GET",
        path: "/documents/doc-1/markdown",
        response: { document: { markdown: "line #000: Hi", uploaded_files: [] } },
      },
    ]);
    const handler = getDocumentContentHandler(makeClient(fetchImpl));

    const result = await handler({ document_id: "doc-1" });

    expect(requests[0].headers.authorization).toBe("Bearer test-key");
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.markdown).toBe("Hi");
    expect(parsed.attachments).toEqual([]);
  });

  it("returns attachment OCR text and status", async () => {
    const { fetchImpl } = fakeFetch([
      {
        method: "GET",
        path: "/documents/doc-1/markdown",
        response: {
          document: {
            markdown: "line #000: Body",
            uploaded_files: [
              {
                id: "f-1",
                text_markup: "scanned text",
                text_markup_mapping: { ignore: true },
                ocr_status: "completed",
              },
            ],
          },
        },
      },
    ]);
    const handler = getDocumentContentHandler(makeClient(fetchImpl));

    const parsed = JSON.parse((await handler({ document_id: "doc-1" })).content[0].text);
    expect(parsed.markdown).toBe("Body");
    expect(parsed.attachments).toEqual([
      { id: "f-1", ocr_status: "completed", text: "scanned text" },
    ]);
  });

  it("returns isError on HTTP failure", async () => {
    const { fetchImpl } = fakeFetch([
      {
        method: "GET",
        path: "/documents/doc-1/markdown",
        status: 404,
        response: { error: "not found" },
      },
    ]);
    const handler = getDocumentContentHandler(makeClient(fetchImpl));

    const result = await handler({ document_id: "doc-1" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("404");
  });
});
