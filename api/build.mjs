// Build script for the Vercel API function.
// Bundles api-src/vercel.mjs and the entire api-server package into a single ESM file.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";

const apiDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.dirname(apiDir);
const entry = path.resolve(projectRoot, "api-src/vercel.mjs");
const output = path.resolve(apiDir, "index.js");

async function build() {
  console.log("Building Vercel API function...");

  try {
    await esbuild({
      entryPoints: [entry],
      bundle: true,
      platform: "node",
      format: "esm",
      target: "node22",
      outfile: output,
      external: ["pg-native"], // Keep native optional deps as external
      sourcemap: false,
      logLevel: "info",
      // Resolve workspace imports properly
      alias: {
        "@workspace/db": path.resolve(projectRoot, "lib/db/src/index.ts"),
        "@workspace/api-zod": path.resolve(projectRoot, "lib/api-zod/src/generated/api.ts"),
      },
      banner: {
        js: `import { createRequire as __req } from 'node:module';
import __path from 'node:path';
import __url from 'node:url';
globalThis.require = __req(import.meta.url);
globalThis.__filename = __url.fileURLToPath(import.meta.url);
globalThis.__dirname = __path.dirname(globalThis.__filename);
`,
      },
    });
    console.log("[ok] API function built to " + output);
  } catch (err) {
    console.error("Build failed:", err);
    process.exit(1);
  }
}

build();
