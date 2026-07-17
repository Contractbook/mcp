import { McpServer } from "@modelcontextprotocol/server";

import type { ContractbookClient } from "./contractbook/client.js";
import { listDocumentsConfig, listDocumentsHandler } from "./tools/list-documents.js";

export interface ServerDependencies {
  client: ContractbookClient;
}

export function createServer({ client }: ServerDependencies): McpServer {
  const server = new McpServer({
    name: "contractbook-mcp",
    version: __VERSION__,
  });

  server.registerTool("list_documents", listDocumentsConfig, listDocumentsHandler(client));

  return server;
}
