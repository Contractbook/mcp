import { z } from "zod";

import type { ContractbookClient, ListTemplatesResponse } from "../contractbook/client.js";
import { errorMessage } from "./shared.js";

export const listTemplatesConfig = {
  title: "List Templates",
  description:
    "Lists contract templates available to the user. " +
    "Use get_template to inspect a template's data fields, then create_document_from_template to create a draft from it.",
  inputSchema: z.object({
    exclude_spaces: z
      .boolean()
      .optional()
      .describe("Exclude templates from contract spaces (default false)"),
  }),
  annotations: {
    readOnlyHint: true,
    openWorldHint: true,
  },
};

export interface ListTemplatesArgs {
  exclude_spaces?: boolean;
}

export function listTemplatesHandler(client: ContractbookClient) {
  return async (args: ListTemplatesArgs) => {
    try {
      const params: Record<string, string | string[]> = {};
      if (args.exclude_spaces !== undefined) {
        params.exclude_spaces = String(args.exclude_spaces);
      }
      const response = await client.listTemplates(params);
      return {
        content: [
          { type: "text" as const, text: JSON.stringify(formatListTemplatesResponse(response)) },
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [{ type: "text" as const, text: errorMessage(error) }],
      };
    }
  };
}

function formatListTemplatesResponse(response: ListTemplatesResponse) {
  return {
    templates: (response.templates ?? []).map((template) => ({
      id: template.id,
      title: template.title,
      description: template.description,
      language: template.language,
      location: template.location && {
        name: template.location.name,
        type: template.location.type,
      },
      created_at: template.created_at,
      updated_at: template.updated_at,
    })),
  };
}
