/**
 * Configuration management
 */

import { isPlainObject, toList, normalizeString } from "./utils.js";

export function mergeSelection(base = {}, override = {}) {
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

export function mergeLimits(base = {}, override = {}) {
  return {
    maxNotebooks: override.maxNotebooks || base.maxNotebooks,
    maxSectionsPerNotebook: override.maxSectionsPerNotebook || base.maxSectionsPerNotebook,
    maxPagesPerSection: override.maxPagesPerSection || base.maxPagesPerSection,
    maxPages: override.maxPages || base.maxPages,
    maxPayloadChars: override.maxPayloadChars || base.maxPayloadChars,
  };
}

export function mergeAgent(base = {}, override = {}) {
  return {
    model: override.model || base.model,
    prompt: override.prompt || base.prompt,
    sourceContextQuery: override.sourceContextQuery || base.sourceContextQuery,
    destinationContextQuery: override.destinationContextQuery || base.destinationContextQuery,
    title: override.title || base.title,
  };
}

export function resolveProfile(config, profileName = "default") {
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

export function renderSelectionHints(selection = {}) {
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
