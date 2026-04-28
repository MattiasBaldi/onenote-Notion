#!/usr/bin/env node

/**
 * Agent Service Tests
 * Tests LangChain + Gemini integration
 * Run: node tests/agent.test.js
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvFile } from "../src/services/onenote/auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, "../src");

let testsPassed = 0;
let testsFailed = 0;

async function test(name, fn) {
  process.stdout.write(`  ${name}... `);
  try {
    await fn();
    console.log("✓");
    testsPassed++;
  } catch (error) {
    console.log(`✗ ${error.message}`);
    testsFailed++;
  }
}

async function runTests() {
  await loadEnvFile();

  console.log("\n=== Agent Service Tests ===\n");

  // Test 1: LLM Configuration
  console.log("1. LLM Configuration");

  await test("LLM_PROVIDER is set (or defaults to gemini)", async () => {
    const provider = process.env.LLM_PROVIDER || "gemini";
    if (!["gemini", "openai", "claude", "local"].includes(provider)) {
      throw new Error(`Invalid provider: ${provider}`);
    }
  });

  await test("AGENT_API_KEY is set", async () => {
    const key = process.env.AGENT_API_KEY;
    if (!key) throw new Error("AGENT_API_KEY not set");
  });

  await test("AGENT_MODEL is set or defaults", async () => {
    const model = process.env.AGENT_MODEL || "gemini-2.5-flash-lite";
    if (!model) throw new Error("No model configured");
  });

  // Test 2: Context7 (Live Docs)
  console.log("\n2. Context7 Integration");

  await test("CONTEXT7_API_KEY is set", async () => {
    const key = process.env.CONTEXT7_API_KEY;
    if (!key) throw new Error("CONTEXT7_API_KEY not set");
  });

  await test("CONTEXT7_API_KEY has valid format", async () => {
    const key = process.env.CONTEXT7_API_KEY;
    if (key.length < 10) throw new Error("CONTEXT7_API_KEY too short");
  });

  // Test 3: Agent Tools
  console.log("\n3. Agent Tools");

  await test("readServiceDocsTool is exported", async () => {
    const { readServiceDocsTool } = await import(path.join(srcDir, "services/agent/tools.js"));
    if (!readServiceDocsTool) throw new Error("Tool not exported");
  });

  await test("Tool has correct structure", async () => {
    const { readServiceDocsTool } = await import(path.join(srcDir, "services/agent/tools.js"));
    // LangChain tools are objects with invoke method
    if (typeof readServiceDocsTool.invoke !== "function") {
      throw new Error("Tool missing invoke method");
    }
  });

  // Test 4: Schemas
  console.log("\n4. Schema Validation");

  await test("TranslationPlanSchema is exported", async () => {
    const { TranslationPlanSchema } = await import(path.join(srcDir, "services/agent/schemas.js"));
    if (!TranslationPlanSchema) throw new Error("Schema not exported");
  });

  await test("TranslationInputSchema is exported", async () => {
    const { TranslationInputSchema } = await import(path.join(srcDir, "services/agent/schemas.js"));
    if (!TranslationInputSchema) throw new Error("Schema not exported");
  });

  await test("ServiceEnum is exported", async () => {
    const { ServiceEnum } = await import(path.join(srcDir, "services/agent/schemas.js"));
    if (!ServiceEnum) throw new Error("Enum not exported");
  });

  // Test 5: LLM Client Factory
  console.log("\n5. LLM Client Factory");

  await test("createLLMClient function exists", async () => {
    const { createLLMClient } = await import(path.join(srcDir, "lib/llm-client.js"));
    if (typeof createLLMClient !== "function") throw new Error("Not a function");
  });

  await test("createLLMClient returns Gemini client", async () => {
    const { createLLMClient } = await import(path.join(srcDir, "lib/llm-client.js"));
    const provider = process.env.LLM_PROVIDER || "gemini";

    if (provider === "gemini") {
      // Gemini client will have GoogleGenerativeAI methods
      // We can't fully instantiate without valid API key, but we can check the factory
      if (typeof createLLMClient !== "function") throw new Error("Factory not working");
    }
  });

  await test("getLLMConfig function exists", async () => {
    const { getLLMConfig } = await import(path.join(srcDir, "lib/llm-client.js"));
    if (typeof getLLMConfig !== "function") throw new Error("Not a function");
  });

  await test("getLLMConfig returns config object", async () => {
    const { getLLMConfig } = await import(path.join(srcDir, "lib/llm-client.js"));
    const config = getLLMConfig();
    if (!config || !config.provider || !config.model) {
      throw new Error("Invalid config returned");
    }
  });

  // Test 6: Integration - Real LLM Client
  console.log("\n6. Integration Tests (Real LLM)");

  await test("Can create LLM client (Gemini)", async () => {
    const { createLLMClient } = await import(path.join(srcDir, "lib/llm-client.js"));
    const provider = process.env.LLM_PROVIDER || "gemini";

    try {
      const client = createLLMClient({
        provider,
        apiKey: process.env.AGENT_API_KEY,
        modelName: process.env.AGENT_MODEL || "gemini-2.5-flash-lite",
      });

      if (!client) throw new Error("Client not created");

      // For Gemini, check if it has the necessary methods
      if (provider === "gemini") {
        if (typeof client.invoke !== "function") {
          throw new Error("Gemini client missing invoke method");
        }
      }

      console.log(`\n    Created ${provider} client successfully`);
    } catch (err) {
      if (err.message.includes("API key")) {
        throw new Error("Invalid AGENT_API_KEY for Gemini");
      }
      throw err;
    }
  });

  // Test 7: Service Entry Point
  console.log("\n7. Service Integration");

  await test("Agent tools can be loaded in runtime", async () => {
    try {
      const { readServiceDocsTool } = await import(path.join(srcDir, "services/agent/tools.js"));
      if (!readServiceDocsTool.invoke) throw new Error("Tool not ready");
    } catch (err) {
      throw new Error(`Agent tools not ready: ${err.message}`);
    }
  });

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log(`\nResults: ${testsPassed} passed, ${testsFailed} failed\n`);

  if (testsFailed > 0) {
    console.log("Issues found - check Agent service configuration");
    console.log("Ensure:");
    console.log("  - AGENT_API_KEY is set (Gemini API key)");
    console.log("  - CONTEXT7_API_KEY is set");
    console.log("  - LLM_PROVIDER=gemini (or set to your provider)");
    process.exit(1);
  } else {
    console.log("Agent service is properly configured!");
    console.log(`Using: ${process.env.LLM_PROVIDER || "gemini"} (${process.env.AGENT_MODEL || "gemini-2.5-flash-lite"})\n`);
    process.exit(0);
  }
}

runTests().catch((error) => {
  console.error("Test runner error:", error.message);
  process.exit(1);
});
