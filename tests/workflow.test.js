/**
 * Workflow Tests - Sync Stages
 * Light tests that verify the sync workflow stages exist and are callable
 * Run: npm test -- workflow.test.js
 */

import { describe, it, expect } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, "../src");

describe("Sync Workflow", () => {

  describe("Preview Stage", () => {
    it("core module exports loadSourceItemsOnly", async () => {
      const core = await import(path.join(srcDir, "core/index.js"));
      expect(typeof core.loadSourceItemsOnly).toBe("function");
    });
  });

  describe("Plan Stage", () => {
    it("core module exports buildSyncPlan", async () => {
      const core = await import(path.join(srcDir, "core/index.js"));
      expect(typeof core.buildSyncPlan).toBe("function");
    });
  });

  describe("Apply Stage", () => {
    it("core module exports applySyncPlan", async () => {
      const core = await import(path.join(srcDir, "core/index.js"));
      expect(typeof core.applySyncPlan).toBe("function");
    });
  });

  describe("Workflow Integration", () => {
    it("all three stages are available", async () => {
      const core = await import(path.join(srcDir, "core/index.js"));

      expect(typeof core.loadSourceItemsOnly).toBe("function");
      expect(typeof core.buildSyncPlan).toBe("function");
      expect(typeof core.applySyncPlan).toBe("function");
      expect(typeof core.run).toBe("function");
    });
  });

});
