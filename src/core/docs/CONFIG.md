# Sync config reference

The sync namespace reads `sync.config.json` from the project root.
If that file is not present, it falls back to `onenote.config.json` for legacy OneNote settings.

## Top-level keys

### `orchestration`

Controls namespace routing for the CLI.

- `defaultNamespace`
- `namespaces`

### `sync`

Holds the actual sync configuration.

- `defaultProfile`
- `defaults`
- `profiles`

## `sync.defaults`

Applied to every profile unless overridden.

Common keys:

- `source`
- `destination`
- `selection`
- `limits`
- `agent`
- `schedule`
- `debug`

## `sync.profiles.<name>`

Named sync profiles. Each profile can override:

- `source`
- `destination`
- `selection`
- `limits`
- `agent`
- `agents`
- `schedule`
- `debug`

## Source and destination

### `source`

The input side of the sync.

Common fields:

- `service`: `onenote` or `notion`
- `tenant`
- `clientId`
- `token`
- `scopes`
- `notebookIds`
- `sectionIds`
- `pageIds`
- `query`

### `destination`

The output side of the sync.

Common fields:

- `service`: `onenote` or `notion`
- `parentPageId`
- `databaseId`
- `sectionId`
- `notebookId`
- service auth fields if needed

## Selection

These fields decide what gets pulled into the plan.

- `notebookIds`
- `sectionIds`
- `pageIds`
- `titleIncludes`
- `query`
- `modifiedAfter`
- `createdAfter`
- `limitPages`

## Limits

These fields cap how much content is scanned or rendered.

- `maxNotebooks`
- `maxSectionsPerNotebook`
- `maxPagesPerSection`
- `maxPages`
- `maxPayloadChars`

## Agent settings

These fields control the planner.

- `model`
- `prompt`
- `sourceContextQuery`
- `destinationContextQuery`
- `title`

## Named agents

`sync.profiles.<name>.agents` lets you define multiple named planner variants.

Example:

- `planner`
- `reviewer`
- `dryRun`

Each named agent can override:

- `model`
- `prompt`
- `sourceContextQuery`
- `destinationContextQuery`
- `title`

## Scheduling metadata

The sync engine currently treats `schedule` as metadata, not as an active scheduler.
Use it to record:

- `mode`
- `timezone`
- `cron`
- `window`

## CLI override mapping

These flags override config at runtime:

- `--profile`
- `--source`
- `--destination`
- `--source-page`
- `--source-section`
- `--source-notebook`
- `--destination-parent-page`
- `--destination-section`
- `--destination-database`
- `--query`
- `--modified-after`
- `--created-after`
- `--title-contains`
- `--limit-pages`
- `--limit-sections`
- `--limit-notebooks`
- `--max-payload-chars`
- `--model`
- `--prompt`
- `--source-context-query`
- `--destination-context-query`

## Safety defaults

If no config is present, the engine defaults to:

- source: OneNote
- destination: Notion
- small page and section caps
- no writes unless `--yes` is passed
