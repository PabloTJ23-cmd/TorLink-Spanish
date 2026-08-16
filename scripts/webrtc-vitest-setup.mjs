// Vitest worker equivalent of scripts/webrtc-preload.mjs. Runs before any test
// module imports webtorrent (externalized, loaded through Node's native ESM
// loader in the worker), so the webrtc-polyfill -> webrtc-stub.mjs redirect
// applies and the missing node-datachannel binary cannot kill the suite.

import { registerHooks } from "node:module";
import { pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

try {
  await import("node-datachannel");
} catch {
  const stubUrl = pathToFileURL(
    join(dirname(fileURLToPath(import.meta.url)), "webrtc-stub.mjs"),
  ).href;
  registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier === "webrtc-polyfill") {
        return { url: stubUrl, shortCircuit: true };
      }
      return nextResolve(specifier, context);
    },
  });
}
