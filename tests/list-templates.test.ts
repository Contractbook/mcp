import { describe, expect, it } from "vitest";

import { ContractbookClient } from "../src/contractbook/client.js";
import {
  buildParams,
  listTemplatesConfig,
  listTemplatesHandler,
} from "../src/tools/list-templates.js";
import { fakeFetch } from "./helpers/fake-fetch.js";

function makeClient(fetchImpl: typeof fetch) {
  return new ContractbookClient({
    baseUrl: "http://test",
    apiKey: "test-key",
    fetchImpl,
  });
}

describe("listTemplatesConfig", () => {
  it("accepts empty args", () => {
    expect(listTemplatesConfig.inputSchema.parse({})).toEqual({});
  });

  it("accepts exclude_spaces", () => {
    expect(listTemplatesConfig.inputSchema.parse({ exclude_spaces: true })).toEqual({
      exclude_spaces: true,
    });
  });

  it("rejects a non-boolean exclude_spaces", () => {
    expect(() => listTemplatesConfig.inputSchema.parse({ exclude_spaces: "yes" })).toThrow();
  });
});

describe("buildParams", () => {
  it("returns empty params when no args", () => {
    expect(buildParams({})).toEqual({});
  });

  it("stringifies exclude_spaces, including false", () => {
    expect(buildParams({ exclude_spaces: false })).toEqual({ exclude_spaces: "false" });
    expect(buildParams({ exclude_spaces: true })).toEqual({ exclude_spaces: "true" });
  });
});

describe("listTemplatesHandler", () => {
  it("hits /v3/templates with the bearer token and exclude_spaces", async () => {
    const { fetchImpl, requests } = fakeFetch([
      {
        method: "GET",
        path: "/v3/templates",
        response: { templates: [] },
      },
    ]);
    const handler = listTemplatesHandler(makeClient(fetchImpl));

    await handler({ exclude_spaces: true });

    const request = requests[0];
    expect(request.headers.authorization).toBe("Bearer test-key");
    expect(request.url.searchParams.get("exclude_spaces")).toBe("true");
  });

  it("formats templates and strips non-whitelisted fields", async () => {
    const { fetchImpl } = fakeFetch([
      {
        method: "GET",
        path: "/v3/templates",
        response: {
          templates: [
            {
              id: "1e013958-867e-43fb-8210-c98ab139beb6",
              title: "NDA",
              description: "Standard NDA",
              language: "en",
              slug: "nda",
              owned: true,
              owner_id: "o-1",
              location: { id: "root", name: "Workspace", type: "workspace" },
              created_at: "2026-01-01T00:00:00Z",
              updated_at: "2026-01-02T00:00:00Z",
            },
          ],
        },
      },
    ]);
    const handler = listTemplatesHandler(makeClient(fetchImpl));

    const result = await handler({});
    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    const template = parsed.templates[0];
    expect(template.id).toBe("1e013958-867e-43fb-8210-c98ab139beb6");
    expect(template.title).toBe("NDA");
    expect(template.slug).toBeUndefined();
    expect(template.owned).toBeUndefined();
    expect(template.owner_id).toBeUndefined();
    expect(template.location).toEqual({ name: "Workspace", type: "workspace" });
  });

  it("returns isError on HTTP failure", async () => {
    const { fetchImpl } = fakeFetch([
      {
        method: "GET",
        path: "/v3/templates",
        status: 401,
        response: { error: "unauthorized" },
      },
    ]);
    const handler = listTemplatesHandler(makeClient(fetchImpl));

    const result = await handler({});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("401");
  });
});
