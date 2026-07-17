import { McpServer } from "@modelcontextprotocol/server";

import type { ContractbookClient } from "./contractbook/client.js";
import { listDocumentsConfig, listDocumentsHandler } from "./tools/list-documents.js";
import { searchDocumentsConfig, searchDocumentsHandler } from "./tools/search-documents.js";

export interface ServerDependencies {
  client: ContractbookClient;
}

export function createServer({ client }: ServerDependencies): McpServer {
  const server = new McpServer({
    name: "contractbook-mcp",
    version: __VERSION__,
  });

  server.registerTool("list_documents", listDocumentsConfig, listDocumentsHandler(client));
  server.registerTool("search_documents", searchDocumentsConfig, searchDocumentsHandler(client));

  return server;
}
