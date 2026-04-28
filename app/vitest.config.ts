import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      // Next.js aliases this to a no-op at bundle time; Vitest needs the same.
      "server-only": path.resolve(__dirname, "src/test/server-only-shim.ts"),
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
    globals: false,
    include: ["src/**/*.test.ts"],
    setupFiles: ["src/test/msw-setup.ts"],
  },
});
