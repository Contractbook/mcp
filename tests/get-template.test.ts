import { describe, expect, it } from "vitest";

import { ContractbookClient } from "../src/contractbook/client.js";
import { getTemplateConfig, getTemplateHandler } from "../src/tools/get-template.js";
import { fakeFetch } from "./helpers/fake-fetch.js";

const templateId = "1e013958-867e-43fb-8210-c98ab139beb6";

function makeClient(fetchImpl: typeof fetch) {
  return new ContractbookClient({
    baseUrl: "http://test",
    apiKey: "test-key",
    fetchImpl,
  });
}

describe("getTemplateConfig", () => {
  it("requires an id", () => {
    expect(() => getTemplateConfig.inputSchema.parse({})).toThrow();
  });

  it("rejects a non-UUID id", () => {
    expect(() => getTemplateConfig.inputSchema.parse({ id: "not-a-uuid" })).toThrow();
  });

  it("accepts a UUID id", () => {
    expect(getTemplateConfig.inputSchema.parse({ id: templateId })).toEqual({ id: templateId });
  });
});

describe("getTemplateHandler", () => {
  it("hits /v3/templates/{id} with the bearer token", async () => {
    const { fetchImpl, requests } = fakeFetch([
      {
        method: "GET",
        path: `/v3/templates/${templateId}`,
        response: { template: { id: templateId } },
      },
    ]);
    const handler = getTemplateHandler(makeClient(fetchImpl));

    await handler({ id: templateId });

    const request = requests[0];
    expect(request.headers.authorization).toBe("Bearer test-key");
    expect(request.url.pathname).toBe(`/v3/templates/${templateId}`);
  });

  it("keeps data_fields and strips non-whitelisted fields", async () => {
    const { fetchImpl } = fakeFetch([
      {
        method: "GET",
        path: `/v3/templates/${templateId}`,
        response: {
          template: {
            id: templateId,
            title: "NDA",
            description: "Standard NDA",
            language: "en",
            default_message: "Please sign",
            company_logo_url: null,
            slug: "nda",
            owned: true,
            owner_id: "o-1",
            created_at: "2026-01-01T00:00:00Z",
            updated_at: "2026-01-02T00:00:00Z",
            attachments: [{ original: "https://example.com/a.pdf", preview: ["p1", "p2"] }],
            data_fields: [
              {
                id: "5f0f7cb1-9e5f-4c66-9f6d-6a37f74071d1",
                name: "Company Name",
                type: "text",
                value: "ACME",
                description: "Counterparty name",
                required: true,
                config: { label: null, options: ["a", "b"], internal: "junk" },
                source: "ai",
                source_mapping: "secret",
              },
            ],
          },
        },
      },
    ]);
    const handler = getTemplateHandler(makeClient(fetchImpl));

    const result = await handler({ id: templateId });
    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    const template = parsed.template;
    expect(template.id).toBe(templateId);
    expect(template.default_message).toBe("Please sign");
    expect(template.slug).toBeUndefined();
    expect(template.owner_id).toBeUndefined();
    expect(template.attachments).toEqual([{ original: "https://example.com/a.pdf" }]);
    expect(template.data_fields).toEqual([
      {
        id: "5f0f7cb1-9e5f-4c66-9f6d-6a37f74071d1",
        name: "Company Name",
        type: "text",
        value: "ACME",
        description: "Counterparty name",
        required: true,
        config: { label: null, options: ["a", "b"] },
      },
    ]);
  });

  it("returns isError on HTTP failure", async () => {
    const { fetchImpl } = fakeFetch([
      {
        method: "GET",
        path: `/v3/templates/${templateId}`,
        status: 404,
        response: { error: "not found" },
      },
    ]);
    const handler = getTemplateHandler(makeClient(fetchImpl));

    const result = await handler({ id: templateId });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("404");
  });
});
