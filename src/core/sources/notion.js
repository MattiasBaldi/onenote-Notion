/**
 * Notion source item collection
 */

import { createNotionClient, getPageMarkdown, search } from "../../services/notion/service.js";
import { mergeLimits, mergeSelection } from "../config.js";

export function extractNotionTitle(page) {
  const titleProp = Object.values(page?.properties || {}).find((prop) => prop.type === "title");
  return titleProp?.title?.map((part) => part.plain_text || part.text?.content || "").join("") || "Untitled page";
}

export async function collectNotionSourceItems(profile, overrides = {}) {
  const selection = mergeSelection(profile.selection, overrides.selection || {});
  const limits = mergeLimits(profile.limits, overrides.limits || {});
  const client = createNotionClient(profile.source);
  const pageIds = selection.pageIds.length ? selection.pageIds : profile.source.pageIds || [];
  const query = selection.query || profile.source.query || selection.titleIncludes.join(" ") || "";
  const warnings = [];
  const items = [];

  let candidates = [];
  if (pageIds.length) {
    candidates = pageIds.map((pageId) => ({ id: pageId }));
  } else if (query) {
    const result = await search(client, { query });
    candidates = (result.results || []).filter((entry) => entry.object === "page");
  } else {
    warnings.push("Notion source selection needs pageIds or a query.");
    return { items, warnings };
  }

  for (const candidate of candidates.slice(0, selection.limitPages || limits.maxPages || candidates.length)) {
    const pageId = candidate.id || candidate.page_id || candidate.pageId;
    if (!pageId) continue;
    const page = await client.pages.retrieve({ page_id: pageId });
    if (selection.titleIncludes.length) {
      const title = extractNotionTitle(page);
      const match = selection.titleIncludes.some((term) =>
        title.toLowerCase().includes(term.toLowerCase()),
      );
      if (!match) continue;
    }
    if (selection.modifiedAfter && page.last_edited_time) {
      if (new Date(page.last_edited_time) <= new Date(selection.modifiedAfter)) continue;
    }
    if (selection.createdAfter && page.created_time) {
      if (new Date(page.created_time) <= new Date(selection.createdAfter)) continue;
    }
    const markdown = await getPageMarkdown(client, pageId);
    items.push({
      itemId: pageId,
      sourceId: pageId,
      sourceService: "notion",
      sourceType: "page",
      title: extractNotionTitle(page),
      content: markdown?.page_markdown || markdown?.markdown || "",
      contentFormat: "markdown",
      metadata: {
        createdTime: page.created_time || null,
        lastEditedTime: page.last_edited_time || null,
        parent: page.parent || null,
      },
      raw: page,
    });
  }

  if (!items.length) {
    warnings.push("No Notion pages matched the current selection.");
  }

  return { items, warnings };
}
