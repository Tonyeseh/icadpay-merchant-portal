import { getStoredAccessToken } from "@/lib/auth/accessToken";
import { refresh } from "@/lib/auth/merchantAuthApi";
import { useAppStore } from "@/store/useAppStore";

/**
 * Authenticated fetch: sends credentials + Bearer access token, retries once after refresh on 401.
 */
export async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return doFetch(input, init, false);
}

async function doFetch(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  isRetry: boolean,
): Promise<Response> {
  const token = getStoredAccessToken();
  const headers = new Headers(init?.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(input, {
    ...init,
    credentials: "include",
    headers,
  });

  // 403 is a permission failure for the signed-in user. Return it to the caller; do not clear the session.
  if (res.status === 403) {
    return res;
  }

  if (res.status === 401 && !isRetry && token) {
    try {
      const session = await refresh(token);
      useAppStore.getState().applyAuthResponse(session);
      return doFetch(input, init, true);
    } catch {
      useAppStore.getState().clearSession();
    }
  }

  return res;
}
