// Vercel serverless entrypoint — mounts the Express app behind /api/*.
// Catch-all rewrite in vercel.json sends every /api/* request here, and Express
// router handles dispatch based on app.use("/api", router).
import app from "../artifacts/api-server/src/app";

export default app;

// Extend the default timeout — Clerk token verification + Drizzle cold starts
// can nudge past 10s on the free plan on first request.
export const config = {
  maxDuration: 30,
};
