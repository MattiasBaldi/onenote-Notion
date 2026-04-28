# Sync workflow

This namespace is the main entrypoint for moving content between Microsoft OneNote and Notion.

## What it does

- Reads content from a configured source service
- Uses Context7 through the official SDK to pull current OneNote and Notion formatting guidance
- Asks LangChain to build a per-item sync plan
- Lets you inspect config, source selection, destination settings, and the full plan before writing anything

## Command flow

1. Load `.env`
2. Load `sync.config.json` and optionally merge `onenote.config.json`
3. Resolve the active sync profile
4. Collect source items based on selection rules and limits
5. Ask the planner agent to produce a structured plan
6. Preview or apply the plan

## Commands

### `sync plan`

Build the plan and print the full JSON representation.

Use this when you want to inspect the exact source items, proposed actions, and payloads.

### `sync preview`

Print a readable summary of the plan.

Use this when you want a quick check before applying.

### `sync apply --yes`

Execute the plan and write to the destination service.

This command refuses to run unless `--yes` is present.

### `sync debug`

Inspect intermediate state:

- `config`
- `selection`
- `source`
- `destination`
- `plan`

## What the plan contains

- Source and destination services
- Selected notebooks, sections, or pages
- Limits and selection rules
- Agent configuration
- One plan entry per source item
- Action type per item:
  - `create`
  - `update`
  - `skip`

## Useful config knobs

- `source`
  - `service`
  - service-specific identifiers like notebook IDs or queries
- `destination`
  - `service`
  - service-specific identifiers like parent page or section IDs
- `selection`
  - page, section, or notebook filters
  - text filters
  - created/modified timestamps
- `limits`
  - max notebooks
  - max sections per notebook
  - max pages per section
  - max pages total
  - max payload size
- `agent`
  - model override
  - planner prompt override
  - source and destination Context7 queries

## Default safety behavior

- The planner defaults to a small page cap
- The CLI requires `--yes` for writes
- Debug commands are read-only
- Source selection can be narrowed by IDs, query, title match, or timestamps

## Relevant code

- [Sync CLI](/Users/mac/Desktop/onenote↔Notion/src/sync/index.js)
- [Sync engine](/Users/mac/Desktop/onenote↔Notion/src/sync/engine.js)
- [Sync schemas](/Users/mac/Desktop/onenote↔Notion/src/sync/schemas.js)
- [Sync config](/Users/mac/Desktop/onenote↔Notion/sync.config.json.example)
