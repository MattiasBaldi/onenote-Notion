# OneNote to Notion Sync (o2n)

Automatically sync your Microsoft OneNote notebooks to Notion with AI-powered transformation. o2n intelligently converts OneNote content to Notion-compatible format using OpenAI and live API documentation.

## Features

- **Intelligent Sync**: Preview, plan, and apply syncs with full control
- **AI-Powered**: Converts OneNote formatting to Notion schemas automatically
- **Batch Processing**: Optimizes token usage with intelligent batching
- **Multi-Profile**: Support multiple sync configurations (work, personal, etc.)
- **Live Documentation**: Uses Context7 to generate schemas based on current API specs

## Before You Start

You'll need:
- Node.js 20 or higher
- Microsoft OneNote account with Graph API app registered
- Notion workspace with integration token
- OpenAI API key
- Context7 API key

## Installation

1. Clone and install:
```bash
npm install
npm link
```

2. Create `.env` in the project root:
```bash
ONENOTE_CLIENT_ID="your-app-id"
NOTION_TOKEN="your-integration-token"
OPENAI_API_KEY="your-key"
CONTEXT7_API_KEY="your-key"
```

3. Configure sync profile in `sync.config.json`:
```json
{
  "sync": {
    "profiles": {
      "work": {
        "source": { "service": "onenote" },
        "destination": { "service": "notion", "parentPageId": "page-uuid" },
        "selection": { "notebookIds": ["notebook-id"] }
      }
    }
  }
}
```

4. Log in:
```bash
o2n auth login
```

5. Run sync:
```bash
o2n sync preview          # See what will be synced
o2n sync plan             # Review transformation plan
o2n sync apply -y         # Execute sync
```

## How the Sync Works

Three stages for control and quality:

1. **Preview**: Identifies matching pages
2. **Plan**: Generates Notion schemas via AI
3. **Apply**: Batches through LLM and creates pages

## Core Commands

| Command | What It Does |
|---------|--------------|
| `o2n auth login/logout` | Manage OneNote authentication |
| `o2n list notebooks` | Browse OneNote structure |
| `o2n list sections <id>` | View sections in a notebook |
| `o2n list pages <id>` | View pages in a section |
| `o2n sync preview` | See matching pages |
| `o2n sync plan` | Review transformation plan |
| `o2n sync apply` | Run the sync |
| `o2n config` | Show active settings |

## Useful Flags

| Flag | Effect |
|------|--------|
| `-p, --profile <name>` | Use different sync config (default: work) |
| `-y, --yes` | Skip prompts (auto-confirm) |
| `-j, --json` | Output as JSON |
| `-v, --verbose` | Detailed logging |

## Examples

```bash
# Explore your OneNote
o2n list notebooks
o2n list sections notebook-id

# Sync specific profile
o2n sync preview --profile personal
o2n sync apply -y --profile personal

# JSON output
o2n list notebooks --json

# Debug with verbose output
o2n sync plan --verbose
```

## Project Structure

```
src/
  services/      OneNote, Notion, and AI integrations
  core/          Sync engine with plan-apply workflow
  lib/           Config loading and utilities
```

## Troubleshooting

Command not found after npm link?
```bash
which o2n                    # Check if installed
npm config get prefix        # Verify npm paths
node /path/to/cli.js --help  # Run directly
```

For other issues, check your .env file and API credentials are valid.

## License

MIT
