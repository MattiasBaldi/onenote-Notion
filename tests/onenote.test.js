/**
 * OneNote Service Tests - Vitest
 * Tests Microsoft Graph API integration
 * Run: npm test -- onenote.test.js
 */

import { describe, it, expect, beforeAll } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvFile } from "../src/services/onenote/auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, "../src");

describe("OneNote Service", () => {
  beforeAll(async () => {
    await loadEnvFile();
  });

  describe("Authentication", () => {
    it("ONENOTE_CLIENT_ID is set", () => {
      expect(process.env.ONENOTE_CLIENT_ID).toBeDefined();
    });

    it("ONENOTE_CLIENT_ID has valid format", () => {
      const id = process.env.ONENOTE_CLIENT_ID;
      expect(id.length).toBeGreaterThanOrEqual(10);
    });
  });

  describe("Module Exports", () => {
    it("exports listNotebooks function", async () => {
      const { listNotebooks } = await import(path.join(srcDir, "services/onenote/graph.js"));
      expect(typeof listNotebooks).toBe("function");
    });

    it("exports listNotebookSections function", async () => {
      const { listNotebookSections } = await import(path.join(srcDir, "services/onenote/graph.js"));
      expect(typeof listNotebookSections).toBe("function");
    });

    it("exports listSectionPages function", async () => {
      const { listSectionPages } = await import(path.join(srcDir, "services/onenote/graph.js"));
      expect(typeof listSectionPages).toBe("function");
    });

    it("exports getPageContent function", async () => {
      const { getPageContent } = await import(path.join(srcDir, "services/onenote/graph.js"));
      expect(typeof getPageContent).toBe("function");
    });
  });

  describe("Auth Functions", () => {
    it("exports getAccessToken function", async () => {
      const { getAccessToken } = await import(path.join(srcDir, "services/onenote/auth.js"));
      expect(typeof getAccessToken).toBe("function");
    });

    it("exports loadEnvFile function", async () => {
      const { loadEnvFile } = await import(path.join(srcDir, "services/onenote/auth.js"));
      expect(typeof loadEnvFile).toBe("function");
    });
  });

  describe("Output Functions", () => {
    it("loads output formatters", async () => {
      const output = await import(path.join(srcDir, "services/onenote/output.js"));
      expect(output).toBeDefined();
    });
  });

  describe("Integration Tests", () => {
    it.skipIf(!process.env.ONENOTE_ACCESS_TOKEN)("can list notebooks (requires cached session)", async () => {
      const { listNotebooks } = await import(path.join(srcDir, "services/onenote/graph.js"));
      const { getAccessToken } = await import(path.join(srcDir, "services/onenote/auth.js"));

      // Pass the token directly if available
      const token = process.env.ONENOTE_ACCESS_TOKEN;
      const notebooks = await listNotebooks(token);
      expect(Array.isArray(notebooks)).toBe(true);
    });
  });

  describe("Service Entry Point", () => {
    it("exports run function from index", async () => {
      const { run } = await import(path.join(srcDir, "services/onenote/index.js"));
      expect(typeof run).toBe("function");
    });
  });
});
