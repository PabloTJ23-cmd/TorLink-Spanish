// Dev-mode fallback for the WebRTC native stack, mirroring scripts/cli-entry.cjs.
//
// `npm run dev` runs tsx against src/index.tsx directly, so the redirect hooks
// that dist/cli.cjs registers are never installed: webtorrent -> simple-peer ->
// webrtc-polyfill -> node-datachannel then kills startup with "Cannot find
// module .../node_datachannel.node" whenever the native binary is missing
// (npm 12 skips install scripts by default, and on Windows the C++ build
// tools are frequently absent).
//
// Loaded via `tsx --import ./scripts/webrtc-preload.mjs`, this registers the
// same webrtc-polyfill -> webrtc-stub.mjs redirect before any app module runs.
// With RTCPeerConnection undefined, simple-peer computes WEBRTC_SUPPORT =
// false and the swarm runs on TCP/uTP and DHT peers alone.

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
  process.stderr.write(
    "torlnk: WebRTC peers unavailable (native module not installed); TCP/UDP peers still work. https://github.com/baairon/torlink/issues/60\n",
  );
}
