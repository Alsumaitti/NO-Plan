// Build script for the Vercel API function.
// Simply copies the vercel.mjs entry point to api/index.js.
// Vercel's @vercel/node runtime loads it directly.
import { copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const apiDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.dirname(apiDir);
const entry = path.resolve(projectRoot, "api-src/vercel.mjs");
const output = path.resolve(apiDir, "index.js");

async function build() {
  console.log("Building Vercel API function...");

  try {
    await copyFile(entry, output);
    console.log("[ok] API function copied to api/index.js");
  } catch (err) {
    console.error("Build failed:", err);
    process.exit(1);
  }
}

build();
