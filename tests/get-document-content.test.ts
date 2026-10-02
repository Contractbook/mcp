import type { ServerContext } from "@modelcontextprotocol/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DATA_FIELDS_GRACE_MS,
  getDocumentContentConfig,
  getDocumentContentHandler,
  stripLineNumbers,
} from "../src/tools/get-document-content.js";
import { type CapturedRequest, type Route, fakeFetch } from "./helpers/fake-fetch.js";
import { makeClient } from "./helpers/make-client.js";

describe("getDocumentContentConfig", () => {
  it("requires a document_id", () => {
    expect(() => getDocumentContentConfig.inputSchema.parse({})).toThrow();
  });

  it("accepts a document_id", () => {
    const id = "3f8b2c1e-5d4a-4b6c-9e7f-1a2b3c4d5e6f";
    expect(getDocumentContentConfig.inputSchema.parse({ document_id: id })).toEqual({
      document_id: id,
    });
  });

  it("accepts include_data_fields", () => {
    const id = "3f8b2c1e-5d4a-4b6c-9e7f-1a2b3c4d5e6f";
    expect(
      getDocumentContentConfig.inputSchema.parse({ document_id: id, include_data_fields: true }),
    ).toEqual({ document_id: id, include_data_fields: true });
  });

  it("rejects a non-boolean include_data_fields", () => {
    const id = "3f8b2c1e-5d4a-4b6c-9e7f-1a2b3c4d5e6f";
    expect(() =>
      getDocumentContentConfig.inputSchema.parse({ document_id: id, include_data_fields: "yes" }),
    ).toThrow();
  });

  it("rejects a document_id that is not a UUID", () => {
    expect(() => getDocumentContentConfig.inputSchema.parse({ document_id: "abc" })).toThrow();
  });

  it("rejects a document_id that would alter the request path", () => {
    for (const id of ["../../other", "a/b", "x?y=1", "x#y"]) {
      expect(() => getDocumentContentConfig.inputSchema.parse({ document_id: id })).toThrow();
    }
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
  const id = "3f8b2c1e-5d4a-4b6c-9e7f-1a2b3c4d5e6f";
  const markdownPath = `/documents/${id}/markdown`;
  const documentPath = `/v3/documents/${id}`;

  afterEach(() => {
    vi.useRealTimers();
  });

  function markdownRoute(overrides: Partial<Route> = {}): Route {
    return {
      method: "GET",
      path: markdownPath,
      response: { document: { markdown: "line #000: Hi", uploaded_files: [] } },
      ...overrides,
    };
  }

  function documentRoute(overrides: Partial<Route> = {}): Route {
    return {
      method: "GET",
      path: documentPath,
      response: { document: { id, data_fields: [] } },
      ...overrides,
    };
  }

  function setup(routes: Route[]) {
    const fake = fakeFetch(routes, { anyOrder: true });
    return { ...fake, handler: getDocumentContentHandler(makeClient(fake.fetchImpl)) };
  }

  async function callWithDataFields(routes: Route[]) {
    const { handler, requests, unused } = setup(routes);
    const result = await handler({ document_id: id, include_data_fields: true });
    expect(unused).toHaveLength(0);
    return { result, requests };
  }

  function requestTo(requests: CapturedRequest[], path: string) {
    const request = requests.find((candidate) => candidate.url.pathname === path);
    expect(request).toBeDefined();
    return request as CapturedRequest;
  }

  function contextWith(signal: AbortSignal) {
    return { mcpReq: { signal } } as unknown as ServerContext;
  }

  function settlesQuickly<T>(promise: Promise<T>): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_resolve, reject) =>
        setTimeout(() => reject(new Error("handler did not settle")), 1_000),
      ),
    ]);
  }

  describe("without include_data_fields", () => {
    it("only requests the markdown endpoint", async () => {
      const { handler, requests } = setup([markdownRoute()]);

      const result = await handler({ document_id: id });

      expect(requests).toHaveLength(1);
      expect(requests[0].url.pathname).toBe(markdownPath);
      expect(requests[0].headers.authorization).toBe("Bearer test-key");
      expect(JSON.parse(result.content[0].text)).toStrictEqual({ markdown: "Hi", attachments: [] });
    });

    it("returns attachment OCR text and status", async () => {
      const { handler } = setup([
        markdownRoute({
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
        }),
      ]);

      const parsed = JSON.parse((await handler({ document_id: id })).content[0].text);
      expect(parsed.markdown).toBe("Body");
      expect(parsed.attachments).toStrictEqual([
        { id: "f-1", ocr_status: "completed", text: "scanned text" },
      ]);
    });

    it("returns isError when the markdown request fails", async () => {
      const { handler, requests } = setup([
        markdownRoute({ status: 404, response: { error: "not found" } }),
      ]);

      const result = await handler({ document_id: id });

      expect(requests).toHaveLength(1);
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/^Failed to fetch document content: HTTP 404/);
    });

    it("returns isError instead of empty markdown when the response is not a document", async () => {
      const { handler } = setup([markdownRoute({ contentType: "text/html", response: "<html>" })]);

      const result = await handler({ document_id: id });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe(
        "Failed to fetch document content: unexpected response from the markdown API",
      );
    });

    it("returns isError when the markdown body is JSON null", async () => {
      const { handler } = setup([markdownRoute({ body: "null" })]);

      const result = await handler({ document_id: id });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("unexpected response from the markdown API");
    });

    it("passes the MCP cancellation signal to the markdown request", async () => {
      const { handler, requests } = setup([markdownRoute({ hang: true })]);
      const cancellation = new AbortController();

      const pending = handler({ document_id: id }, contextWith(cancellation.signal));
      cancellation.abort();
      const result = await settlesQuickly(pending);

      expect(result.isError).toBe(true);
      expect(requests[0].signal?.aborted).toBe(true);
    });
  });

  describe("with include_data_fields", () => {
    it("requests both endpoints with the bearer token", async () => {
      const { result, requests } = await callWithDataFields([markdownRoute(), documentRoute()]);

      for (const path of [markdownPath, documentPath]) {
        expect(requestTo(requests, path).headers.authorization).toBe("Bearer test-key");
      }
      expect(JSON.parse(result.content[0].text)).toStrictEqual({
        markdown: "Hi",
        attachments: [],
        data_fields: [],
      });
    });

    it("returns the document's data fields", async () => {
      const { result } = await callWithDataFields([
        markdownRoute(),
        documentRoute({
          response: {
            document: {
              id,
              title: "ignored",
              data_fields: [
                {
                  id: "df-1",
                  name: "Salary",
                  type: "number",
                  value: "50000",
                  description: "Annual salary",
                  required: true,
                  config: {},
                  formatting: { grouping: "dot", fractional: false },
                  source: null,
                  source_mapping: null,
                  source_sync_type: null,
                },
                {
                  id: "df-2",
                  name: "Role",
                  type: "select",
                  value: null,
                  description: null,
                  required: false,
                  config: { options: ["Engineer", "Manager"], internal: "junk" },
                  formatting: null,
                },
                {
                  id: "df-3",
                  name: "Start date",
                  type: "date",
                  value: "2026-10-01",
                  formatting: { date: "D MMM YYYY" },
                },
              ],
            },
          },
        }),
      ]);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.data_fields).toStrictEqual([
        {
          id: "df-1",
          name: "Salary",
          type: "number",
          value: "50000",
          description: "Annual salary",
          required: true,
          config: {},
          formatting: { grouping: "dot", fractional: false },
        },
        {
          id: "df-2",
          name: "Role",
          type: "select",
          value: null,
          description: null,
          required: false,
          config: { options: ["Engineer", "Manager"] },
          formatting: null,
        },
        {
          id: "df-3",
          name: "Start date",
          type: "date",
          value: "2026-10-01",
          formatting: { date: "D MMM YYYY" },
        },
      ]);
    });

    it("skips data field entries that are not objects", async () => {
      const { result } = await callWithDataFields([
        markdownRoute(),
        documentRoute({
          response: {
            document: {
              id,
              data_fields: [null, "junk", 7, { id: "df-1", name: "A", type: "text" }],
            },
          },
        }),
      ]);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.markdown).toBe("Hi");
      expect(parsed.data_fields).toStrictEqual([{ id: "df-1", name: "A", type: "text" }]);
    });

    it("returns isError naming the content request when the markdown request fails", async () => {
      const { result } = await callWithDataFields([
        markdownRoute({ status: 404, response: { error: "not found" } }),
        documentRoute(),
      ]);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/^Failed to fetch document content: HTTP 404/);
    });

    it("reports only the content error when both requests fail", async () => {
      const { result } = await callWithDataFields([
        markdownRoute({ status: 404, response: { error: "not found" } }),
        documentRoute({ status: 403, response: { error: "forbidden" } }),
      ]);

      expect(result.isError).toBe(true);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toMatch(/^Failed to fetch document content: HTTP 404/);
      expect(result.content[0].text).not.toContain("403");
    });

    it("cancels the in-flight data fields request as soon as the markdown request fails", async () => {
      const { handler, requests } = setup([
        markdownRoute({ status: 404, response: { error: "not found" } }),
        documentRoute({ hang: true }),
      ]);

      const result = await settlesQuickly(handler({ document_id: id, include_data_fields: true }));

      expect(result.isError).toBe(true);
      const signal = requestTo(requests, documentPath).signal;
      expect(signal?.aborted).toBe(true);
      expect(signal?.reason).toMatchObject({ name: "AbortError" });
    });

    it("cancels the data fields request when the markdown response is malformed", async () => {
      const { handler, requests } = setup([
        markdownRoute({ body: "null" }),
        documentRoute({ hang: true }),
      ]);

      const result = await settlesQuickly(handler({ document_id: id, include_data_fields: true }));

      expect(result.isError).toBe(true);
      expect(requestTo(requests, documentPath).signal?.aborted).toBe(true);
    });

    it("cancels both requests when the MCP client cancels", async () => {
      const { handler, requests } = setup([
        markdownRoute({ hang: true }),
        documentRoute({ hang: true }),
      ]);
      const cancellation = new AbortController();

      const pending = handler(
        { document_id: id, include_data_fields: true },
        contextWith(cancellation.signal),
      );
      cancellation.abort();
      const result = await settlesQuickly(pending);

      expect(result.isError).toBe(true);
      expect(requestTo(requests, markdownPath).signal?.aborted).toBe(true);
      expect(requestTo(requests, documentPath).signal?.aborted).toBe(true);
    });

    it("rejects when the MCP client cancels while waiting for data fields", async () => {
      const { handler, requests } = setup([markdownRoute(), documentRoute({ hang: true })]);
      const cancellation = new AbortController();

      const pending = handler(
        { document_id: id, include_data_fields: true },
        contextWith(cancellation.signal),
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(requestTo(requests, markdownPath).signal?.aborted).toBe(false);
      cancellation.abort();

      await expect(settlesQuickly(pending)).rejects.toMatchObject({ name: "AbortError" });
      expect(requestTo(requests, documentPath).signal?.aborted).toBe(true);
    });

    it("stops waiting for data fields after the grace period once the content has arrived", async () => {
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
      const { handler, requests } = setup([markdownRoute(), documentRoute({ hang: true })]);

      const pending = handler({ document_id: id, include_data_fields: true });
      await vi.advanceTimersByTimeAsync(DATA_FIELDS_GRACE_MS);
      const result = await pending;

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.markdown).toBe("Hi");
      expect(parsed.data_fields).toBeNull();
      expect(parsed.data_fields_error).toBe(
        "Failed to fetch data fields: Timed out waiting for the data fields request",
      );
      expect(requestTo(requests, documentPath).signal?.aborted).toBe(true);
    });

    it("still returns the content when the data fields request fails", async () => {
      const { result } = await callWithDataFields([
        markdownRoute(),
        documentRoute({ status: 403, response: { error: "forbidden" } }),
      ]);

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.markdown).toBe("Hi");
      expect(parsed.attachments).toEqual([]);
      expect(parsed.data_fields).toBeNull();
      expect(parsed.data_fields_error).toMatch(/^Failed to fetch data fields: HTTP 403/);
    });

    it("truncates a large error body in data_fields_error", async () => {
      const page = `<html>${"x".repeat(200_000)}</html>`;
      const { result } = await callWithDataFields([
        markdownRoute(),
        documentRoute({ status: 502, contentType: "text/html", response: page }),
      ]);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.data_fields_error).toMatch(
        /^Failed to fetch data fields: HTTP 502: <html>x+…$/,
      );
      expect(parsed.data_fields_error.length).toBeLessThan(600);
    });

    it("keeps the HTTP status when an error response has a malformed JSON body", async () => {
      const { result } = await callWithDataFields([
        markdownRoute(),
        documentRoute({ status: 500, body: "<html>oops</html>" }),
      ]);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.data_fields_error).toBe(
        "Failed to fetch data fields: HTTP 500: <html>oops</html>",
      );
    });

    it.each([
      ["has no document", { response: {} }],
      ["has no data_fields", { response: { document: { id } } }],
      ["is JSON null", { body: "null" }],
      ["is not JSON", { contentType: "text/html", response: "<html></html>" }],
    ])("reports data fields as unavailable when the response %s", async (_name, overrides) => {
      const { result } = await callWithDataFields([markdownRoute(), documentRoute(overrides)]);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.markdown).toBe("Hi");
      expect(parsed.data_fields).toBeNull();
      expect(parsed.data_fields_error).toBe(
        "Data fields unavailable: unexpected response from the documents API",
      );
    });
  });
});
