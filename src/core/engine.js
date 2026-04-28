/**
 * Sync engine - main exports
 * Individual concerns split across focused modules:
 * - config.js: configuration management
 * - agent.js: LLM agent creation and planning
 * - sources/: source item collection (OneNote, Notion)
 * - apply.js: applying plans to destinations
 * - plan.js: orchestrating sync planning
 * - snapshots.js: rendering/serialization
 * - utils.js: common utilities
 */

export { buildSyncPlan } from "./plan.js";
export { applySyncPlan } from "./apply.js";
export { renderDebugSnapshot, renderSelectionSnapshot } from "./snapshots.js";
export { resolveProfile, mergeSelection, mergeLimits, mergeAgent } from "./config.js";
export { collectSourceItems } from "./sources/index.js";

/**
 * Load source items without planning
 */
export async function loadSourceItemsOnly({ config, profileName = "default", overrides = {} }) {
  const { resolveProfile, mergeSelection, mergeLimits, mergeAgent } = await import("./config.js");
  const { collectSourceItems } = await import("./sources/index.js");

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
