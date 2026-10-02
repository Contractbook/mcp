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

Prompts for your Contractbook API key and adds the server to your Claude
Desktop config. Restart Claude Desktop afterwards to pick up the change.

The config file must already exist — the command edits it, but will not create
it.

## Running

The server is launched by an MCP client, not run standalone. Environment variables:

| Variable               | Required | Default                        |
| ---------------------- | -------- | ------------------------------ |
| `CONTRACTBOOK_API_KEY` | yes      | —                              |
| `CONTRACTBOOK_APP_URL` | no       | `https://app.contractbook.com` |

`CONTRACTBOOK_APP_URL` is the web-app host used to build document links returned
by the tools.

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

| Tool                            | Description                                                                                        |
| ------------------------------- | -------------------------------------------------------------------------------------------------- |
| `list_documents`                | Lists documents with filtering, sorting and cursor-based pagination                                |
| `search_documents`              | Full-text search across document content and attachments, with match snippets                      |
| `get_document_content`          | Returns a document's full text as markdown and OCR text of attachments; optionally its data fields |
| `list_templates`                | Lists the contract templates available to the user                                                 |
| `get_template`                  | Returns a template's details, including its data fields                                            |
| `create_document_from_template` | Creates a draft document from a template, with optional overrides                                  |

All tools are read-only except `create_document_from_template`, which creates a
draft. Drafts are not sent for signature — the returned url opens the draft in
the web app for review.

## Testing

```sh
pnpm run check
pnpm run lint
pnpm test
```
