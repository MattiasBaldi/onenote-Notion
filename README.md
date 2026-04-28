# o2n: OneNote to Notion Sync

Transfer your Microsoft OneNote notebooks to Notion with AI-powered transformation. o2n converts OneNote pages to Notion-compatible schemas automatically, with intelligent batching and full preview/review workflow.

## Quick Setup

```bash
npm install && npm link

# Set environment variables
export ONENOTE_CLIENT_ID=your-app-id
export NOTION_TOKEN=your-token
export AGENT_API_KEY=your-key
export CONTEXT7_API_KEY=your-key

# Create sync config
cp sync.config.json.example sync.config.json
# Edit with your Notion page ID and OneNote notebook IDs

# Authenticate
o2n auth login

# Sync
o2n sync preview    # See what matches your config
o2n sync apply -y   # Run sync
```

## What It Does

1. **Preview**: Scans OneNote notebooks and matches against your configuration
2. **Plan**: Uses AI to generate Notion schemas from OneNote content
3. **Apply**: Batches pages through LLM and creates them in Notion

The process ensures nothing is lost—you review the plan before applying.

## Commands

| Command | Purpose |
|---------|---------|
| `o2n auth login` | Sign in to OneNote |
| `o2n list notebooks` | Browse your OneNote structure |
| `o2n sync preview` | See pages that will sync |
| `o2n sync plan` | Review transformation plan |
| `o2n sync apply` | Execute sync |
| `o2n config` | Show settings |

## Flags

| Flag | Effect |
|------|--------|
| `-p, --profile` | Use different config profile |
| `-y, --yes` | Skip confirmation prompts |
| `-j, --json` | JSON output |
| `-v, --verbose` | Detailed logging |
| `-h, --help` | Show help |

## Configuration

Create `sync.config.json`:

```json
{
  "sync": {
    "profiles": {
      "work": {
        "source": { "service": "onenote" },
        "destination": { 
          "service": "notion", 
          "parentPageId": "your-notion-page-uuid" 
        },
        "selection": { 
          "notebookIds": ["notebook-id"] 
        }
      }
    }
  }
}
```

## Examples

```bash
# List what you have
o2n list notebooks
o2n list sections notebook-id

# Try a dry-run sync
o2n sync preview
o2n sync plan

# Sync everything
o2n sync apply -y

# Different profile
o2n sync preview --profile personal
o2n sync apply -y --profile personal

# JSON output for scripting
o2n list notebooks --json
```

## Using Local LLMs

Instead of paying for OpenAI, you can use a local LLM like **LM Studio**, **Ollama**, or any OpenAI-compatible endpoint.

### With LM Studio

1. Start LM Studio with a model loaded
2. Set environment variables:
```bash
export LLM_BASE_URL=http://localhost:1234/v1
export AGENT_MODEL=local-model
# Leave AGENT_API_KEY empty or set to anything
```

3. Run sync normally:
```bash
o2n sync preview
o2n sync apply -y
```

That's it. LangChain will use your local LLM instead of OpenAI.

### With Ollama

```bash
export LLM_BASE_URL=http://localhost:11434/v1
export AGENT_MODEL=mistral  # or any model you've pulled
o2n sync apply -y
```

## Requirements

- Node.js 20+
- OneNote account with Graph API credentials
- Notion workspace with integration token
- Context7 API key (for live docs)
- LLM: OpenAI API key, or local LM (LM Studio, Ollama, etc.)

## How It Works

OneNote pages are fetched via Microsoft Graph API and converted to Markdown. Content is sent to an LLM (OpenAI, Claude, local, etc.) with live API schemas from Context7. Notion-compliant pages are created with batched processing to optimize tokens.

## Architecture

```
src/services/    OneNote, Notion, and AI integrations
src/core/        Sync engine (preview, plan, apply)
src/lib/         Config loading and utilities
```

## Get Help

```bash
o2n --help              # All commands
o2n sync --help         # Sync options
which o2n               # Verify installation
npm list -g             # Check global packages
```

No complex setup. Configure, authenticate, sync.
