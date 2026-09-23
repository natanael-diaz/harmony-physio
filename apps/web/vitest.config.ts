import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // passWithNoTests was true. On an authentication milestone that meant CI
    // stayed green whether or not a single auth test existed — if these files
    // were ever deleted or stopped matching, nothing would say so. Now that the
    // suite exists, an empty run is a failure.
    //
    // environment stays "node": every test here covers server-side logic
    // (callbacks, server actions, route policy). Component tests will need
    // jsdom and @testing-library/react, which is installed but unused.
  },
});
