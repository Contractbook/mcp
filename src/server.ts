import { McpServer } from "@modelcontextprotocol/server";

import type { ContractbookClient } from "./contractbook/client.js";
import {
  createDocumentFromTemplateConfig,
  createDocumentFromTemplateHandler,
} from "./tools/create-document-from-template.js";
import {
  getDocumentContentConfig,
  getDocumentContentHandler,
} from "./tools/get-document-content.js";
import { getTemplateConfig, getTemplateHandler } from "./tools/get-template.js";
import { listDocumentsConfig, listDocumentsHandler } from "./tools/list-documents.js";
import { listTemplatesConfig, listTemplatesHandler } from "./tools/list-templates.js";
import { searchDocumentsConfig, searchDocumentsHandler } from "./tools/search-documents.js";

export interface ServerDependencies {
  client: ContractbookClient;
  appUrl: string;
}

export function createServer({ client, appUrl }: ServerDependencies): McpServer {
  const server = new McpServer({
    name: "contractbook-mcp",
    version: __VERSION__,
  });

  server.registerTool("list_documents", listDocumentsConfig, listDocumentsHandler(client));
  server.registerTool("search_documents", searchDocumentsConfig, searchDocumentsHandler(client));
  server.registerTool(
    "get_document_content",
    getDocumentContentConfig,
    getDocumentContentHandler(client),
  );
  server.registerTool("list_templates", listTemplatesConfig, listTemplatesHandler(client));
  server.registerTool("get_template", getTemplateConfig, getTemplateHandler(client));
  server.registerTool(
    "create_document_from_template",
    createDocumentFromTemplateConfig,
    createDocumentFromTemplateHandler(client, appUrl),
  );

  return server;
}
