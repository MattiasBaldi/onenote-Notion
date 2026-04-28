/**
 * LLM Agent creation and planning
 */

import { createLLMClient } from "../lib/llm-client.js";
import { readServiceDocsTool } from "../services/agent/tools.js";
import { BatchSyncItemPlanSchema } from "./schemas.js";
import { truncate } from "./utils.js";
import { renderSelectionHints } from "./config.js";

export function createAgent({ model, tools, systemPrompt, responseFormat }) {
  const llmClient = createLLMClient({
    provider: process.env.LLM_PROVIDER || "gemini",
    apiKey: process.env.AGENT_API_KEY,
    modelName: model || process.env.AGENT_MODEL,
  });

  return {
    invoke: async ({ messages }) => {
      const userMessage = messages?.[0]?.content || "";
      const fullPrompt = systemPrompt + "\n\n" + userMessage;

      // Add timeout for LLM API call (30 seconds)
      const result = await Promise.race([
        llmClient.invoke(fullPrompt),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("LLM API timeout")), 30000)
        ),
      ]);

      const responseText = typeof result === "string" ? result : result.content || String(result);
      return {
        structuredResponse: responseFormat ? responseFormat.parse(JSON.parse(responseText)) : responseText,
      };
    },
  };
}

function getPlannerAgentConfig(profile) {
  return profile.agents?.planner || profile.agent || {};
}

export function buildPlannerAgent(profile) {
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

export async function translateItemsBatch({
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
