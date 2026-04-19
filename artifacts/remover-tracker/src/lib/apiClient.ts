import { useAuth } from "@clerk/react";

/**
 * Create an authenticated fetch function that includes Clerk's session token.
 * This must be called within a component (inside ClerkProvider) to access useAuth.
 */
export function useAuthenticatedFetch() {
  const { getToken } = useAuth();

  return async (url: string, options?: RequestInit) => {
    const token = await getToken();
    const headers = new Headers(options?.headers || {});

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    return fetch(url, { ...options, headers });
  };
}

/**
 * Wrapper for making authenticated API calls that handles the response.
 * Rejects with Error if response is not ok, otherwise returns JSON.
 */
export async function apiFetch(
  fetcher: (url: string, options?: RequestInit) => Promise<Response>,
  url: string,
  options?: RequestInit,
) {
  const response = await fetcher(url, options);
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}
