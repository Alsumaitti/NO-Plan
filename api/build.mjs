// Build script for the Vercel API function.
// Bundles artifacts/api-server/src/vercel.ts + all deps into api/index.js,
// so Vercel's Node runtime can load it directly without a TypeScript compile.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";

const apiDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.dirname(apiDir);
const entry = path.resolve(
  projectRoot,
  "artifacts/api-server/src/vercel.ts",
);

async function build() {
  console.log("Building Vercel API function...");

  await esbuild({
    entryPoints: [entry],
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node22",
    outfile: path.resolve(apiDir, "index.js"),
    // pg has a native optional addon; Vercel installs deps so keep as external.
    external: ["pg-native"],
    sourcemap: false,
    logLevel: "info",
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

  console.log("[ok] API function built to api/index.js");
}

build().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
