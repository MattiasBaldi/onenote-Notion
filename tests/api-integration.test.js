#!/usr/bin/env node

/**
 * Integration tests for OneNote, Notion, and Agent API layers
 * Run: node tests/api-integration.test.js
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvFile } from "../src/services/onenote/auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, "../src");

// Test utilities
let testsPassed = 0;
let testsFailed = 0;

async function test(name, fn) {
  console.log(`\n  Testing: ${name}`);
  try {
    await fn();
    console.log(`    ✓ PASS`);
    testsPassed++;
  } catch (error) {
    console.log(`    ✗ FAIL: ${error.message}`);
    testsFailed++;
  }
}

// Main test runner
async function runTests() {
  await loadEnvFile();

  console.log("\n=== API Integration Tests ===\n");

  // Test 1: Notion API Layer
  console.log("1. NOTION API LAYER");

  await test("Notion client initialization with auth token", async () => {
    const { createNotionClient } = await import(path.join(srcDir, "services/notion/service.js"));
    const client = createNotionClient({
      auth: process.env.NOTION_TOKEN,
    });
    if (!client) throw new Error("Client not initialized");
  });

  await test("Notion token validation", async () => {
    const token = process.env.NOTION_TOKEN;
    if (!token) throw new Error("NOTION_TOKEN not set in environment");
    if (token.length < 10) throw new Error("NOTION_TOKEN appears invalid (too short)");
  });

  // Test 2: OneNote API Layer
  console.log("\n2. ONENOTE API LAYER");

  await test("OneNote auth configuration", async () => {
    const clientId = process.env.ONENOTE_CLIENT_ID;
    if (!clientId) throw new Error("ONENOTE_CLIENT_ID not set");
    if (clientId.length < 10) throw new Error("ONENOTE_CLIENT_ID appears invalid (too short)");
  });

  await test("OneNote Graph API imports", async () => {
    const { listNotebooks } = await import(path.join(srcDir, "services/onenote/graph.js"));
    if (typeof listNotebooks !== "function") throw new Error("listNotebooks not exported");
  });

  // Test 3: Agent / LangChain Layer
  console.log("\n3. AGENT LAYER (LangChain + Context7)");

  await test("Agent tools import", async () => {
    const { readServiceDocsTool } = await import(path.join(srcDir, "services/agent/tools.js"));
    if (!readServiceDocsTool) throw new Error("readServiceDocsTool not exported");
  });

  await test("Context7 API key validation", async () => {
    const key = process.env.CONTEXT7_API_KEY;
    if (!key) throw new Error("CONTEXT7_API_KEY not set (required for agent)");
    if (key.length < 5) throw new Error("CONTEXT7_API_KEY appears invalid");
  });

  await test("OpenAI API key validation", async () => {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("OPENAI_API_KEY not set (required for LLM)");
    if (key.length < 10) throw new Error("OPENAI_API_KEY appears invalid");
  });

  await test("Agent schemas validation", async () => {
    const { TranslationPlanSchema, TranslationInputSchema } = await import(
      path.join(srcDir, "services/agent/schemas.js")
    );
    if (!TranslationPlanSchema || !TranslationInputSchema) {
      throw new Error("Agent schemas not properly exported");
    }
  });

  // Test 4: Core Sync Engine
  console.log("\n4. CORE SYNC ENGINE");

  await test("Sync engine imports", async () => {
    const {
      loadSourceItemsOnly,
      buildSyncPlan,
      applySyncPlan,
    } = await import(path.join(srcDir, "core/engine.js"));
    if (typeof loadSourceItemsOnly !== "function") throw new Error("loadSourceItemsOnly not exported");
    if (typeof buildSyncPlan !== "function") throw new Error("buildSyncPlan not exported");
    if (typeof applySyncPlan !== "function") throw new Error("applySyncPlan not exported");
  });

  await test("Config loader", async () => {
    const { loadConfig } = await import(path.join(srcDir, "lib/config-loader.js"));
    const config = await loadConfig();
    if (!config) throw new Error("Config not loaded");
  });

  // Test 5: CLI Interface
  console.log("\n5. CLI INTERFACE");

  await test("CLI entry point exists", async () => {
    const { existsSync } = await import("node:fs");
    const cliPath = path.join(__dirname, "../cli.js");
    if (!existsSync(cliPath)) throw new Error("cli.js not found");
  });

  await test("Package.json bin config", async () => {
    const { readFileSync } = await import("node:fs");
    const pkgPath = path.join(__dirname, "../package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    if (!pkg.bin || !pkg.bin.o2n) throw new Error("o2n not configured in package.json");
  });

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log(`\nResults: ${testsPassed} passed, ${testsFailed} failed\n`);

  if (testsFailed > 0) {
    console.log("Issues found:");
    console.log("  - Ensure all .env variables are set:");
    console.log("    NOTION_TOKEN, ONENOTE_CLIENT_ID, OPENAI_API_KEY, CONTEXT7_API_KEY");
    console.log("  - Run: npm link");
    console.log("  - Check: which o2n");
    process.exit(1);
  } else {
    console.log("All systems operational!\n");
    process.exit(0);
  }
}

// Run tests
runTests().catch((error) => {
  console.error("Test runner error:", error.message);
  process.exit(1);
});
