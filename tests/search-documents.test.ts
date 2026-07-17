import { describe, expect, it } from "vitest";

import { ContractbookClient } from "../src/contractbook/client.js";
import {
  buildParams,
  searchDocumentsConfig,
  searchDocumentsHandler,
} from "../src/tools/search-documents.js";
import { fakeFetch } from "./helpers/fake-fetch.js";

function makeClient(fetchImpl: typeof fetch) {
  return new ContractbookClient({
    baseUrl: "http://test",
    apiKey: "test-key",
    fetchImpl,
  });
}

describe("searchDocumentsConfig", () => {
  it("requires a term", () => {
    expect(() => searchDocumentsConfig.inputSchema.parse({})).toThrow();
  });

  it("rejects a term shorter than 3 characters", () => {
    expect(() => searchDocumentsConfig.inputSchema.parse({ term: "ab" })).toThrow();
  });

  it("rejects an unknown sort_column", () => {
    expect(() =>
      searchDocumentsConfig.inputSchema.parse({ term: "rent", sort_column: "bogus" }),
    ).toThrow();
  });

  it("accepts a valid term", () => {
    expect(searchDocumentsConfig.inputSchema.parse({ term: "rent" })).toEqual({ term: "rent" });
  });
});

describe("buildParams", () => {
  it("always includes the term", () => {
    expect(buildParams({ term: "lease" })).toEqual({ term: "lease" });
  });

  it("stringifies page_size and passes sort options", () => {
    expect(
      buildParams({
        term: "lease",
        page_size: 20,
        sort_column: "search_ranking_value",
        sort_direction: "desc",
      }),
    ).toEqual({
      term: "lease",
      page_size: "20",
      sort_column: "search_ranking_value",
      sort_direction: "desc",
    });
  });
});

describe("searchDocumentsHandler", () => {
  it("hits /documents/search with the bearer token and term", async () => {
    const { fetchImpl, requests } = fakeFetch([
      {
        method: "GET",
        path: "/documents/search",
        response: { documents: [], pagination_meta: { cursor: null } },
      },
    ]);
    const handler = searchDocumentsHandler(makeClient(fetchImpl));

    await handler({ term: "agreement", page_size: 5 });

    const request = requests[0];
    expect(request.headers.authorization).toBe("Bearer test-key");
    expect(request.url.searchParams.get("term")).toBe("agreement");
    expect(request.url.searchParams.get("page_size")).toBe("5");
  });

  it("formats results with snippets and flattened parties", async () => {
    const { fetchImpl } = fakeFetch([
      {
        method: "GET",
        path: "/documents/search",
        response: {
          documents: [
            {
              id: "doc-1",
              title: "Test Agreement",
              state: "signed",
              type: "contract",
              version: "v-1",
              created_at: "2026-01-01T00:00:00Z",
              updated_at: "2026-01-02T00:00:00Z",
              owner: { id: "o-1", full_name: "Jane Doe", email: "jane@example.com" },
              parties: [
                {
                  id: "p-1",
                  type: "personal",
                  full_name: "John Smith",
                  email: "john@example.com",
                  signed_at: "2026-01-02T00:00:00Z",
                  order: 0,
                },
              ],
              search_snippets: {
                remaining_count: "9",
                snippets: ["the following <@|Agreement|@> (the"],
              },
              search_matched_attachments: [],
            },
          ],
          pagination_meta: { cursor: "bmV4dA" },
        },
      },
    ]);
    const handler = searchDocumentsHandler(makeClient(fetchImpl));

    const result = await handler({ term: "agreement" });
    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.cursor).toBe("bmV4dA");
    const document = parsed.documents[0];
    expect(document.id).toBe("doc-1");
    expect(document.version).toBeUndefined();
    expect(document.owner).toEqual({ full_name: "Jane Doe", email: "jane@example.com" });
    expect(document.parties[0]).toEqual({
      full_name: "John Smith",
      email: "john@example.com",
      signed_at: "2026-01-02T00:00:00Z",
    });
    expect(document.snippets).toEqual(["the following <@|Agreement|@> (the"]);
    expect(document.matched_attachments).toEqual([]);
  });

  it("returns isError on HTTP failure", async () => {
    const { fetchImpl } = fakeFetch([
      {
        method: "GET",
        path: "/documents/search",
        status: 401,
        response: { error: "unauthorized" },
      },
    ]);
    const handler = searchDocumentsHandler(makeClient(fetchImpl));

    const result = await handler({ term: "agreement" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("401");
  });
});
