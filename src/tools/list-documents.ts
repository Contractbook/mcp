import { z } from "zod";

import type { ContractbookClient, ListDocumentsResponse } from "../contractbook/client.js";

const documentStates = [
  "draft",
  "rejected",
  "changes_requested",
  "pending",
  "signed",
  "irrelevant",
] as const;

const documentTypes = ["draft", "stored_contract", "contract"] as const;

const documentContexts = ["my_documents", "team_documents", "workspace"] as const;

export const listDocumentsConfig = {
  title: "List Documents",
  description:
    "Lists documents with filtering, sorting and cursor-based pagination. " +
    "Use the title filter to search documents by title (case-insensitive partial match). " +
    "To fetch the next page, pass the cursor returned by the previous call.",
  inputSchema: z.object({
    title: z
      .string()
      .optional()
      .describe("Filter by document title (case-insensitive partial match)"),
    states: z.array(z.enum(documentStates)).optional().describe("Filter by document states"),
    types: z.array(z.enum(documentTypes)).optional().describe("Filter by document types"),
    tags: z.array(z.string()).optional().describe("Filter by tags"),
    context: z
      .array(z.enum(documentContexts))
      .optional()
      .describe(
        "Filter by context: my_documents (directly accessible), team_documents (accessible by team members), workspace (accessible through contract spaces). Defaults to my_documents; pass all three to get every available document",
      ),
    updated_at_gte: z
      .string()
      .optional()
      .describe("Filter by minimum update date-time, inclusive (ISO 8601)"),
    updated_at_lt: z
      .string()
      .optional()
      .describe("Filter by maximum update date-time, non-inclusive (ISO 8601)"),
    signed_at_gte: z
      .string()
      .optional()
      .describe("Filter by minimum signing date-time, inclusive (ISO 8601)"),
    signed_at_lt: z
      .string()
      .optional()
      .describe("Filter by maximum signing date-time, non-inclusive (ISO 8601)"),
    page_size: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .describe("Page size (default 25, max 100)"),
    cursor: z.string().optional().describe("Cursor of the next page, from the previous response"),
    sort_column: z
      .enum(["created_at", "updated_at", "title"])
      .optional()
      .describe("Column to sort by (default created_at)"),
    sort_direction: z.enum(["asc", "desc"]).optional().describe("Sort direction (default desc)"),
  }),
  annotations: {
    readOnlyHint: true,
    openWorldHint: true,
  },
};

export interface ListDocumentsArgs {
  title?: string;
  states?: (typeof documentStates)[number][];
  types?: (typeof documentTypes)[number][];
  tags?: string[];
  context?: (typeof documentContexts)[number][];
  updated_at_gte?: string;
  updated_at_lt?: string;
  signed_at_gte?: string;
  signed_at_lt?: string;
  page_size?: number;
  cursor?: string;
  sort_column?: "created_at" | "updated_at" | "title";
  sort_direction?: "asc" | "desc";
}

export function listDocumentsHandler(client: ContractbookClient) {
  return async (args: ListDocumentsArgs) => {
    try {
      const response = await client.listDocuments(buildParams(args));
      return {
        content: [{ type: "text" as const, text: JSON.stringify(formatListResponse(response)) }],
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

export function buildParams(args: ListDocumentsArgs): Record<string, string | string[]> {
  const params: Record<string, string | string[]> = {};

  if (args.title) {
    params.title = args.title;
  }
  if (args.states?.length) {
    params["states[]"] = args.states;
  }
  if (args.types?.length) {
    params["types[]"] = args.types;
  }
  if (args.tags?.length) {
    params["tags[]"] = args.tags;
  }
  if (args.context?.length) {
    params["context[]"] = args.context;
  }
  if (args.updated_at_gte) {
    params.updated_at_gte = args.updated_at_gte;
  }
  if (args.updated_at_lt) {
    params.updated_at_lt = args.updated_at_lt;
  }
  if (args.signed_at_gte) {
    params.signed_at_gte = args.signed_at_gte;
  }
  if (args.signed_at_lt) {
    params.signed_at_lt = args.signed_at_lt;
  }
  if (args.page_size !== undefined) {
    params.page_size = String(args.page_size);
  }
  if (args.cursor) {
    params.cursor = args.cursor;
  }
  if (args.sort_column) {
    params.sort_column = args.sort_column;
  }
  if (args.sort_direction) {
    params.sort_direction = args.sort_direction;
  }

  return params;
}

function formatListResponse(response: ListDocumentsResponse) {
  return {
    documents: (response.documents ?? []).map((document) => ({
      id: document.id,
      title: document.title,
      state: document.state,
      type: document.type,
      tags: document.tags,
      created_at: document.created_at,
      updated_at: document.updated_at,
      signed_at: document.signed_at,
      owner: document.owner && {
        full_name: document.owner.full_name,
        email: document.owner.email,
      },
      parties: document.parties?.map((party) => ({
        name: party.name,
        reference: party.reference,
        signees: party.signees?.map((signee) => ({
          full_name: signee.full_name,
          email: signee.email,
          signed_at: signee.signed_at,
        })),
      })),
    })),
    cursor: response.pagination_meta?.cursor ?? null,
  };
}
