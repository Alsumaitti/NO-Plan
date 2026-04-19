import { useAuth } from "@clerk/react";
import { useCallback } from "react";

export type AuthFetch = (url: string, options?: RequestInit) => Promise<Response>;

export function useAuthFetch(): AuthFetch {
  const { getToken } = useAuth();

  return useCallback(async (url: string, options?: RequestInit) => {
    const token = await getToken();
    const headers = new Headers(options?.headers || {});
    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (options?.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    return fetch(url, { ...options, headers });
  }, [getToken]);
}

export function useApi() {
  const authFetch = useAuthFetch();

  const get = useCallback(async <T = unknown>(url: string): Promise<T> => {
    const r = await authFetch(url);
    if (!r.ok) throw new Error(`API ${r.status}: ${r.statusText}`);
    return r.json();
  }, [authFetch]);

  const send = useCallback(async <T = unknown>(
    url: string,
    method: "POST" | "PUT" | "PATCH" | "DELETE",
    body?: unknown,
  ): Promise<T> => {
    const r = await authFetch(url, {
      method,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!r.ok) throw new Error(`API ${r.status}: ${r.statusText}`);
    if (r.status === 204) return undefined as T;
    const text = await r.text();
    return text ? JSON.parse(text) : (undefined as T);
  }, [authFetch]);

  return { authFetch, get, post: <T = unknown>(url: string, body?: unknown) => send<T>(url, "POST", body), put: <T = unknown>(url: string, body?: unknown) => send<T>(url, "PUT", body), patch: <T = unknown>(url: string, body?: unknown) => send<T>(url, "PATCH", body), del: <T = unknown>(url: string, body?: unknown) => send<T>(url, "DELETE", body) };
}

export function useAuthenticatedFetch(): AuthFetch {
  return useAuthFetch();
}
