/**
 * Agent Service Tests - Vitest
 * Tests LangChain + Gemini integration
 * Run: npm test -- agent.test.js
 */

import { describe, it, expect, beforeAll } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvFile } from "../src/services/onenote/auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, "../src");

describe("Agent Service (Gemini)", () => {
  beforeAll(async () => {
    await loadEnvFile();
  });

  describe("LLM Configuration", () => {
    it("LLM_PROVIDER is set or defaults to gemini", () => {
      const provider = process.env.LLM_PROVIDER || "gemini";
      expect(["gemini", "openai", "claude", "local"]).toContain(provider);
    });

    it("AGENT_API_KEY is set", () => {
      expect(process.env.AGENT_API_KEY).toBeDefined();
    });

    it("AGENT_MODEL is set or defaults", () => {
      const model = process.env.AGENT_MODEL || "gemini-2.5-flash-lite";
      expect(model).toBeDefined();
    });
  });

  describe("Context7 Integration", () => {
    it.skipIf(!process.env.CONTEXT7_API_KEY)("CONTEXT7_API_KEY is set", () => {
      expect(process.env.CONTEXT7_API_KEY).toBeDefined();
    });

    it.skipIf(!process.env.CONTEXT7_API_KEY)("CONTEXT7_API_KEY has valid format", () => {
      const key = process.env.CONTEXT7_API_KEY;
      if (key) {
        expect(key.length).toBeGreaterThanOrEqual(10);
      }
    });
  });

  describe("Agent Tools", () => {
    it.skipIf(!process.env.CONTEXT7_API_KEY)("exports readServiceDocsTool", async () => {
      const { readServiceDocsTool } = await import(path.join(srcDir, "services/agent/tools.js"));
      expect(readServiceDocsTool).toBeDefined();
    });

    it.skipIf(!process.env.CONTEXT7_API_KEY)("tool has correct structure (invoke method)", async () => {
      const { readServiceDocsTool } = await import(path.join(srcDir, "services/agent/tools.js"));
      expect(typeof readServiceDocsTool.invoke).toBe("function");
    });
  });

  describe("Schema Validation", () => {
    it("exports TranslationPlanSchema", async () => {
      const { TranslationPlanSchema } = await import(path.join(srcDir, "services/agent/schemas.js"));
      expect(TranslationPlanSchema).toBeDefined();
    });

    it("exports TranslationInputSchema", async () => {
      const { TranslationInputSchema } = await import(path.join(srcDir, "services/agent/schemas.js"));
      expect(TranslationInputSchema).toBeDefined();
    });

    it("exports ServiceEnum", async () => {
      const { ServiceEnum } = await import(path.join(srcDir, "services/agent/schemas.js"));
      expect(ServiceEnum).toBeDefined();
    });
  });

  describe("LLM Client Factory", () => {
    it("exports createLLMClient function", async () => {
      const { createLLMClient } = await import(path.join(srcDir, "lib/llm-client.js"));
      expect(typeof createLLMClient).toBe("function");
    });

    it("exports getLLMConfig function", async () => {
      const { getLLMConfig } = await import(path.join(srcDir, "lib/llm-client.js"));
      expect(typeof getLLMConfig).toBe("function");
    });

    it("getLLMConfig returns valid config", async () => {
      const { getLLMConfig } = await import(path.join(srcDir, "lib/llm-client.js"));
      const config = getLLMConfig();
      expect(config).toBeDefined();
      expect(config.provider).toBeDefined();
      expect(config.model).toBeDefined();
    });
  });

  describe("Integration Tests", () => {
    it("can create LLM client (Gemini)", async () => {
      const { createLLMClient } = await import(path.join(srcDir, "lib/llm-client.js"));
      const provider = process.env.LLM_PROVIDER || "gemini";

      const client = createLLMClient({
        provider,
        apiKey: process.env.AGENT_API_KEY,
        modelName: process.env.AGENT_MODEL || "gemini-2.5-flash-lite",
      });

      expect(client).toBeDefined();

      if (provider === "gemini") {
        expect(typeof client.invoke).toBe("function");
      }
    });

    it.skipIf(!process.env.CONTEXT7_API_KEY)("agent tools are loadable at runtime", async () => {
      const { readServiceDocsTool } = await import(path.join(srcDir, "services/agent/tools.js"));
      expect(readServiceDocsTool.invoke).toBeDefined();
    });
  });
});
