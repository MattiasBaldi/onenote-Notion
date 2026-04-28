/**
 * Notion Service Tests - Vitest
 * Tests Notion SDK integration
 * Run: npm test -- notion.test.js
 */

import { describe, it, expect, beforeAll } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvFile } from "../src/services/onenote/auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, "../src");

describe("Notion Service", () => {
  beforeAll(async () => {
    await loadEnvFile();
  });

  describe("Authentication", () => {
    it("NOTION_TOKEN is set", () => {
      expect(process.env.NOTION_TOKEN).toBeDefined();
    });

    it("NOTION_TOKEN has valid length", () => {
      const token = process.env.NOTION_TOKEN;
      expect(token.length).toBeGreaterThanOrEqual(20);
    });

    it("NOTION_TOKEN starts with ntn_", () => {
      const token = process.env.NOTION_TOKEN;
      expect(token).toMatch(/^ntn_/);
    });
  });

  describe("Service Functions", () => {
    it("exports createNotionClient function", async () => {
      const { createNotionClient } = await import(path.join(srcDir, "services/notion/service.js"));
      expect(typeof createNotionClient).toBe("function");
    });

    it("can initialize Notion client", async () => {
      const { createNotionClient } = await import(path.join(srcDir, "services/notion/service.js"));
      const client = createNotionClient({
        auth: process.env.NOTION_TOKEN,
      });
      expect(client).toBeDefined();
      expect(client.pages).toBeDefined();
    });

    it("exports search function", async () => {
      const { search } = await import(path.join(srcDir, "services/notion/service.js"));
      expect(typeof search).toBe("function");
    });

    it("exports getPage function", async () => {
      const { getPage } = await import(path.join(srcDir, "services/notion/service.js"));
      expect(typeof getPage).toBe("function");
    });

    it("exports createPage function", async () => {
      const { createPage } = await import(path.join(srcDir, "services/notion/service.js"));
      expect(typeof createPage).toBe("function");
    });

    it("exports updatePage function", async () => {
      const { updatePage } = await import(path.join(srcDir, "services/notion/service.js"));
      expect(typeof updatePage).toBe("function");
    });

    it("exports getPageMarkdown function", async () => {
      const { getPageMarkdown } = await import(path.join(srcDir, "services/notion/service.js"));
      expect(typeof getPageMarkdown).toBe("function");
    });
  });

  describe("Block Operations", () => {
    it("exports listBlockChildren function", async () => {
      const { listBlockChildren } = await import(path.join(srcDir, "services/notion/service.js"));
      expect(typeof listBlockChildren).toBe("function");
    });

    it("exports appendBlockChildren function", async () => {
      const { appendBlockChildren } = await import(path.join(srcDir, "services/notion/service.js"));
      expect(typeof appendBlockChildren).toBe("function");
    });
  });

  describe("Page Operations", () => {
    it("exports trashPage function", async () => {
      const { trashPage } = await import(path.join(srcDir, "services/notion/service.js"));
      expect(typeof trashPage).toBe("function");
    });

    it("exports restorePage function", async () => {
      const { restorePage } = await import(path.join(srcDir, "services/notion/service.js"));
      expect(typeof restorePage).toBe("function");
    });

    it("exports updatePageMarkdown function", async () => {
      const { updatePageMarkdown } = await import(path.join(srcDir, "services/notion/service.js"));
      expect(typeof updatePageMarkdown).toBe("function");
    });
  });

  describe("Integration Tests", () => {
    it("can authenticate with Notion API", async () => {
      const { createNotionClient } = await import(path.join(srcDir, "services/notion/service.js"));

      const client = createNotionClient({
        auth: process.env.NOTION_TOKEN,
      });

      const result = await client.search({
        query: "test",
        page_size: 1,
      });

      expect(result).toBeDefined();
    });
  });

  describe("Service Entry Point", () => {
    it("exports run function from index", async () => {
      const { run } = await import(path.join(srcDir, "services/notion/index.js"));
      expect(typeof run).toBe("function");
    });
  });
});
