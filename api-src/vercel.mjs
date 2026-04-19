// Vercel Function entrypoint — exports the Express app without listening.
// Bundled by api/build.mjs into api/index.js; Vercel's @vercel/node runtime
// calls the default export as a (req, res) handler.

import app from "../artifacts/api-server/_src/app";

export default app;

// Extend the default timeout — Clerk token verification + Drizzle cold starts
// can nudge past 10s on the free plan on first request.
export const config = {
  maxDuration: 30,
};
