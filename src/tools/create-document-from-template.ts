import { z } from "zod";

import type {
  ContractbookClient,
  CreateDocumentRequest,
  CreateDocumentResponse,
} from "../contractbook/client.js";
import { dataFieldSchema, signatureVerificationMethods } from "./shared.js";

const signingOrderModes = ["random", "strict", "grouped"] as const;

const toBeSignedByOptions = ["owner_and_others", "others_only", "owner_only"] as const;

const partyTypes = ["personal", "company"] as const;

const signeeSchema = z.object({
  full_name: z.string().optional().describe("Signee's full name"),
  email: z.email().optional().describe("Signee's email address"),
  title: z.string().optional().describe("Signee's title, e.g. Software Engineer"),
  order: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe(
      "Signing order; when signing_order_mode is grouped, this is the signee's group number starting from 0",
    ),
  signature_verification_methods: z
    .array(z.enum(signatureVerificationMethods))
    .optional()
    .describe("Allowed signature types for the signee"),
});

const partySchema = z.object({
  type: z.enum(partyTypes).optional().describe("Party type"),
  name: z.string().optional().describe("Party name"),
  reference: z
    .string()
    .optional()
    .describe("How the party will be referred to in the document, e.g. Sender"),
  address: z.string().optional().describe("Party address"),
  number: z.string().optional().describe("Company's VAT number or CVR"),
  signees: z.array(signeeSchema).optional().describe("Party's signees"),
});

const attachmentSchema = z.object({
  original: z.string().describe("URL of the attachment"),
  filename: z.string().optional().describe("Attachment name shown in the app and the PDF"),
  preview: z
    .array(z.string())
    .optional()
    .describe("If the original is a document, URLs with image previews of each page"),
});

const dynamicTableSchema = z.object({
  attrs: z.object({
    id: z.string().describe("Dynamic table ID"),
    columns: z.array(z.string()).describe("Column names"),
    rows: z.array(z.array(z.string())).describe("Data for the table rows"),
  }),
});

export const createDocumentFromTemplateConfig = {
  title: "Create Document from Template",
  description:
    "Creates a new draft document in Contractbook from a template, optionally overriding the template's " +
    "title, parties, data field values, tags and other settings. " +
    "Call get_template first to see the template's data fields and pass overrides via data_fields. " +
    "With no overrides the document is created with the template's defaults. " +
    "The response includes the draft's url — always share this link with the user immediately " +
    "after the document is created.",
  inputSchema: z.object({
    template_id: z.uuid().describe("ID of the template to create the document from"),
    title: z.string().optional().describe("Document title"),
    language: z.string().optional().describe("Document language code, e.g. en or da"),
    tags: z.array(z.string()).optional().describe("Document tags"),
    parties: z
      .array(partySchema)
      .optional()
      .describe("Parties and signees; overrides the template's parties"),
    data_fields: z
      .array(dataFieldSchema)
      .optional()
      .describe("Data field values; use the ids and names reported by get_template"),
    message: z
      .object({ content: z.string().optional().describe("Message content") })
      .optional()
      .describe("Message shown to recipients"),
    attachments: z.array(attachmentSchema).optional().describe("Document attachments"),
    attachments_signed_separately: z
      .boolean()
      .optional()
      .describe("Whether the attachments should be signed and sealed separately"),
    company_logo_url: z.string().optional().describe("URL of the logo shown in the contract"),
    signing_order_mode: z
      .enum(signingOrderModes)
      .optional()
      .describe(
        "Signing order mode; with grouped, each signee's order field is its group number starting from 0",
      ),
    to_be_signed_by: z
      .enum(toBeSignedByOptions)
      .optional()
      .describe("Who should sign the document"),
    dynamic_tables: z
      .array(dynamicTableSchema)
      .optional()
      .describe("Data for the dynamic table placeholders placed inside the template"),
  }),
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
};

export type CreateDocumentFromTemplateArgs = z.infer<
  typeof createDocumentFromTemplateConfig.inputSchema
>;

export function createDocumentFromTemplateHandler(client: ContractbookClient, appUrl: string) {
  return async (args: CreateDocumentFromTemplateArgs) => {
    try {
      const response = await client.createDocumentFromTemplate(args.template_id, buildBody(args));
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(formatCreatedDocumentResponse(response, appUrl)),
          },
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          { type: "text" as const, text: error instanceof Error ? error.message : String(error) },
        ],
      };
    }
  };
}

export function buildBody(args: CreateDocumentFromTemplateArgs): CreateDocumentRequest {
  const document: CreateDocumentRequest["document"] = {};

  if (args.title !== undefined) {
    document.title = args.title;
  }
  if (args.language !== undefined) {
    document.language = args.language;
  }
  if (args.tags !== undefined) {
    document.tags = args.tags;
  }
  if (args.parties !== undefined) {
    document.parties = args.parties;
  }
  if (args.data_fields !== undefined) {
    document.data_fields = args.data_fields;
  }
  if (args.message !== undefined) {
    document.message = args.message;
  }
  if (args.attachments !== undefined) {
    document.attachments = args.attachments;
  }
  if (args.attachments_signed_separately !== undefined) {
    document.attachments_signed_separately = args.attachments_signed_separately;
  }
  if (args.company_logo_url !== undefined) {
    document.company_logo_url = args.company_logo_url;
  }
  if (args.signing_order_mode !== undefined) {
    document.signing_order_mode = args.signing_order_mode;
  }
  if (args.to_be_signed_by !== undefined) {
    document.to_be_signed_by = args.to_be_signed_by;
  }
  if (args.dynamic_tables !== undefined) {
    document.dynamic_tables = args.dynamic_tables;
  }

  return { document };
}

// The app's draft route is /draft/{encoded-title}/{id}; /documents/{id} redirects to the contract list.
function draftUrl(appUrl: string, title: string | undefined, id: string): string {
  return `${appUrl}/draft/${encodeURIComponent(title ?? "Untitled")}/${id}`;
}

function formatCreatedDocumentResponse(response: CreateDocumentResponse, appUrl: string) {
  const document = response.document;
  if (!document) {
    return { document: null };
  }
  return {
    document: {
      id: document.id,
      url: document.id ? draftUrl(appUrl, document.title, document.id) : undefined,
      title: document.title,
      state: document.state,
      type: document.type,
      language: document.language,
      tags: document.tags,
      created_at: document.created_at,
      signing_order_mode: document.signing_order_mode,
      to_be_signed_by: document.to_be_signed_by,
      source_template_id: document.source_template_id,
      parties: document.parties?.map((party) => ({
        type: party.type,
        name: party.name,
        reference: party.reference,
        signees: party.signees?.map((signee) => ({
          full_name: signee.full_name,
          email: signee.email,
          order: signee.order,
        })),
      })),
      data_fields: document.data_fields?.map((field) => ({
        id: field.id,
        name: field.name,
        type: field.type,
        value: field.value,
      })),
    },
  };
}
