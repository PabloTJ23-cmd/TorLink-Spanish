import os from "node:os";
import path from "node:path";
import { defineConfig } from "vitest/config";

// Keep tests off the real user data dir: redirect all persisted state (queue /
// history / seeds / config) into a temp folder via the TORLINK_STATE_DIR
// override that src/config/paths.ts honors. Applied before test modules import
// paths.ts, so every write during a run lands here instead.
export default defineConfig({
  test: {
    env: {
      TORLINK_STATE_DIR: path.join(os.tmpdir(), "torlink-test-state"),
    },
    // Redirects webrtc-polyfill to the inert stub when the node-datachannel
    // native binary is missing (npm 12 skips install scripts by default), so
    // suites that import webtorrent run on TCP/uTP and DHT alone. See
    // scripts/webrtc-vitest-setup.mjs.
    setupFiles: ["./scripts/webrtc-vitest-setup.mjs"],
  },
});
