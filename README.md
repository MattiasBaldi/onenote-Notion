OneNote - Notion Sync

A high-performance Node.js CLI for synchronizing content between Microsoft OneNote and Notion with AI-driven transformation.

## Quick Start

### 1. Setup Environment
Create a .env file in the root:
```bash
ONENOTE_CLIENT_ID="your-id"
NOTION_TOKEN="your-token"
OPENAI_API_KEY="your-key"
CONTEXT7_API_KEY="your-key"
```

### 2. Install & Link
```bash
npm install
npm link
```

### 3. Configure
Edit sync.config.json to set your Notion parent page and target notebooks.

### 4. Authenticate
```bash
o2n auth login
```

### 5. Sync
```bash
o2n sync preview   # See what will be synced
o2n sync apply -y  # Run the AI planner and transfer
```

## CLI Commands

| Command | Description |
| :--- | :--- |
| `o2n auth login` | Sign in to Microsoft OneNote |
| `o2n auth logout` | Clear your local session |
| `o2n list notebooks` | Show all your OneNote notebooks |
| `o2n list sections <id>` | Show sections within a notebook |
| `o2n list pages <id>` | Show pages within a section |
| `o2n sync preview` | Preview pages matching your config |
| `o2n sync plan` | Generate an AI-driven sync plan |
| `o2n sync apply` | Execute the sync |
| `o2n config` | View active configuration |

## Flags

| Flag | Description |
| :--- | :--- |
| `-p, --profile <name>` | Use a specific sync profile (default: work) |
| `-y, --yes` | Skip confirmation prompts |
| `-j, --json` | Output as JSON |
| `-v, --verbose` | Detailed output |
| `-h, --help` | Show help message |

## Usage Examples

```bash
# Authentication
o2n auth login
o2n auth logout

# Browsing
o2n list notebooks
o2n list notebooks --json
o2n list sections <notebook-id>

# Syncing with flags
o2n sync preview
o2n sync plan --profile personal
o2n sync apply -y
o2n sync apply --profile personal -y --verbose
```

## Configuration (sync.config.json)

Define sync profiles to control your data flow:

```json
{
  "sync": {
    "profiles": {
      "work": {
        "source": { "service": "onenote" },
        "destination": { "service": "notion", "parentPageId": "ID" },
        "selection": { "notebookIds": ["ID"] }
      }
    }
  }
}
```

## Architecture

- **services/**: API integrations for OneNote, Notion, and AI Agents.
- **core/**: The synchronization and batch processing engine.
- **lib/**: Internal utilities and configuration loading.
