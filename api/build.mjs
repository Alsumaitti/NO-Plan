// Build script for the Vercel API function
// Bundles api/index.ts and all dependencies into api/index.js
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";

const apiDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.dirname(apiDir);

async function build() {
  console.log("Building Vercel API function...");

  await esbuild({
    entryPoints: [path.resolve(apiDir, "index.ts")],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile: path.resolve(apiDir, "index.js"),
    external: ["pg", "crypto", "stream", "http", "https", "url", "zlib"],
    sourcemap: false,
    logLevel: "info",
    banner: {
      js: `import { createRequire as __req } from 'node:module';
import __path from 'node:path';
import __url from 'node:url';
globalThis.require = __req(import.meta.url);
globalThis.__filename = __url.fileURLToPath(import.meta.url);
globalThis.__dirname = __path.dirname(__filename);
`,
    },
  });

  console.log("✓ API function built to api/index.js");
}

build().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
