import { AuthApiError } from "@/types/auth";

export const PERMISSIONS = {
  "onboarding.view": "onboarding.view",
  "onboarding.edit": "onboarding.edit",
  "documents.view": "documents.view",
  "team.view": "team.view",
  "team.invite": "team.invite",
  "team.remove": "team.remove",
  "team.manage_roles": "team.manage_roles",
  "roles.view": "roles.view",
  "roles.create": "roles.create",
  "roles.update": "roles.update",
  "settings.view": "settings.view",
  "settings.update": "settings.update",
  "settlement_bank_account.view": "settlement_bank_account.view",
  "settlement_bank_account.update": "settlement_bank_account.update",
  "subaccounts.view": "subaccounts.view",
  "subaccounts.create": "subaccounts.create",
  "subaccounts.update": "subaccounts.update",
  "subaccounts.delete": "subaccounts.delete",
  "transactions.view": "transactions.view",
  "developer.view_keys": "developer.view_keys",
  "developer.rotate_keys": "developer.rotate_keys",
  "developer.manage_callback": "developer.manage_callback",
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

function decodeBase64Url(segment: string): string {
  const b64 = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function onlyStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

/** Read the `permissions` claim from a merchant access token. Missing or malformed tokens yield []. */
export function decodeAccessTokenPermissions(token: string | null): string[] {
  if (!token) return [];
  const segment = token.split(".")[1];
  if (!segment) return [];
  try {
    const payload = JSON.parse(decodeBase64Url(segment)) as unknown;
    if (!payload || typeof payload !== "object") return [];
    const raw = (payload as { permissions?: unknown }).permissions;
    if (typeof raw === "string") {
      try {
        return onlyStrings(JSON.parse(raw) as unknown);
      } catch {
        return [];
      }
    }
    return onlyStrings(raw);
  } catch {
    return [];
  }
}

export function hasPermission(permissions: readonly string[], code: string): boolean {
  return permissions.includes(code);
}

export function hasAny(permissions: readonly string[], codes: readonly string[]): boolean {
  return codes.some((code) => permissions.includes(code));
}

export function hasAll(permissions: readonly string[], codes: readonly string[]): boolean {
  return codes.every((code) => permissions.includes(code));
}

export function isForbidden(err: unknown): boolean {
  return err instanceof AuthApiError && err.status === 403;
}
