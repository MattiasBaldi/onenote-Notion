import { createAgent } from "langchain";
import { createNotionClient, createPage as createNotionPage, getPageMarkdown, search, updatePage } from "../services/notion/service.js";
import { getAccessToken } from "../services/onenote/auth.js";
import {
  createPage as createOneNotePage,
  getPageContent,
  getPage as getOneNotePage,
  listNotebookSections,
  listNotebooks,
  listSectionPages,
} from "../services/onenote/graph.js";
import { readServiceDocsTool } from "../services/agent/tools.js";
import { BatchSyncItemPlanSchema, SyncItemPlanSchema, SyncPlanSchema } from "./schemas.js";

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string" && value.trim()) {
    return value.split(/[,\n]+/).map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function truncate(text, maxChars) {
  if (!text || !maxChars || text.length <= maxChars) return text || "";
  return `${text.slice(0, maxChars).trimEnd()}...`;
}

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function mergeSelection(base = {}, override = {}) {
  return {
    notebookIds: toList(override.notebookIds?.length ? override.notebookIds : base.notebookIds),
    sectionIds: toList(override.sectionIds?.length ? override.sectionIds : base.sectionIds),
    pageIds: toList(override.pageIds?.length ? override.pageIds : base.pageIds),
    titleIncludes: toList(override.titleIncludes?.length ? override.titleIncludes : base.titleIncludes),
    query: normalizeString(override.query || base.query),
    modifiedAfter: override.modifiedAfter || base.modifiedAfter,
    createdAfter: override.createdAfter || base.createdAfter,
    limitPages: override.limitPages || base.limitPages,
  };
}

function mergeLimits(base = {}, override = {}) {
  return {
    maxNotebooks: override.maxNotebooks || base.maxNotebooks,
    maxSectionsPerNotebook: override.maxSectionsPerNotebook || base.maxSectionsPerNotebook,
    maxPagesPerSection: override.maxPagesPerSection || base.maxPagesPerSection,
    maxPages: override.maxPages || base.maxPages,
    maxPayloadChars: override.maxPayloadChars || base.maxPayloadChars,
  };
}

function mergeAgent(base = {}, override = {}) {
  return {
    model: override.model || base.model,
    prompt: override.prompt || base.prompt,
    sourceContextQuery: override.sourceContextQuery || base.sourceContextQuery,
    destinationContextQuery: override.destinationContextQuery || base.destinationContextQuery,
    title: override.title || base.title,
  };
}

function resolveProfile(config, profileName = "default") {
  const sync = config?.data?.sync || {};
  const defaults = sync.defaults || {};
  const effectiveProfileName =
    profileName !== "default" ? profileName : sync.defaultProfile || profileName;
  const profile = sync.profiles?.[effectiveProfileName] || sync.profiles?.default || {};
  const source = isPlainObject(profile.source) ? profile.source : {};
  const destination = isPlainObject(profile.destination) ? profile.destination : {};
  const selection = mergeSelection(defaults.selection, profile.selection);
  const limits = mergeLimits(defaults.limits, profile.limits);
  const agent = mergeAgent(defaults.agent, profile.agent);
  const agents = isPlainObject(profile.agents)
    ? Object.fromEntries(
        Object.entries(profile.agents).map(([name, value]) => [name, mergeAgent(defaults.agent, value)]),
      )
    : {};

  return {
    profileName: effectiveProfileName,
    source: { service: "onenote", ...(defaults.source || {}), ...source },
    destination: { service: "notion", ...(defaults.destination || {}), ...destination },
    selection,
    limits: mergeLimits(
      {
        maxNotebooks: 1,
        maxSectionsPerNotebook: 4,
        maxPagesPerSection: 10,
        maxPages: 20,
        maxPayloadChars: 24000,
      },
      limits,
    ),
    agent,
    agents,
    schedule: profile.schedule || defaults.schedule || {},
    debug: profile.debug || defaults.debug || {},
  };
}

function getPlannerAgentConfig(profile) {
  return profile.agents?.planner || profile.agent || {};
}

function buildPlannerAgent(profile) {
  const planner = getPlannerAgentConfig(profile);
  const promptPieces = [
    "You are a sync planner mapping content from a source service to a destination service.",
    "You will be provided with a batch of source items. You must return a list containing a schema-valid plan for EACH source item.",
    "Always inspect Context7 docs for both source and destination services before producing the final plan.",
    planner.sourceContextQuery
      ? `Use this Context7 query when reading the source docs: ${planner.sourceContextQuery}`
      : "Use a focused Context7 query about the source format and constraints.",
    planner.destinationContextQuery
      ? `Use this Context7 query when reading the destination docs: ${planner.destinationContextQuery}`
      : "Use a focused Context7 query about the destination format and constraints.",
    "Use the docs tool for the relevant service and a focused query about page content, blocks, markdown, HTML, rich text, properties, and limitations before deciding the destination payload.",
    "Preserve meaning, structure, and renderability over literal formatting.",
    "Prefer conservative plans when a target format cannot represent a source construct exactly.",
  ];

  if (planner.prompt) {
    promptPieces.push(`Operator instructions: ${planner.prompt}`);
  }

  return createAgent({
    model: planner.model || process.env.LANGCHAIN_MODEL || "openai:gpt-5",
    tools: [readServiceDocsTool],
    systemPrompt: promptPieces.join(" "),
    responseFormat: BatchSyncItemPlanSchema,
  });
}

function renderSelectionHints(selection = {}) {
  return {
    notebookIds: selection.notebookIds || [],
    sectionIds: selection.sectionIds || [],
    pageIds: selection.pageIds || [],
    titleIncludes: selection.titleIncludes || [],
    query: selection.query || "",
    modifiedAfter: selection.modifiedAfter || null,
    createdAfter: selection.createdAfter || null,
    limitPages: selection.limitPages || null,
  };
}

async function collectOneNoteSourceItems(profile, overrides = {}) {
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

async function fetchOneNotePage(token, pageId, refs = {}) {
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

async function collectNotionSourceItems(profile, overrides = {}) {
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

function extractNotionTitle(page) {
  const titleProp = Object.values(page?.properties || {}).find((prop) => prop.type === "title");
  return titleProp?.title?.map((part) => part.plain_text || part.text?.content || "").join("") || "Untitled page";
}

async function collectSourceItems(profile, overrides = {}) {
  const sourceService = overrides.source?.service || profile.source.service;

  if (sourceService === "onenote") {
    return collectOneNoteSourceItems(profile, overrides);
  }
  if (sourceService === "notion") {
    return collectNotionSourceItems(profile, overrides);
  }

  throw new Error(`Unsupported source service: ${sourceService}`);
}

async function translateItemsBatch({
  profile,
  sourceItems,
  source,
  destination,
  overrides = {},
}) {
  const agent = buildPlannerAgent(profile);
  const agentPrompt = profile.agent?.prompt || profile.agents?.planner?.prompt || "";
  const maxChars = profile.limits.maxPayloadChars || 24000;
  const userPayload = {
    task: "sync-items-batch",
    profile: {
      name: overrides.profileName || profile.profileName || "default",
      agentPrompt,
      schedule: profile.schedule || {},
    },
    contextQueries: {
      source: profile.agent?.sourceContextQuery || profile.agents?.planner?.sourceContextQuery || "",
      destination:
        profile.agent?.destinationContextQuery || profile.agents?.planner?.destinationContextQuery || "",
    },
    source,
    destination,
    sourceItems: sourceItems.map((item) => ({
      itemId: item.itemId,
      title: item.title,
      contentFormat: item.contentFormat,
      content: truncate(item.content, maxChars),
      metadata: item.metadata,
    })),
    selection: renderSelectionHints(profile.selection),
    limits: profile.limits,
  };

  const result = await agent.invoke({
    messages: [
      {
        role: "user",
        content: JSON.stringify(userPayload, null, 2),
      },
    ],
  });

  return BatchSyncItemPlanSchema.parse(result.structuredResponse);
}

export async function buildSyncPlan({ config, profileName = "default", overrides = {} }) {
  const resolved = resolveProfile(config, profileName);
  const source = { ...(resolved.source || {}), ...(overrides.source || {}) };
  const destination = { ...(resolved.destination || {}), ...(overrides.destination || {}) };
  const profile = {
    ...resolved,
    source,
    destination,
    selection: mergeSelection(resolved.selection, overrides.selection || {}),
    limits: mergeLimits(resolved.limits, overrides.limits || {}),
    agent: mergeAgent(resolved.agent, overrides.agent || {}),
    schedule: overrides.schedule || resolved.schedule || {},
  };
  const { items: sourceItems, warnings } = await collectSourceItems(profile, overrides);
  const plans = [];

  const BATCH_CHAR_LIMIT = 60000;
  const BATCH_COUNT_LIMIT = 20;

  let currentBatch = [];
  let currentBatchChars = 0;

  for (const sourceItem of sourceItems) {
    const itemChars = (sourceItem.content || "").length;

    if (
      currentBatch.length >= BATCH_COUNT_LIMIT ||
      (currentBatch.length > 0 && currentBatchChars + itemChars > BATCH_CHAR_LIMIT)
    ) {
      console.log(`Starting AI planning for batch of ${currentBatch.length} items (${currentBatchChars} chars)...`);
      const batchPlans = await translateItemsBatch({
        profile,
        sourceItems: currentBatch,
        source: profile.source,
        destination: profile.destination,
        overrides: { profileName },
      });
      plans.push(...batchPlans);
      currentBatch = [];
      currentBatchChars = 0;
    }

    currentBatch.push(sourceItem);
    currentBatchChars += itemChars;
  }

  if (currentBatch.length > 0) {
    console.log(`Starting AI planning for final batch of ${currentBatch.length} items (${currentBatchChars} chars)...`);
    const batchPlans = await translateItemsBatch({
      profile,
      sourceItems: currentBatch,
      source: profile.source,
      destination: profile.destination,
      overrides: { profileName },
    });
    plans.push(...batchPlans);
  }

  return SyncPlanSchema.parse({
    profileName: resolved.profileName,
    source: profile.source,
    destination: profile.destination,
    selection: profile.selection,
    limits: profile.limits,
    agent: profile.agent,
    itemCount: plans.length,
    items: plans,
    warnings,
  });
}

export async function applySyncPlan(plan, { profile, quiet = false } = {}) {
  const results = [];
  const destination = profile?.destination || plan.destination;

  if (destination.service === "notion") {
    const client = createNotionClient(destination);
    for (const item of plan.items) {
      if (item.action === "skip") {
        results.push({ itemId: item.itemId, skipped: true });
        continue;
      }
      const payload = item.targetPayload || {};
      if (item.action === "update" || payload.existingPageId || payload.page_id) {
        const pageId = payload.existingPageId || payload.page_id;
        const { existingPageId, page_id, ...updatePayload } = payload;
        const result = await updatePage(client, pageId, updatePayload);
        results.push({ itemId: item.itemId, result });
        continue;
      }
      const result = await createNotionPage(client, payload);
      results.push({ itemId: item.itemId, result });
      if (!quiet) {
        console.log(`Created Notion page for ${item.title}`);
      }
    }
    return results;
  }

  if (destination.service === "onenote") {
    const token = await getAccessToken({
      token: process.env.ONENOTE_ACCESS_TOKEN || process.env.GRAPH_ACCESS_TOKEN || destination.token,
      tenant: process.env.ONENOTE_TENANT_ID || process.env.MS_TENANT_ID || destination.tenant || "common",
      clientId: process.env.ONENOTE_CLIENT_ID || process.env.MS_CLIENT_ID || destination.clientId || "",
      scopes: destination.scopes,
      quiet: true,
    });

    for (const item of plan.items) {
      if (item.action === "skip") {
        results.push({ itemId: item.itemId, skipped: true });
        continue;
      }
      const payload = item.targetPayload || {};
      const sectionId = payload.sectionId || destination.sectionId;
      const html = payload.html || payload.xhtml || "";
      if (!sectionId) {
        throw new Error(`Missing destination sectionId for OneNote item ${item.itemId}`);
      }
      const result = await createOneNotePage(token, sectionId, html);
      results.push({ itemId: item.itemId, result });
      if (!quiet) {
        console.log(`Created OneNote page for ${item.title}`);
      }
    }
    return results;
  }

  throw new Error(`Unsupported destination service: ${destination.service}`);
}

export function renderDebugSnapshot(plan) {
  return {
    profileName: plan.profileName,
    source: plan.source,
    destination: plan.destination,
    selection: plan.selection,
    limits: plan.limits,
    warnings: plan.warnings,
    items: plan.items.map((item) => ({
      itemId: item.itemId,
      title: item.title,
      sourceService: item.sourceService,
      destinationService: item.destinationService,
      sourceType: item.sourceType,
      destinationType: item.destinationType,
      action: item.action,
      confidence: item.confidence,
      warnings: item.warnings,
      mappingNotes: item.mappingNotes,
      targetPayload: item.targetPayload,
    })),
  };
}

export function renderSelectionSnapshot(profile) {
  return {
    profileName: profile.profileName,
    source: profile.source,
    destination: profile.destination,
    selection: profile.selection,
    limits: profile.limits,
    agent: profile.agent,
    agents: profile.agents,
    schedule: profile.schedule,
    debug: profile.debug,
  };
}

export async function loadSourceItemsOnly({ config, profileName = "default", overrides = {} }) {
  const resolved = resolveProfile(config, profileName);
  const profile = {
    ...resolved,
    source: { ...(resolved.source || {}), ...(overrides.source || {}) },
    destination: { ...(resolved.destination || {}), ...(overrides.destination || {}) },
    selection: mergeSelection(resolved.selection, overrides.selection || {}),
    limits: mergeLimits(resolved.limits, overrides.limits || {}),
    agent: mergeAgent(resolved.agent, overrides.agent || {}),
    schedule: overrides.schedule || resolved.schedule || {},
  };
  return collectSourceItems(profile, overrides);
}
