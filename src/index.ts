import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";

import { readConfig } from "./config.js";
import { ContractbookClient } from "./contractbook/client.js";
import { createServer } from "./server.js";

const config = readConfig(process.env);
const client = new ContractbookClient({ baseUrl: config.baseUrl, apiKey: config.apiKey });
const server = createServer({ client });

const transport = new StdioServerTransport();
await server.connect(transport);

console.error(`contractbook-mcp ${__VERSION__} ready on stdio`);
