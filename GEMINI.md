# OneNote - Notion Sync (Gemini Context)

This project is a high-performance Node.js CLI tool designed to synchronize content between Microsoft OneNote and Notion. It leverages AI-driven planning to map OneNote's XHTML structure to Notion's block-based or Markdown-based content.

## Project Overview

- Purpose: Autonomous and guided synchronization of notes from OneNote to Notion.
- Architecture: Modular service-oriented design:
    - `src/services/onenote/`: Handles Microsoft Graph API integration, delegated authentication, and content extraction.
    - `src/services/notion/`: Wraps the Notion SDK for page creation, updates, and Markdown retrieval.
    - `src/services/agent/`: Dynamically identifies formatting constraints for both source and destination services using Context7 live docs.
    - `src/core/`: High-performance orchestration engine that implements a "Plan - Apply" workflow with batched AI processing (multiple items per LLM call) for token efficiency.
    - `src/lib/`: Internal utility library for configuration loading and system plumbing.
- **Key Technologies**:
    - **Node.js (ESM)**: Modern JavaScript module system.
    - **LangChain & LLM**: For intelligent sync planning and schema-valid translations (supports OpenAI, Claude, etc.).
    - **Context7**: Real-time retrieval of developer documentation to stay current with API constraints.
    - **Zod**: Runtime schema validation for configuration and sync plans.

## Getting Started

### Prerequisites

- Node.js (Latest LTS recommended)
- Microsoft Azure App Registration (for OneNote Graph API access)
- Notion Integration Token
- LLM API Key (for the agent: OpenAI, Claude, etc.)
- Context7 API Key (for documentation lookup)

### Installation

```bash
npm install
```

### Environment Variables

The CLI loads a `.env` file from the root. Key variables:

- `ONENOTE_CLIENT_ID`: Azure App Client ID.
- `NOTION_TOKEN` / `NOTION_API_KEY`: Notion integration secret.
- `AGENT_API_KEY`: Required for the planner agent (can use OpenAI, Claude, or other LLM providers).
- `CONTEXT7_API_KEY`: Required for live docs lookup.
- `ONENOTE_ACCESS_TOKEN` (Optional): Manual override for Graph API.

## Core Workflows

The CLI uses action-based commands for simplicity.

### 1. Authentication
```bash
npm run cli -- auth login
npm run cli -- auth logout
```

### 2. Browsing
```bash
npm run cli -- list notebooks
npm run cli -- list sections <notebookId>
npm run cli -- list pages <sectionId>
```

### 3. Synchronization
The sync process is divided into **Preview**, **Plan**, and **Apply**.

- **Preview**: See what items would be picked up by the current config.
  ```bash
  npm run cli -- sync preview --profile work
  ```
- **Plan**: Generate a detailed AI-driven transformation plan.
  ```bash
  npm run cli -- sync plan --profile work
  ```
- **Apply**: Execute the changes to the destination service.
  ```bash
  npm run cli -- sync apply --profile work --yes
  ```

## Configuration

The system uses `sync.config.json` in the root directory.

- **Profiles**: Define different sync targets (e.g., `work`, `personal`).
- **Selection**: Filter by `notebookIds`, `sectionIds`, or `titleIncludes`.
- **Limits**: Control throughput via `maxPages`, `maxPayloadChars`, etc.
- **Agent**: Customize the planner's behavior with `prompt` overrides and `sourceContextQuery`.

## Development Conventions

- **Modular Services**: Keep service-specific logic inside `src/services/`.
- **Core Orchestration**: Keep business logic and engine orchestration inside `src/core/`.
- **Schema Driven**: All sync plans must validate against `src/core/schemas.js`.
- **Context Awareness**: Use the `read_service_docs` tool to ensure the AI planner understands the latest API limitations.
- **Surgical Sync**: Prefer skipping items (action: `skip`) in the plan if they haven't changed or cannot be reliably translated.
- **Batch Processing**: Planning is optimized into chunks of up to 20 items or 60,000 characters to minimize API overhead and latency.
