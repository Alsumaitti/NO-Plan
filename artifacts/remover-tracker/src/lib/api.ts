/**
 * Returns the base URL for direct API calls (fetch, download links, etc.)
 * In development and production the API is served at /api relative to the app root.
 */
export function getApiUrl(): string {
  return "/api";
}
