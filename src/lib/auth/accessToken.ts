const SESSION_ACCESS_TOKEN_KEY = "icad_merchant_access_token";

/** Short-lived JWT for Authorization header; survives reload via sessionStorage. */
export function getStoredAccessToken(): string | null {
  try {
    return sessionStorage.getItem(SESSION_ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredAccessToken(token: string): void {
  try {
    sessionStorage.setItem(SESSION_ACCESS_TOKEN_KEY, token);
  } catch {
    // ignore quota / private mode
  }
}

export function clearStoredAccessToken(): void {
  try {
    sessionStorage.removeItem(SESSION_ACCESS_TOKEN_KEY);
  } catch {
    // ignore
  }
}
