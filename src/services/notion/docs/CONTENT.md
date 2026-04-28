# Notion content model notes

Notion content is block-based, but the SDK also exposes markdown read/write paths.

## Important distinctions

- Page properties are structured metadata
- Page content is nested blocks
- Markdown endpoints are useful for translations and simpler round-trips

## Useful SDK methods

- `pages.retrieve`
- `pages.retrieveMarkdown`
- `pages.create`
- `pages.update`
- `pages.updateMarkdown`
- `blocks.children.list`
- `blocks.children.append`

## Relevant docs

- Working with page content: https://developers.notion.com/guides/data-apis
- Retrieve page markdown: https://developers.notion.com/reference/retrieve-page-markdown
