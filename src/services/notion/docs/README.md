# Notion service

This service wraps the official Notion SDK (`@notionhq/client`) and its content APIs.

## What it handles

- Page retrieval and page metadata
- Markdown retrieval and markdown updates
- Page creation and property updates
- Block child listing and appending
- Trash and restore operations

## Key API shapes

- `pages.retrieve`
- `pages.create`
- `pages.update`
- `pages.retrieveMarkdown`
- `pages.updateMarkdown`
- `blocks.children.list`
- `blocks.children.append`

## Notes

- Notion page content is block-based, but the current SDK also supports page markdown endpoints.
- Page properties are separate from page content.
- The API does not permanently delete pages; it trashes them.

## Relevant docs

- Notion overview: https://developers.notion.com/guides/get-started/overview
- Page content guide: https://developers.notion.com/guides/data-apis
- Create page: https://developers.notion.com/reference/post-page
- Retrieve page markdown: https://developers.notion.com/reference/retrieve-page-markdown
