# contractbook-mcp

Model Context Protocol server for the [Contractbook API](https://api.contractbook.com/v3/docs/index.html). Runs locally over the STDIO transport — the MCP client spawns the process and talks JSON-RPC over stdin/stdout.

## Prerequisites

- Node.js >= 24
- pnpm (`corepack enable`)
- A Contractbook API key

## Setup

```sh
pnpm install
pnpm run build
```

## Running

The server is launched by an MCP client, not run standalone. Environment variables:

| Variable                | Required | Default                        |
| ----------------------- | -------- | ------------------------------ |
| `CONTRACTBOOK_API_KEY`  | yes      | —                              |

MCP client configuration:

```json
{
  "mcpServers": {
    "contractbook": {
      "command": "node",
      "args": ["/absolute/path/to/contractbook-mcp/dist/index.js"],
      "env": { "CONTRACTBOOK_API_KEY": "<your-api-key>" }
    }
  }
}
```

## Available MCP Tools

| Tool               | Description                                                                   |
| ------------------ | ----------------------------------------------------------------------------- |
| `list_documents`   | Lists documents with filtering, sorting and cursor-based pagination           |
| `search_documents` | Full-text search across document content and attachments, with match snippets |

## Testing

```sh
pnpm run check
pnpm run lint
pnpm test
```
