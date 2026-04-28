# OneNote to Notion Sync

A high-performance Node.js CLI for synchronizing content from Microsoft OneNote to Notion with AI-driven transformation and intelligent batching.

## Quick Start

### 1. Environment Setup
Create a .env file in the root:
```bash
ONENOTE_CLIENT_ID="your-client-id"
NOTION_TOKEN="your-notion-token"
OPENAI_API_KEY="your-openai-key"
CONTEXT7_API_KEY="your-context7-key"
```

### 2. Install & Link
```bash
npm install
npm link
```

### 3. Configure
Edit `sync.config.json`:
```json
{
  "sync": {
    "profiles": {
      "work": {
        "source": { "service": "onenote" },
        "destination": { "service": "notion", "parentPageId": "page-id" },
        "selection": { "notebookIds": ["notebook-id"] }
      }
    }
  }
}
```

### 4. Authenticate
```bash
o2n auth login
```

### 5. Sync
```bash
o2n sync preview    # See what will be synced
o2n sync apply -y   # Execute sync
```

## Commands

| Command | Purpose |
|---------|---------|
| `o2n auth login` | Sign in to Microsoft OneNote |
| `o2n auth logout` | Clear session |
| `o2n list notebooks` | List all notebooks |
| `o2n list sections <id>` | List sections in notebook |
| `o2n list pages <id>` | List pages in section |
| `o2n sync preview` | Preview pages to sync |
| `o2n sync plan` | Generate transformation plan |
| `o2n sync apply` | Execute sync |
| `o2n config` | Show active configuration |

## Flags

| Flag | Description |
|------|-------------|
| `-p, --profile <name>` | Sync profile (default: work) |
| `-y, --yes` | Skip confirmation |
| `-j, --json` | JSON output |
| `-v, --verbose` | Detailed logging |
| `-h, --help` | Show help |

## Examples

```bash
# List notebooks as JSON
o2n list notebooks --json

# Sync with specific profile
o2n sync preview --profile personal
o2n sync apply -y --profile personal

# Sync with verbose output
o2n sync apply --verbose
```

## Architecture

The project uses a layered, modular design:

- **services/**: Integrations for OneNote, Notion, and AI agents
- **core/**: Sync engine with plan-apply workflow and batch processing
- **lib/**: Configuration loading and utilities

The sync process works in three stages:

1. **Preview**: Identify pages matching your configuration
2. **Plan**: Generate AI-driven transformation schemas
3. **Apply**: Transfer pages with batched LLM processing (multiple items per call)

## How It Works

OneNote pages are fetched through Microsoft Graph API. Content is extracted as Markdown and passed to LangChain with OpenAI. The AI generates Notion-compliant schemas using live documentation from Context7. Pages are created in Notion with intelligent batching to optimize token usage.

## Requirements

- Node.js 20+
- Microsoft OneNote account with Graph API access
- Notion workspace with integration token
- OpenAI API key
- Context7 API key (for live documentation)

## Troubleshooting

If `o2n` command not found after `npm link`, check:
- Node modules are in PATH: `which o2n`
- npm global bin directory: `npm config get prefix`
- Manually run: `node /path/to/cli.js --help`
