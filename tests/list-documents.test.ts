import { describe, expect, it } from "vitest";

import {
  buildParams,
  listDocumentsConfig,
  listDocumentsHandler,
} from "../src/tools/list-documents.js";
import { fakeFetch } from "./helpers/fake-fetch.js";
import { makeClient } from "./helpers/make-client.js";

describe("listDocumentsConfig", () => {
  it("accepts an empty input", () => {
    expect(listDocumentsConfig.inputSchema.parse({})).toEqual({});
  });

  it("rejects unknown states", () => {
    expect(() => listDocumentsConfig.inputSchema.parse({ states: ["bogus"] })).toThrow();
  });

  it("rejects out-of-range page_size", () => {
    expect(() => listDocumentsConfig.inputSchema.parse({ page_size: 0 })).toThrow();
    expect(() => listDocumentsConfig.inputSchema.parse({ page_size: 101 })).toThrow();
  });
});

describe("buildParams", () => {
  it("returns no params for empty args", () => {
    expect(buildParams({})).toEqual({});
  });

  it("maps array filters to bracketed keys", () => {
    expect(
      buildParams({ states: ["pending", "signed"], types: ["contract"], tags: ["deals"] }),
    ).toEqual({
      "states[]": ["pending", "signed"],
      "types[]": ["contract"],
      "tags[]": ["deals"],
    });
  });

  it("stringifies page_size", () => {
    expect(buildParams({ page_size: 50 })).toEqual({ page_size: "50" });
  });
});

describe("listDocumentsHandler", () => {
  it("sends the bearer token and repeated array params", async () => {
    const { fetchImpl, requests } = fakeFetch([
      {
        method: "GET",
        path: "/v3/documents",
        response: { documents: [], pagination_meta: { cursor: null } },
      },
    ]);
    const handler = listDocumentsHandler(makeClient(fetchImpl));

    await handler({ title: "employment", states: ["pending", "signed"], page_size: 10 });

    const request = requests[0];
    expect(request.headers.authorization).toBe("Bearer test-key");
    expect(request.url.searchParams.get("title")).toBe("employment");
    expect(request.url.searchParams.getAll("states[]")).toEqual(["pending", "signed"]);
    expect(request.url.searchParams.get("page_size")).toBe("10");
  });

  it("formats the response with whitelisted fields and cursor", async () => {
    const { fetchImpl } = fakeFetch([
      {
        method: "GET",
        path: "/v3/documents",
        response: {
          documents: [
            {
              id: "doc-1",
              title: "Test",
              state: "pending",
              type: "contract",
              tags: ["deals"],
              created_at: "2026-01-01T00:00:00Z",
              updated_at: "2026-01-02T00:00:00Z",
              signed_at: null,
              comment_count: 3,
              owner: { id: "owner-1", full_name: "Jane Doe", email: "jane@example.com" },
              parties: [
                {
                  name: "Acme",
                  reference: "Recipient",
                  address: "886 Kihn Cordelia Isle",
                  signees: [
                    {
                      full_name: "John Smith",
                      email: "john@example.com",
                      signed_at: null,
                      order: 1,
                    },
                  ],
                },
              ],
            },
          ],
          pagination_meta: { cursor: "bmV4dA" },
        },
      },
    ]);
    const handler = listDocumentsHandler(makeClient(fetchImpl));

    const result = await handler({});
    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.cursor).toBe("bmV4dA");
    const document = parsed.documents[0];
    expect(document.id).toBe("doc-1");
    expect(document.state).toBe("pending");
    expect(document.comment_count).toBeUndefined();
    expect(document.owner).toEqual({ full_name: "Jane Doe", email: "jane@example.com" });
    expect(document.parties[0].address).toBeUndefined();
    expect(document.parties[0].signees[0]).toEqual({
      full_name: "John Smith",
      email: "john@example.com",
      signed_at: null,
    });
  });

  it("returns isError on HTTP failure", async () => {
    const { fetchImpl } = fakeFetch([
      {
        method: "GET",
        path: "/v3/documents",
        status: 401,
        response: { error: "unauthorized" },
      },
    ]);
    const handler = listDocumentsHandler(makeClient(fetchImpl));

    const result = await handler({});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("401");
  });
});
