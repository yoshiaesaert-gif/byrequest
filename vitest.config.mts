import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src"), "server-only": path.resolve(__dirname, "tests/server-only.ts") } },
  test: {
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL || "postgres://brq:brq@localhost:5432/byrequest_test",
      STORAGE_DIR: "./.test-storage", BRQ_PROVIDER_ENV: "test", BRQ_REVIEW_MODE: "human", SANDBOX_WEBHOOK_SECRET: "test-secret",
    },
    globalSetup: ["./tests/global-setup.ts"],
    fileParallelism: false,
  },
});
