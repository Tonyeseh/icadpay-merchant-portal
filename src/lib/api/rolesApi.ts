import { authFetch } from "@/lib/authFetch";
import { getApiUrl } from "@/lib/env";
import { parseOkJson } from "@/lib/api/json";
import type { MerchantRoleListItemDto } from "@/types/merchantPortal";
import type {
  CreateRoleBody,
  PatchRoleBody,
  Permission,
  Role,
  RolePage,
} from "@/types/roles";

const BASE = "/api/roles";

/** Assignment catalog for team invites. Not the roles-management list. */
export async function listRoles(): Promise<MerchantRoleListItemDto[]> {
  const res = await authFetch(getApiUrl(BASE));
  return parseOkJson(res);
}

export async function listPermissionCatalog(): Promise<Permission[]> {
  const res = await authFetch(getApiUrl(`${BASE}/permissions`));
  return parseOkJson(res);
}

export async function listManagedRoles(pageNumber: number, pageSize: number): Promise<RolePage> {
  const params = new URLSearchParams({
    pageNumber: String(pageNumber),
    pageSize: String(pageSize),
  });
  const res = await authFetch(getApiUrl(`${BASE}/manage?${params.toString()}`));
  return parseOkJson(res);
}

export async function getManagedRole(id: string): Promise<Role> {
  const res = await authFetch(getApiUrl(`${BASE}/manage/${encodeURIComponent(id)}`));
  return parseOkJson(res);
}

export async function createManagedRole(body: CreateRoleBody): Promise<Role> {
  const res = await authFetch(getApiUrl(`${BASE}/manage`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseOkJson(res);
}

export async function patchManagedRole(id: string, body: PatchRoleBody): Promise<void> {
  const res = await authFetch(getApiUrl(`${BASE}/manage/${encodeURIComponent(id)}`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  await parseOkJson(res);
}

export async function addManagedRolePermission(id: string, permissionId: string): Promise<void> {
  const res = await authFetch(
    getApiUrl(
      `${BASE}/manage/${encodeURIComponent(id)}/permissions/${encodeURIComponent(permissionId)}`,
    ),
    { method: "POST" },
  );
  await parseOkJson(res);
}

export async function removeManagedRolePermission(id: string, permissionId: string): Promise<void> {
  const res = await authFetch(
    getApiUrl(
      `${BASE}/manage/${encodeURIComponent(id)}/permissions/${encodeURIComponent(permissionId)}`,
    ),
    { method: "DELETE" },
  );
  await parseOkJson(res);
}

