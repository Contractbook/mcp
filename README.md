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

## Install in Claude Desktop

1. Download `contractbook-vX.Y.Z.mcpb` from the latest
   [GitHub release](https://github.com/Contractbook/mcp/releases).
2. Double-click the file. Claude Desktop opens an install dialog.
3. Paste your Contractbook API key and click **Install**.

Claude Desktop keeps the key in your operating system's keychain and runs the
extension with Node.js. The extension needs Node.js >= 24, the same as the
rest of this project (see Prerequisites).

On Team and Enterprise plans, admins can roll the same file out to everyone
from Claude Desktop's extension settings.

### Building the extension

```sh
pnpm build:mcpb
```

The script runs the normal `pnpm build`, then copies `dist/index.js` and the
production dependencies into `build/mcpb`. It adds `mcpb/manifest.json`, fills
in `version`, `license`, `keywords`, `repository`, `homepage` and the Node.js
requirement (`engines.node`) from `package.json`, and packs everything into
`build/contractbook.mcpb`. The release workflow uploads the `.mcpb` file to
each GitHub release.

The manifest has no tool list. Claude Desktop asks the server for its tools
after install (`tools_generated`).

## Setup for Claude Desktop via npx

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

| Tool                            | Description                                                                   |
| ------------------------------- | ----------------------------------------------------------------------------- |
| `list_documents`                | Lists documents with filtering, sorting and cursor-based pagination           |
| `search_documents`              | Full-text search across document content and attachments, with match snippets |
| `get_document_content`          | Returns a document's full text as markdown, plus OCR text of attachments      |
| `list_templates`                | Lists the contract templates available to the user                            |
| `get_template`                  | Returns a template's details, including its data fields                       |
| `create_document_from_template` | Creates a draft document from a template, with optional overrides             |

All tools are read-only except `create_document_from_template`, which creates a
draft. Drafts are not sent for signature — the returned url opens the draft in
the web app for review.

## Testing

```sh
pnpm run check
pnpm run lint
pnpm test
```
