import { z } from "zod";

import type {
  ContractbookClient,
  DocumentContentResponse,
  GetDocumentResponse,
  TemplateDataField,
} from "../contractbook/client.js";
import { errorMessage, formatDataField } from "./shared.js";

// Once the content has arrived, wait at most this long for the heavier data fields request.
export const DATA_FIELDS_GRACE_MS = 10_000;

export const getDocumentContentConfig = {
  title: "Get Document Content",
  description:
    "Returns the full text content of a document as markdown, plus the OCR text of any attachments. " +
    "Set include_data_fields to also get the document's data fields (id, name, type, value, description, " +
    "required, config, and formatting: number display settings with a thousands separator `grouping` and " +
    "`fractional`); this costs an extra, heavier API request, so only set it when you need them. " +
    "If the data fields can't be fetched, data_fields is null and data_fields_error says why; " +
    "the text is still returned. " +
    "Use this to read what a document actually says. Pass the document id from list_documents or search_documents.",
  inputSchema: z.object({
    document_id: z.uuid().describe("The document id (UUID)"),
    include_data_fields: z
      .boolean()
      .optional()
      .describe("Also return the document's data fields (default false)"),
  }),
  annotations: {
    readOnlyHint: true,
    openWorldHint: true,
  },
};

export interface GetDocumentContentArgs {
  document_id: string;
  include_data_fields?: boolean;
}

// The part of the MCP SDK's ServerContext this tool uses.
export interface ToolContext {
  mcpReq?: { signal?: AbortSignal };
}

type DataFieldsResult = { ok: true; response: GetDocumentResponse } | { ok: false; error: unknown };

export function getDocumentContentHandler(client: ContractbookClient) {
  return async (args: GetDocumentContentArgs, ctx?: ToolContext) => {
    const cancelled = ctx?.mcpReq?.signal;
    const controller = new AbortController();
    const dataFieldsRequest: Promise<DataFieldsResult> | undefined = args.include_data_fields
      ? client
          .getDocument(
            args.document_id,
            cancelled ? AbortSignal.any([cancelled, controller.signal]) : controller.signal,
          )
          .then(
            (response) => ({ ok: true, response }),
            (error: unknown) => ({ ok: false, error }),
          )
      : undefined;

    let content: ReturnType<typeof formatContent>;
    try {
      content = formatContent(await client.getDocumentContent(args.document_id, cancelled));
    } catch (error) {
      controller.abort();
      return {
        isError: true,
        content: [
          {
            type: "text" as const,
            text: `Failed to fetch document content: ${errorMessage(error)}`,
          },
        ],
      };
    }

    const result: Record<string, unknown> = content;
    if (dataFieldsRequest) {
      const timer = setTimeout(
        () =>
          controller.abort(
            new DOMException("Timed out waiting for the data fields request", "TimeoutError"),
          ),
        DATA_FIELDS_GRACE_MS,
      );
      try {
        Object.assign(result, formatDataFields(await dataFieldsRequest));
      } finally {
        clearTimeout(timer);
      }
    }
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result) }],
    };
  };
}

export function stripLineNumbers(markdown: string): string {
  return markdown
    .split("\n")
    .map((line) => line.replace(/^line #\d+:\s?/, ""))
    .join("\n");
}

function formatContent(markdownResponse: DocumentContentResponse) {
  const content = markdownResponse?.document;
  // A proxy or login page answering with 200 must not look like an empty document.
  if (typeof content !== "object" || content === null) {
    throw new Error("unexpected response from the markdown API");
  }
  return {
    markdown: stripLineNumbers(typeof content.markdown === "string" ? content.markdown : ""),
    attachments: (content.uploaded_files ?? []).map((file) => ({
      id: file.id,
      ocr_status: file.ocr_status,
      text: file.text_markup ?? null,
    })),
  };
}

function formatDataFields(result: DataFieldsResult) {
  if (!result.ok) {
    return {
      data_fields: null,
      data_fields_error: `Failed to fetch data fields: ${errorMessage(result.error)}`,
    };
  }
  const dataFields: unknown = result.response?.document?.data_fields;
  if (!Array.isArray(dataFields)) {
    return {
      data_fields: null,
      data_fields_error: "Data fields unavailable: unexpected response from the documents API",
    };
  }
  return {
    data_fields: dataFields
      .filter((field): field is TemplateDataField => typeof field === "object" && field !== null)
      .map(formatDataField),
  };
}
