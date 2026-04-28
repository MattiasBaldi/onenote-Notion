/**
 * OneNote source item collection
 */

import { getAccessToken } from "../../services/onenote/auth.js";
import {
  getPageContent,
  getPage as getOneNotePage,
  listNotebookSections,
  listNotebooks,
  listSectionPages,
} from "../../services/onenote/graph.js";
import { mergeLimits, mergeSelection } from "../config.js";
import { normalizeString } from "../utils.js";

export async function fetchOneNotePage(token, pageId, refs = {}) {
  const page = await getOneNotePage(token, pageId);
  const html = await getPageContent(token, pageId);
  return {
    itemId: pageId,
    sourceId: pageId,
    sourceService: "onenote",
    sourceType: "page",
    title: page.title || page.displayName || "Untitled page",
    content: html,
    contentFormat: "html",
    metadata: {
      createdDateTime: page.createdDateTime || null,
      lastModifiedDateTime: page.lastModifiedDateTime || null,
      notebookId: refs.notebook?.id || page.parentNotebook?.id || null,
      sectionId: refs.section?.id || page.parentSection?.id || null,
    },
    raw: page,
  };
}

export async function collectOneNoteSourceItems(profile, overrides = {}) {
  const selection = mergeSelection(profile.selection, overrides.selection || {});
  const limits = mergeLimits(profile.limits, overrides.limits || {});
  const token = await getAccessToken({
    token: process.env.ONENOTE_ACCESS_TOKEN || process.env.GRAPH_ACCESS_TOKEN || profile.source.token,
    tenant: process.env.ONENOTE_TENANT_ID || process.env.MS_TENANT_ID || profile.source.tenant || "common",
    clientId: process.env.ONENOTE_CLIENT_ID || process.env.MS_CLIENT_ID || profile.source.clientId || "",
    scopes: profile.source.scopes,
    quiet: true,
  });

  const pageLimit = selection.limitPages || limits.maxPages || Infinity;
  const selectedNotebookIds = selection.notebookIds.length
    ? selection.notebookIds
    : profile.source.notebookIds || [];
  const selectedSectionIds = selection.sectionIds.length
    ? selection.sectionIds
    : profile.source.sectionIds || [];
  const selectedPageIds = selection.pageIds.length
    ? selection.pageIds
    : profile.source.pageIds || [];

  const notebooks = selectedNotebookIds.length
    ? (await listNotebooks(token)).filter((notebook) => selectedNotebookIds.includes(notebook.id))
    : await listNotebooks(token);

  console.log(`Found ${notebooks.length} notebooks in OneNote.`);

  const notebookSlice = limits.maxNotebooks ? notebooks.slice(0, limits.maxNotebooks) : notebooks;
  const items = [];
  const warnings = [];

  if (selectedPageIds.length) {
    console.log(`Fetching ${selectedPageIds.length} specific pages...`);
    for (const pageId of selectedPageIds.slice(0, pageLimit)) {
      const page = await fetchOneNotePage(token, pageId);
      items.push(page);
    }
    return { items, warnings };
  }

  for (const notebook of notebookSlice) {
    console.log(`Scanning notebook: ${notebook.displayName}...`);
    const sections = await listNotebookSections(token, notebook.id);
    const notebookSections = selectedSectionIds.length
      ? sections.filter((section) => selectedSectionIds.includes(section.id))
      : sections;
    const sectionSlice = limits.maxSectionsPerNotebook
      ? notebookSections.slice(0, limits.maxSectionsPerNotebook)
      : notebookSections;

    for (const section of sectionSlice) {
      console.log(`  Scanning section: ${section.displayName}...`);
      const pages = await listSectionPages(token, section.id);
      const filteredPages = pages.filter((page) => {
        if (selection.titleIncludes.length) {
          const title = normalizeString(page.title || page.displayName || "");
          const match = selection.titleIncludes.some((term) =>
            title.toLowerCase().includes(term.toLowerCase()),
          );
          if (!match) return false;
        }
        if (selection.modifiedAfter && page.lastModifiedDateTime) {
          if (new Date(page.lastModifiedDateTime) <= new Date(selection.modifiedAfter)) return false;
        }
        if (selection.createdAfter && page.createdDateTime) {
          if (new Date(page.createdDateTime) <= new Date(selection.createdAfter)) return false;
        }
        return true;
      });
      const sectionPageLimit = limits.maxPagesPerSection || pageLimit;
      const remainingOverall = pageLimit - items.length;
      const pageSlice = filteredPages.slice(0, Math.min(remainingOverall, sectionPageLimit));

      if (pageSlice.length > 0) {
        console.log(`    Found ${pageSlice.length} matching pages.`);
      }

      for (const page of pageSlice) {
        console.log(`      Fetching content for: ${page.title || "Untitled"}...`);
        const fullPage = await fetchOneNotePage(token, page.id, {
          notebook,
          section,
        });
        items.push(fullPage);
        if (items.length >= pageLimit) break;
      }
      if (items.length >= pageLimit) break;
    }
    if (items.length >= pageLimit) break;
  }

  if (!items.length) {
    warnings.push("No OneNote pages matched the current selection.");
  }

  return { items, warnings };
}
