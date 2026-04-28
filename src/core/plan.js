/**
 * Sync plan building orchestration
 */

import { SyncPlanSchema } from "./schemas.js";
import { resolveProfile, mergeSelection, mergeLimits, mergeAgent } from "./config.js";
import { translateItemsBatch } from "./agent.js";
import { collectSourceItems } from "./sources/index.js";

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
