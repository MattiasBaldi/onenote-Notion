# OneNote service

This service wraps Microsoft Graph OneNote APIs and the local export pipeline.

## What it handles

- Notebook, section, and page discovery
- Page HTML retrieval from Graph
- Asset extraction and export folder rendering
- Auth helpers for device-code flow and cached refresh tokens

## Relevant docs

- OneNote API overview: https://learn.microsoft.com/en-us/graph/onenote-api-overview
- Input/output HTML: https://learn.microsoft.com/en-us/graph/onenote-input-output-html
- OneNote page content: https://learn.microsoft.com/en-us/graph/onenote-update-page
