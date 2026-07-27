import { z } from "zod";

import type { ContractbookClient, GetTemplateResponse } from "../contractbook/client.js";

export const getTemplateConfig = {
  title: "Get Template",
  description:
    "Gets a template by ID, including its data fields (id, name, type, current value). " +
    "Use this to discover which data fields a template has before calling create_document_from_template.",
  inputSchema: z.object({
    id: z.uuid().describe("Template ID (UUID), from list_templates"),
  }),
  annotations: {
    readOnlyHint: true,
    openWorldHint: true,
  },
};

export interface GetTemplateArgs {
  id: string;
}

export function getTemplateHandler(client: ContractbookClient) {
  return async (args: GetTemplateArgs) => {
    try {
      const response = await client.getTemplate(args.id);
      return {
        content: [
          { type: "text" as const, text: JSON.stringify(formatTemplateResponse(response)) },
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

function formatTemplateResponse(response: GetTemplateResponse) {
  const template = response.template;
  if (!template) {
    return { template: null };
  }
  return {
    template: {
      id: template.id,
      title: template.title,
      description: template.description,
      language: template.language,
      default_message: template.default_message,
      company_logo_url: template.company_logo_url,
      created_at: template.created_at,
      updated_at: template.updated_at,
      attachments: template.attachments?.map((attachment) => ({
        original: attachment.original,
      })),
      data_fields: template.data_fields?.map((field) => ({
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
      })),
    },
  };
}
