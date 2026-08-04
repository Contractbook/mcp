# @contractbook/mcp

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

## Setup for Claude Desktop

```sh
npx @contractbook/mcp setup
```

Prompts for your Contractbook API key and adds the server to your existing
Claude Desktop config, then restart Claude Desktop. Requires an existing config
file.

## Running

The server is launched by an MCP client, not run standalone. Environment variables:

| Variable                | Required | Default                        |
| ----------------------- | -------- | ------------------------------ |
| `CONTRACTBOOK_API_KEY`  | yes      | —                              |
| `CONTRACTBOOK_BASE_URL` | no       | `https://api.contractbook.com` |

`CONTRACTBOOK_BASE_URL` is the API host root (no version prefix). Point it at
`https://api-staging.contractbook.com` to use staging.

The `setup` command writes this entry:

```json
{
  "mcpServers": {
    "contractbook": {
      "command": "npx",
      "args": ["-y", "@contractbook/mcp@<version>"],
      "env": { "CONTRACTBOOK_API_KEY": "<your-api-key>" }
    }
  }
}
```

## Available MCP Tools

| Tool               | Description                                                                   |
| ------------------ | ----------------------------------------------------------------------------- |
| `list_documents`       | Lists documents with filtering, sorting and cursor-based pagination           |
| `search_documents`     | Full-text search across document content and attachments, with match snippets |
| `get_document_content` | Returns a document's full text as markdown, plus OCR text of attachments      |

## Testing

```sh
pnpm run check
pnpm run lint
pnpm test
```
