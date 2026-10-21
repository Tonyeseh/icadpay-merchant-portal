/** Base URL for API requests (no trailing slash). Empty = same origin as the SPA. */
export function getApiOrigin(): string {
  const base = import.meta.env.VITE_API_BASE_URL;
  if (typeof base === "string" && base.length > 0) {
    return base.replace(/\/$/, "");
  }
  return "";
}

/** Absolute URL for an API path starting with `/api` or `/...`. */
export function getApiUrl(path: string): string {
  const origin = getApiOrigin();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${origin}${p}`;
}

/** Public URL to merchant terms (PDF or web page). Empty if not configured. */
export function getMerchantTermsUrl(): string | null {
  const raw = import.meta.env.VITE_MERCHANT_TERMS_URL;
  if (typeof raw !== "string") return null;
  const t = raw.trim();
  return t.length > 0 ? t : null;
}
