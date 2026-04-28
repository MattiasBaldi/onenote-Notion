import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Use Node.js environment (no browser/DOM)
    environment: "node",

    // Global test functions (no need to import describe, test, expect)
    globals: true,

    // Show coverage reports
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", "tests/"],
    },

    // Timeout for integration tests
    testTimeout: 30000,

    // File patterns
    include: ["tests/**/*.test.js"],
    exclude: ["node_modules", ".git"],
  },
});
