// Vercel serverless entrypoint — exports Express app directly.
// The api-server is built as a workspace package, and we import the app
// (not the server startup code).
import app from "../artifacts/api-server/src/vercel";

export default app;

// Extend the default timeout — Clerk token verification + Drizzle cold starts
// can nudge past 10s on the free plan on first request.
export const config = {
  maxDuration: 30,
};
