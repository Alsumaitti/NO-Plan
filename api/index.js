// Vercel Function entrypoint
// Uses dynamic import to resolve the app from the workspace without bundling.

// This creates an async IIFE to import the app at module load time
let appPromise = import("../artifacts/api-server/_src/app.js").then(m => m.default);

export default async function handler(req, res) {
  const app = await appPromise;
  return app(req, res);
}

// Extend the default timeout — Clerk token verification + Drizzle cold starts
// can nudge past 10s on the free plan on first request.
export const config = {
  maxDuration: 30,
};
