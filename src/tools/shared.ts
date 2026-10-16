import { z } from "zod";

import type { TemplateDataField } from "../contractbook/client.js";

export const dataFieldTypes = ["text", "number", "date", "select", "checkbox"] as const;

export const signatureVerificationMethods = [
  "sms",
  "basic",
  "wet_signature",
  "criipto_dk_mitid_substantial",
  "criipto_dk_mitid_business",
  "criipto_no_bankid",
  "criipto_se_bankid_same_device",
  "criipto_se_bankid_another_device",
  "criipto_fi_bankid",
  "criipto_fi_bankid_mobile",
] as const;

export const dataFieldSchema = z.object({
  name: z.string().describe("Data field name"),
  type: z.enum(dataFieldTypes).describe("Data field type"),
  value: z
    .string()
    .describe('Data field value as a string; use "true"/"false" for checkbox fields'),
  id: z
    .uuid()
    .optional()
    .describe("Data field ID; use the id reported by get_template to target a template field"),
  description: z.string().optional().describe("Data field description"),
  required: z
    .boolean()
    .optional()
    .describe("Whether the field must be filled before the document can be sent for signature"),
  config: z
    .record(z.string(), z.unknown())
    .optional()
    .describe("Additional config: `options` (string array) for select, `label` for checkbox"),
});

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function formatDataField(field: TemplateDataField) {
  return {
    id: field.id,
    name: field.name,
    type: field.type,
    value: field.value,
    description: field.description,
    required: field.required,
    config: field.config && {
      label: field.config.label,
      options: field.config.options,
    },
    formatting: field.formatting,
  };
}

export function documentUrl(
  appUrl: string,
  document: { id?: string; title?: string | null; state?: string; type?: string },
): string | undefined {
  if (!document.id) {
    return undefined;
  }
  const route =
    document.state === "draft"
      ? "draft"
      : document.type === "stored_contract"
        ? "stored-contract"
        : "contract";
  return `${appUrl}/${route}/${encodeDocumentTitle(document.title)}/${document.id}`;
}

function encodeDocumentTitle(title: string | null | undefined): string {
  return encodeURIComponent((title || "Untitled").replace(/%/g, "-").replace(/#/g, ""));
}
