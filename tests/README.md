# Testing Guide

## Architecture Overview

The o2n project has **three main API layers**:

### 1. OneNote API Layer (`src/services/onenote/`)
- Uses **Microsoft Graph API** to read OneNote notebooks, sections, and pages
- Authentication via delegated OAuth flow
- Exports pages as Markdown through the Graph API
- **Required environment variable**: `ONENOTE_CLIENT_ID`

### 2. Notion API Layer (`src/services/notion/`)
- Wraps the official **Notion JavaScript SDK** (`@notionhq/client`)
- Creates, updates, and reads Notion pages
- Supports page creation with rich text and block content
- **Required environment variable**: `NOTION_TOKEN`

### 3. Agent Layer (LangChain + Context7)
- **LangChain Agent**: Orchestrates the sync workflow using OpenAI LLM
- **Context7 Integration**: Fetches live API documentation from Notion and Microsoft Graph docs
- Generates transformation schemas from OneNote to Notion format
- Uses batched LLM calls to optimize token usage
- **Required environment variables**: `AGENT_API_KEY`, `CONTEXT7_API_KEY`

### 4. Core Sync Engine (`src/core/`)
- Three-stage workflow: **Preview** → **Plan** → **Apply**
- Loads source items from OneNote
- Uses the agent to generate transformation plans
- Applies plans with batched page creation in Notion

## Running Tests

### Setup

1. Create `.env` with all required API keys:
```bash
NOTION_TOKEN=your-notion-integration-token
ONENOTE_CLIENT_ID=your-azure-app-id
AGENT_API_KEY=your-openai-key
CONTEXT7_API_KEY=your-context7-key
```

2. Install dependencies:
```bash
npm install
npm link
```

### Run Integration Tests

```bash
# Test all layers
node tests/api-integration.test.js

# Or with the shell script
bash tests/test-apis.sh
```

## Test Coverage

The `api-integration.test.js` validates:

**Notion API**
- Client initialization with auth token
- Token validation

**OneNote API**
- Client ID configuration
- Graph API exports available

**Agent/LangChain**
- LangChain agent tool definitions
- Context7 API key presence
- OpenAI API key presence
- Schema validation

**Core Engine**
- Sync engine function exports (loadSourceItemsOnly, buildSyncPlan, applySyncPlan)
- Config loading

**CLI**
- Entry point exists
- npm bin configuration

## What Each API Does

### OneNote (Graph API)
```bash
o2n list notebooks           # Fetches notebooks
o2n list sections <id>       # Lists sections in notebook
o2n list pages <id>          # Lists pages in section
```

### Notion (SDK)
Creates pages with structure:
```
Notion Page
├── Title (property)
├── Blocks
│   ├── Paragraph
│   ├── Heading
│   └── Bulleted List
└── Database entries (optional)
```

### Agent (LangChain + Context7)
Workflow:
1. Fetch OneNote page content as Markdown
2. Query Context7 for current Notion and Graph API docs
3. Use OpenAI to generate Notion-compatible schema
4. Apply schema to create page in Notion

## Troubleshooting

**Test fails on token validation:**
- Ensure `.env` file exists and variables are set
- Check token lengths are reasonable (usually 20+ characters)

**Context7 test fails:**
- Verify `CONTEXT7_API_KEY` is set
- Get free key at https://context7.com

**OneNote test fails:**
- Register app in Azure AD
- Set `ONENOTE_CLIENT_ID` from Azure app registration

**Notion test fails:**
- Create Notion integration
- Copy integration token to `NOTION_TOKEN`

**CLI test fails:**
- Run `npm link` to register the `o2n` command
- Check: `which o2n`

## Next Steps

After tests pass:

```bash
# Authenticate with OneNote
o2n auth login

# Preview what will sync
o2n sync preview

# Review the transformation plan
o2n sync plan

# Execute sync
o2n sync apply -y
```
