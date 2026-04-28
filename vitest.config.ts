import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.test.js"],
    exclude: ["node_modules", ".git"],
    testTimeout: 60000, // Increased for integration tests
    hookTimeout: 60000,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", "tests/"],
    },
  },
  resolve: {
    conditions: ["node", "import"],
  },
  ssr: {
    external: ["langchain"],
  },
});
