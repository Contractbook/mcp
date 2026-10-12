import type { ServerContext } from "@modelcontextprotocol/server";
import { z } from "zod";

import type {
  ContractbookClient,
  DocumentContentResponse,
  GetDocumentResponse,
  TemplateDataField,
} from "../contractbook/client.js";
import { errorMessage, formatDataField } from "./shared.js";

// Once the content has arrived, wait at most this long for the document details request.
// The request's own 30s timeout still applies, so the actual wait can be shorter.
export const DOCUMENT_DETAILS_GRACE_MS = 10_000;

export const getDocumentContentConfig = {
  title: "Get Document Content",
  description:
    "Returns the full text content of a document as markdown, plus the OCR text of any attachments. " +
    "Set include_data_fields to also get the document's data fields (id, name, type, value, description, " +
    "required, config, formatting); this costs an extra, heavier API request, so only set it when you need them. " +
    "Values are raw: dates are YYYY-MM-DD, numbers are plain. `formatting` is how Contractbook displays them; use it when showing a value to the user, never when setting one. " +
    "Set include_space to also get the space the document is in, as space: {id, name}; " +
    "space is null when the document isn't in any space you have access to (for example, it's in your personal documents). " +
    "Data fields and space come from the same extra request, so setting both costs no more than setting one. " +
    "If that request fails, the requested data_fields and/or space are null and data_fields_error/space_error say why; " +
    "the text is still returned. " +
    "Use this to read what a document actually says. Pass the document id from list_documents or search_documents.",
  inputSchema: z.object({
    document_id: z.uuid().describe("The document id (UUID)"),
    include_data_fields: z
      .boolean()
      .optional()
      .describe("Also return the document's data fields (default false)"),
    include_space: z
      .boolean()
      .optional()
      .describe("Also return the space the document is in (default false)"),
  }),
  annotations: {
    readOnlyHint: true,
    openWorldHint: true,
  },
};

export interface GetDocumentContentArgs {
  document_id: string;
  include_data_fields?: boolean;
  include_space?: boolean;
}

type DocumentDetailsResult =
  | { ok: true; response: GetDocumentResponse }
  | { ok: false; error: unknown };

export function getDocumentContentHandler(client: ContractbookClient) {
  return async (args: GetDocumentContentArgs, ctx?: ServerContext) => {
    const cancelled = ctx?.mcpReq?.signal;
    const controller = new AbortController();
    const detailsRequest: Promise<DocumentDetailsResult> | undefined =
      args.include_data_fields || args.include_space
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

    if (!detailsRequest) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify(content) }],
      };
    }

    const timer = setTimeout(
      () =>
        controller.abort(
          new DOMException("Timed out waiting for the document details request", "TimeoutError"),
        ),
      DOCUMENT_DETAILS_GRACE_MS,
    );
    let details: DocumentDetailsResult;
    try {
      details = await detailsRequest;
    } finally {
      clearTimeout(timer);
    }
    if (cancelled?.aborted) {
      throw cancelled.reason;
    }
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            ...content,
            ...(args.include_data_fields ? formatDataFields(details) : {}),
            ...(args.include_space ? formatSpace(details) : {}),
          }),
        },
      ],
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

function formatDataFields(result: DocumentDetailsResult) {
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

function formatSpace(result: DocumentDetailsResult) {
  if (!result.ok) {
    return {
      space: null,
      space_error: `Failed to fetch space: ${errorMessage(result.error)}`,
    };
  }
  const workspace = result.response?.document?.workspace;
  if (workspace === null) {
    return { space: null };
  }
  if (typeof workspace !== "object") {
    return {
      space: null,
      space_error: "Space unavailable: unexpected response from the documents API",
    };
  }
  return { space: { id: workspace.id, name: workspace.name } };
}
