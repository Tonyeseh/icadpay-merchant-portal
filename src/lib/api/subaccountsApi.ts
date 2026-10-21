import { authFetch } from "@/lib/authFetch";
import { getApiUrl } from "@/lib/env";
import { parseOkJson } from "@/lib/api/json";
import type {
  CreateSubaccountRequest,
  SubaccountDto,
  UpdateSubaccountRequest,
} from "@/types/subaccounts";

const BASE = "/api/v1/merchant/subaccounts";

export async function listSubaccounts(): Promise<SubaccountDto[]> {
  const res = await authFetch(getApiUrl(BASE));
  return parseOkJson(res);
}

export async function getSubaccount(id: string): Promise<SubaccountDto> {
  const res = await authFetch(getApiUrl(`${BASE}/${encodeURIComponent(id)}`));
  return parseOkJson(res);
}

export async function createSubaccount(body: CreateSubaccountRequest): Promise<SubaccountDto> {
  const res = await authFetch(getApiUrl(BASE), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseOkJson(res);
}

export async function updateSubaccount(
  id: string,
  body: UpdateSubaccountRequest,
): Promise<SubaccountDto> {
  const res = await authFetch(getApiUrl(`${BASE}/${encodeURIComponent(id)}`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseOkJson(res);
}

export async function deleteSubaccount(id: string): Promise<void> {
  const res = await authFetch(getApiUrl(`${BASE}/${encodeURIComponent(id)}`), { method: "DELETE" });
  if (res.status === 204) return;
  await parseOkJson(res);
}
