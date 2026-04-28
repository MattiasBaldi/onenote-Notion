/**
 * LLM Client Factory
 * Supports Gemini, OpenAI, Claude, local LM Studio, or other OpenAI-compatible endpoints
 */

import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

export function createLLMClient(options = {}) {
  const {
    provider = process.env.LLM_PROVIDER || "gemini",
    modelName = process.env.AGENT_MODEL || getDefaultModel(provider),
    apiKey = process.env.AGENT_API_KEY,
    baseURL = process.env.LLM_BASE_URL,
    temperature = 0.1,
  } = options;

  console.debug(`Using LLM: ${provider} (${modelName})`);

  // Gemini
  if (provider === "gemini") {
    return new ChatGoogleGenerativeAI({
      modelName,
      apiKey,
      temperature,
    });
  }

  // Local LM Studio or OpenAI-compatible
  if (baseURL || process.env.LLM_BASE_URL) {
    console.debug(`Using endpoint: ${baseURL || process.env.LLM_BASE_URL}`);
    return new ChatOpenAI({
      modelName,
      openAIApiKey: apiKey || "not-needed",
      baseURL: baseURL || process.env.LLM_BASE_URL,
      temperature,
    });
  }

  // Default to OpenAI
  return new ChatOpenAI({
    modelName,
    openAIApiKey: apiKey,
    temperature,
  });
}

function getDefaultModel(provider) {
  switch (provider) {
    case "gemini":
      return "gemini-2.5-flash-lite";
    case "openai":
      return "gpt-4";
    case "claude":
      return "claude-3-5-sonnet-20241022";
    default:
      return "gpt-4";
  }
}

export function getLLMConfig() {
  const provider = process.env.LLM_PROVIDER || "gemini";
  const model = process.env.AGENT_MODEL || getDefaultModel(provider);
  const baseURL = process.env.LLM_BASE_URL || process.env.LM_STUDIO_URL;

  return {
    provider,
    model,
    hasAPIKey: !!process.env.AGENT_API_KEY,
    baseURL: baseURL || null,
  };
}
