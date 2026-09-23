import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // No passWithNoTests here — this package has tests and they must run.
    include: ["src/**/*.test.ts"],
  },
});
