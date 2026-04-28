#!/usr/bin/env node

/**
 * OneNote Service Tests
 * Tests Microsoft Graph API integration
 * Run: node tests/onenote.test.js
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

  console.log("\n=== OneNote Service Tests ===\n");

  // Test 1: Auth Setup
  console.log("1. Authentication");

  await test("ONENOTE_CLIENT_ID is set", async () => {
    if (!process.env.ONENOTE_CLIENT_ID) throw new Error("ONENOTE_CLIENT_ID not set");
  });

  await test("ONENOTE_CLIENT_ID has valid format", async () => {
    const id = process.env.ONENOTE_CLIENT_ID;
    if (id.length < 10) throw new Error("ONENOTE_CLIENT_ID too short");
    if (!id.includes("-") && !id.match(/[a-zA-Z0-9]+/)) throw new Error("Invalid format");
  });

  // Test 2: Module Imports
  console.log("\n2. Module Exports");

  await test("listNotebooks function exports", async () => {
    const { listNotebooks } = await import(path.join(srcDir, "services/onenote/graph.js"));
    if (typeof listNotebooks !== "function") throw new Error("Not a function");
  });

  await test("listNotebookSections function exports", async () => {
    const { listNotebookSections } = await import(path.join(srcDir, "services/onenote/graph.js"));
    if (typeof listNotebookSections !== "function") throw new Error("Not a function");
  });

  await test("listSectionPages function exports", async () => {
    const { listSectionPages } = await import(path.join(srcDir, "services/onenote/graph.js"));
    if (typeof listSectionPages !== "function") throw new Error("Not a function");
  });

  await test("getPageContent function exports", async () => {
    const { getPageContent } = await import(path.join(srcDir, "services/onenote/graph.js"));
    if (typeof getPageContent !== "function") throw new Error("Not a function");
  });

  // Test 3: Authentication Functions
  console.log("\n3. Auth Functions");

  await test("getAccessToken function exists", async () => {
    const { getAccessToken } = await import(path.join(srcDir, "services/onenote/auth.js"));
    if (typeof getAccessToken !== "function") throw new Error("Not a function");
  });

  await test("loadEnvFile function exists", async () => {
    const { loadEnvFile } = await import(path.join(srcDir, "services/onenote/auth.js"));
    if (typeof loadEnvFile !== "function") throw new Error("Not a function");
  });

  // Test 4: Output Formatting
  console.log("\n4. Output Functions");

  await test("Output formatters exist", async () => {
    const output = await import(path.join(srcDir, "services/onenote/output.js"));
    if (!output) throw new Error("Output module not loaded");
  });

  // Test 5: Integration - Real API Call
  console.log("\n5. Integration Tests (Real API)");

  await test("Can list notebooks (requires valid session)", async () => {
    const { listNotebooks } = await import(path.join(srcDir, "services/onenote/graph.js"));
    const { getAccessToken } = await import(path.join(srcDir, "services/onenote/auth.js"));

    try {
      const result = await getAccessToken();

      // Check if it's an error result from device code flow
      if (result && result.error) {
        throw new Error(`Login required - run 'o2n auth login' first (${result.error})`);
      }

      // If no result or no token, skip this integration test
      if (!result) {
        throw new Error("No cached session - run 'o2n auth login' first");
      }

      const notebooks = await listNotebooks(result);
      if (!Array.isArray(notebooks)) throw new Error("Notebooks not returned as array");

      console.log(`\n    Found ${notebooks.length} notebooks`);
    } catch (err) {
      // Access token might not be cached yet (requires manual login)
      if (
        err.message.includes("deviceCodeExpired") ||
        err.message.includes("AADSTS") ||
        err.message.includes("Login required") ||
        err.message.includes("No cached session")
      ) {
        throw new Error("Session required - run 'o2n auth login' first");
      }
      throw err;
    }
  });

  // Test 6: Service Index
  console.log("\n6. Service Entry Point");

  await test("Service index exports run function", async () => {
    const { run } = await import(path.join(srcDir, "services/onenote/index.js"));
    if (typeof run !== "function") throw new Error("run not exported");
  });

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log(`\nResults: ${testsPassed} passed, ${testsFailed} failed\n`);

  if (testsFailed > 0) {
    console.log("Issues found - check OneNote service implementation");
    process.exit(1);
  } else {
    console.log("OneNote service is properly configured!\n");
    process.exit(0);
  }
}

runTests().catch((error) => {
  console.error("Test runner error:", error.message);
  process.exit(1);
});
