import { z } from "zod";

import type { ContractbookClient, DocumentContentResponse } from "../contractbook/client.js";

export const getDocumentContentConfig = {
  title: "Get Document Content",
  description:
    "Returns the full text content of a document as markdown, plus the OCR text of any attachments. " +
    "Use this to read what a document actually says. Pass the document id from list_documents or search_documents.",
  inputSchema: z.object({
    document_id: z.uuid().describe("The document id (UUID)"),
  }),
  annotations: {
    readOnlyHint: true,
    openWorldHint: true,
  },
};

export interface GetDocumentContentArgs {
  document_id: string;
}

export function getDocumentContentHandler(client: ContractbookClient) {
  return async (args: GetDocumentContentArgs) => {
    try {
      const response = await client.getDocumentContent(args.document_id);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(formatContent(response)) }],
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

export function stripLineNumbers(markdown: string): string {
  return markdown
    .split("\n")
    .map((line) => line.replace(/^line #\d+:\s?/, ""))
    .join("\n");
}

function formatContent(response: DocumentContentResponse) {
  const document = response.document;
  return {
    markdown: stripLineNumbers(document?.markdown ?? ""),
    attachments: (document?.uploaded_files ?? []).map((file) => ({
      id: file.id,
      ocr_status: file.ocr_status,
      text: file.text_markup ?? null,
    })),
  };
}
