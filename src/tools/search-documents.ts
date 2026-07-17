import { z } from "zod";

import type { ContractbookClient, SearchDocumentsResponse } from "../contractbook/client.js";

export const searchDocumentsConfig = {
  title: "Search Documents",
  description:
    "Full-text search across documents, including their content and attachments (not just titles). " +
    "Returns documents ranked by relevance, with matching text snippets. " +
    "Matched terms in snippets are wrapped in <@|...|@> markers. " +
    "Use this for finding documents by what they say; use list_documents for structured filtering. " +
    "To fetch the next page, pass the cursor returned by the previous call.",
  inputSchema: z.object({
    term: z.string().min(3).max(500).describe("Search query (3-500 characters)"),
    page_size: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .describe("Page size (default 50, max 100)"),
    cursor: z.string().optional().describe("Cursor of the next page, from the previous response"),
    sort_column: z
      .enum(["created_at", "title", "search_ranking_value"])
      .optional()
      .describe(
        "Column to sort by (default created_at). Use search_ranking_value to sort by relevance",
      ),
    sort_direction: z.enum(["asc", "desc"]).optional().describe("Sort direction (default desc)"),
  }),
  annotations: {
    readOnlyHint: true,
    openWorldHint: true,
  },
};

export interface SearchDocumentsArgs {
  term: string;
  page_size?: number;
  cursor?: string;
  sort_column?: "created_at" | "title" | "search_ranking_value";
  sort_direction?: "asc" | "desc";
}

export function searchDocumentsHandler(client: ContractbookClient) {
  return async (args: SearchDocumentsArgs) => {
    try {
      const response = await client.searchDocuments(buildParams(args));
      return {
        content: [{ type: "text" as const, text: JSON.stringify(formatSearchResponse(response)) }],
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

export function buildParams(args: SearchDocumentsArgs): Record<string, string | string[]> {
  const params: Record<string, string | string[]> = { term: args.term };

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

function formatSearchResponse(response: SearchDocumentsResponse) {
  return {
    documents: (response.documents ?? []).map((document) => ({
      id: document.id,
      title: document.title,
      state: document.state,
      type: document.type,
      created_at: document.created_at,
      updated_at: document.updated_at,
      owner: document.owner && {
        full_name: document.owner.full_name,
        email: document.owner.email,
      },
      parties: document.parties?.map((party) => ({
        full_name: party.full_name,
        email: party.email,
        signed_at: party.signed_at,
      })),
      snippets: document.search_snippets?.snippets ?? [],
      matched_attachments: document.search_matched_attachments ?? [],
    })),
    cursor: response.pagination_meta?.cursor ?? null,
  };
}
