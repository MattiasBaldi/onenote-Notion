/**
 * Rendering and snapshot functions
 */

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
