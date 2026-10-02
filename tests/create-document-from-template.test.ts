import { describe, expect, it } from "vitest";

import {
  buildBody,
  createDocumentFromTemplateConfig,
  createDocumentFromTemplateHandler,
} from "../src/tools/create-document-from-template.js";
import { fakeFetch } from "./helpers/fake-fetch.js";
import { makeClient } from "./helpers/make-client.js";

const templateId = "1e013958-867e-43fb-8210-c98ab139beb6";
const appUrl = "https://app.test";

describe("createDocumentFromTemplateConfig", () => {
  it("requires a template_id", () => {
    expect(() => createDocumentFromTemplateConfig.inputSchema.parse({})).toThrow();
  });

  it("rejects a non-UUID template_id", () => {
    expect(() =>
      createDocumentFromTemplateConfig.inputSchema.parse({ template_id: "nope" }),
    ).toThrow();
  });

  it("rejects a data field without a value", () => {
    expect(() =>
      createDocumentFromTemplateConfig.inputSchema.parse({
        template_id: templateId,
        data_fields: [{ name: "Company Name", type: "text" }],
      }),
    ).toThrow();
  });

  it("rejects an unknown signature verification method", () => {
    expect(() =>
      createDocumentFromTemplateConfig.inputSchema.parse({
        template_id: templateId,
        parties: [{ signees: [{ signature_verification_methods: ["carrier_pigeon"] }] }],
      }),
    ).toThrow();
  });

  it("rejects an unknown signing_order_mode", () => {
    expect(() =>
      createDocumentFromTemplateConfig.inputSchema.parse({
        template_id: templateId,
        signing_order_mode: "bogus",
      }),
    ).toThrow();
  });

  it("accepts a full nested payload", () => {
    const args = {
      template_id: templateId,
      title: "NDA with ACME",
      language: "en",
      tags: ["nda"],
      parties: [
        {
          type: "company",
          name: "ACME Inc",
          reference: "Recipient",
          number: "DK12345678",
          signees: [
            {
              full_name: "Jane Doe",
              email: "jane@acme.com",
              order: 0,
              signature_verification_methods: ["sms", "basic"],
            },
          ],
        },
      ],
      data_fields: [{ name: "Company Name", type: "text", value: "ACME Inc" }],
      message: { content: "Please review" },
      signing_order_mode: "strict",
      to_be_signed_by: "owner_and_others",
      dynamic_tables: [{ attrs: { id: "t-1", columns: ["Item"], rows: [["Widget"]] } }],
    };
    expect(createDocumentFromTemplateConfig.inputSchema.parse(args)).toEqual(args);
  });
});

describe("buildBody", () => {
  it("returns an empty document for template_id-only args", () => {
    expect(buildBody({ template_id: templateId })).toEqual({ document: {} });
  });

  it("nests fields under document without leaking template_id", () => {
    const body = buildBody({
      template_id: templateId,
      title: "NDA with ACME",
      tags: ["nda"],
      data_fields: [{ name: "Company Name", type: "text", value: "ACME Inc" }],
    });
    expect(body).toEqual({
      document: {
        title: "NDA with ACME",
        tags: ["nda"],
        data_fields: [{ name: "Company Name", type: "text", value: "ACME Inc" }],
      },
    });
    expect("template_id" in body.document).toBe(false);
  });
});

describe("createDocumentFromTemplateHandler", () => {
  it("POSTs JSON to /v3/templates/{id}/create_document", async () => {
    const { fetchImpl, requests } = fakeFetch([
      {
        method: "POST",
        path: `/v3/templates/${templateId}/create_document`,
        status: 201,
        response: { document: { id: "doc-1" } },
      },
    ]);
    const handler = createDocumentFromTemplateHandler(makeClient(fetchImpl), appUrl);

    await handler({
      template_id: templateId,
      title: "NDA with ACME",
      data_fields: [{ name: "Company Name", type: "text", value: "ACME Inc" }],
    });

    const request = requests[0];
    expect(request.url.pathname).toBe(`/v3/templates/${templateId}/create_document`);
    expect(request.headers.authorization).toBe("Bearer test-key");
    expect(request.headers["content-type"]).toBe("application/json");
    expect(JSON.parse(request.body as string)).toEqual({
      document: {
        title: "NDA with ACME",
        data_fields: [{ name: "Company Name", type: "text", value: "ACME Inc" }],
      },
    });
  });

  it("formats the created document and strips non-whitelisted fields", async () => {
    const { fetchImpl } = fakeFetch([
      {
        method: "POST",
        path: `/v3/templates/${templateId}/create_document`,
        status: 201,
        response: {
          document: {
            id: "doc-1",
            title: "NDA with ACME",
            state: "draft",
            type: "draft",
            language: "en",
            tags: ["nda"],
            created_at: "2026-07-22T00:00:00Z",
            updated_at: "2026-07-22T00:00:00Z",
            version: "v-1",
            events: [],
            comments: [],
            source_template_id: templateId,
            parties: [
              {
                id: "p-1",
                type: "company",
                name: "ACME Inc",
                reference: "Recipient",
                signees: [
                  {
                    id: "s-1",
                    full_name: "Jane Doe",
                    email: "jane@acme.com",
                    order: 0,
                    opened_at: null,
                  },
                ],
              },
            ],
            data_fields: [
              {
                id: "5f0f7cb1-9e5f-4c66-9f6d-6a37f74071d1",
                name: "Company Name",
                type: "text",
                value: "ACME Inc",
                source: "ai",
              },
            ],
          },
        },
      },
    ]);
    const handler = createDocumentFromTemplateHandler(makeClient(fetchImpl), appUrl);

    const result = await handler({ template_id: templateId });
    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    const document = parsed.document;
    expect(document.id).toBe("doc-1");
    expect(document.url).toBe("https://app.test/draft/NDA%20with%20ACME/doc-1");
    expect(document.state).toBe("draft");
    expect(document.source_template_id).toBe(templateId);
    expect(document.version).toBeUndefined();
    expect(document.events).toBeUndefined();
    expect(document.parties).toEqual([
      {
        type: "company",
        name: "ACME Inc",
        reference: "Recipient",
        signees: [{ full_name: "Jane Doe", email: "jane@acme.com", order: 0 }],
      },
    ]);
    expect(document.data_fields).toEqual([
      {
        id: "5f0f7cb1-9e5f-4c66-9f6d-6a37f74071d1",
        name: "Company Name",
        type: "text",
        value: "ACME Inc",
      },
    ]);
  });

  it("percent-encodes special characters in the draft url title segment", async () => {
    const { fetchImpl } = fakeFetch([
      {
        method: "POST",
        path: `/v3/templates/${templateId}/create_document`,
        status: 201,
        response: {
          document: {
            id: "doc-1",
            title: "Employment Contract – Jarek Owczarek (Account Executive)",
          },
        },
      },
    ]);
    const handler = createDocumentFromTemplateHandler(makeClient(fetchImpl), appUrl);

    const result = await handler({ template_id: templateId });
    const document = JSON.parse(result.content[0].text).document;
    expect(document.url).toBe(
      "https://app.test/draft/Employment%20Contract%20%E2%80%93%20Jarek%20Owczarek%20(Account%20Executive)/doc-1",
    );
  });

  it("falls back to Untitled in the draft url when the document has no title", async () => {
    const { fetchImpl } = fakeFetch([
      {
        method: "POST",
        path: `/v3/templates/${templateId}/create_document`,
        status: 201,
        response: { document: { id: "doc-1" } },
      },
    ]);
    const handler = createDocumentFromTemplateHandler(makeClient(fetchImpl), appUrl);

    const result = await handler({ template_id: templateId });
    const document = JSON.parse(result.content[0].text).document;
    expect(document.url).toBe("https://app.test/draft/Untitled/doc-1");
  });

  it("returns isError with the validation body on HTTP failure", async () => {
    const { fetchImpl } = fakeFetch([
      {
        method: "POST",
        path: `/v3/templates/${templateId}/create_document`,
        status: 422,
        response: { error: { title: ["is too long"] } },
      },
    ]);
    const handler = createDocumentFromTemplateHandler(makeClient(fetchImpl), appUrl);

    const result = await handler({ template_id: templateId, title: "x".repeat(500) });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("422");
    expect(result.content[0].text).toContain("is too long");
  });

  it("does not truncate a long JSON validation error", async () => {
    const errors = Object.fromEntries(
      Array.from({ length: 30 }, (_, i) => [`data_fields.${i}.value`, ["is invalid"]]),
    );
    const { fetchImpl } = fakeFetch([
      {
        method: "POST",
        path: `/v3/templates/${templateId}/create_document`,
        status: 422,
        response: { error: errors },
      },
    ]);
    const handler = createDocumentFromTemplateHandler(makeClient(fetchImpl), appUrl);

    const result = await handler({ template_id: templateId });
    expect(result.content[0].text).toBe(`HTTP 422: ${JSON.stringify({ error: errors })}`);
    expect(result.content[0].text.length).toBeGreaterThan(500);
  });
});
