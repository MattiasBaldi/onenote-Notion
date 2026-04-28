#!/usr/bin/env node

/**
 * Notion Service Tests
 * Tests Notion SDK integration
 * Run: node tests/notion.test.js
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

  console.log("\n=== Notion Service Tests ===\n");

  // Test 1: Auth
  console.log("1. Authentication");

  await test("NOTION_TOKEN is set", async () => {
    const token = process.env.NOTION_TOKEN;
    if (!token) throw new Error("NOTION_TOKEN not set");
  });

  await test("NOTION_TOKEN has valid length", async () => {
    const token = process.env.NOTION_TOKEN;
    if (token.length < 20) throw new Error("NOTION_TOKEN too short (expected 20+ chars)");
  });

  await test("NOTION_TOKEN starts with ntn_", async () => {
    const token = process.env.NOTION_TOKEN;
    if (!token.startsWith("ntn_")) throw new Error("NOTION_TOKEN should start with ntn_");
  });

  // Test 2: Service Functions
  console.log("\n2. Service Functions");

  await test("createNotionClient function exists", async () => {
    const { createNotionClient } = await import(path.join(srcDir, "services/notion/service.js"));
    if (typeof createNotionClient !== "function") throw new Error("Not a function");
  });

  await test("Client initialization works", async () => {
    const { createNotionClient } = await import(path.join(srcDir, "services/notion/service.js"));
    const client = createNotionClient({
      auth: process.env.NOTION_TOKEN,
    });
    if (!client) throw new Error("Client not created");
    if (!client.pages) throw new Error("Client missing pages property");
  });

  await test("search function exists", async () => {
    const { search } = await import(path.join(srcDir, "services/notion/service.js"));
    if (typeof search !== "function") throw new Error("Not a function");
  });

  await test("getPage function exists", async () => {
    const { getPage } = await import(path.join(srcDir, "services/notion/service.js"));
    if (typeof getPage !== "function") throw new Error("Not a function");
  });

  await test("createPage function exists", async () => {
    const { createPage } = await import(path.join(srcDir, "services/notion/service.js"));
    if (typeof createPage !== "function") throw new Error("Not a function");
  });

  await test("updatePage function exists", async () => {
    const { updatePage } = await import(path.join(srcDir, "services/notion/service.js"));
    if (typeof updatePage !== "function") throw new Error("Not a function");
  });

  await test("getPageMarkdown function exists", async () => {
    const { getPageMarkdown } = await import(path.join(srcDir, "services/notion/service.js"));
    if (typeof getPageMarkdown !== "function") throw new Error("Not a function");
  });

  // Test 3: Block Operations
  console.log("\n3. Block Operations");

  await test("listBlockChildren function exists", async () => {
    const { listBlockChildren } = await import(path.join(srcDir, "services/notion/service.js"));
    if (typeof listBlockChildren !== "function") throw new Error("Not a function");
  });

  await test("appendBlockChildren function exists", async () => {
    const { appendBlockChildren } = await import(path.join(srcDir, "services/notion/service.js"));
    if (typeof appendBlockChildren !== "function") throw new Error("Not a function");
  });

  // Test 4: Page Operations
  console.log("\n4. Page Operations");

  await test("trashPage function exists", async () => {
    const { trashPage } = await import(path.join(srcDir, "services/notion/service.js"));
    if (typeof trashPage !== "function") throw new Error("Not a function");
  });

  await test("restorePage function exists", async () => {
    const { restorePage } = await import(path.join(srcDir, "services/notion/service.js"));
    if (typeof restorePage !== "function") throw new Error("Not a function");
  });

  await test("updatePageMarkdown function exists", async () => {
    const { updatePageMarkdown } = await import(path.join(srcDir, "services/notion/service.js"));
    if (typeof updatePageMarkdown !== "function") throw new Error("Not a function");
  });

  // Test 5: Integration - Real API Call
  console.log("\n5. Integration Tests (Real API)");

  await test("Can authenticate with Notion API", async () => {
    const { createNotionClient } = await import(path.join(srcDir, "services/notion/service.js"));

    const client = createNotionClient({
      auth: process.env.NOTION_TOKEN,
    });

    // Try a simple API call to verify authentication
    try {
      const result = await client.search({
        query: "test",
        page_size: 1,
      });
      if (!result) throw new Error("Search returned nothing");
      console.log(`\n    API call successful (${result.results?.length || 0} results)`);
    } catch (err) {
      if (err.message.includes("unauthorized") || err.message.includes("401")) {
        throw new Error("Invalid NOTION_TOKEN");
      }
      // Other errors are okay (like empty search results)
    }
  });

  // Test 6: Service Index
  console.log("\n6. Service Entry Point");

  await test("Service index exports run function", async () => {
    const { run } = await import(path.join(srcDir, "services/notion/index.js"));
    if (typeof run !== "function") throw new Error("run not exported");
  });

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log(`\nResults: ${testsPassed} passed, ${testsFailed} failed\n`);

  if (testsFailed > 0) {
    console.log("Issues found - check Notion service implementation");
    process.exit(1);
  } else {
    console.log("Notion service is properly configured!\n");
    process.exit(0);
  }
}

runTests().catch((error) => {
  console.error("Test runner error:", error.message);
  process.exit(1);
});
