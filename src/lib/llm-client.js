/**
 * LLM Client Factory
 * Supports OpenAI, local LM Studio, or other OpenAI-compatible endpoints
 */

import { ChatOpenAI } from "@langchain/openai";

export function createLLMClient(options = {}) {
  const {
    modelName = process.env.AGENT_MODEL || "gpt-4",
    apiKey = process.env.AGENT_API_KEY,
    baseURL = process.env.LLM_BASE_URL,
    temperature = 0.1,
  } = options;

  // Detect if using local LM Studio
  const isLocalLM = baseURL || process.env.LLM_BASE_URL;

  if (isLocalLM) {
    console.debug(`Using local LLM: ${baseURL || "http://localhost:1234/v1"}`);
  }

  return new ChatOpenAI({
    modelName,
    openAIApiKey: apiKey || "not-needed", // Not needed for local
    baseURL: baseURL || process.env.LLM_BASE_URL || undefined,
    temperature,
  });
}

export function getLLMConfig() {
  const isLocalLM = process.env.LLM_BASE_URL || process.env.LM_STUDIO_URL;
  const provider = isLocalLM ? "local" : "openai";
  const endpoint = process.env.LLM_BASE_URL || process.env.LM_STUDIO_URL || "https://api.openai.com/v1";

  return {
    provider,
    endpoint,
    model: process.env.AGENT_MODEL || "gpt-4",
    hasAPIKey: !!process.env.AGENT_API_KEY,
  };
}
