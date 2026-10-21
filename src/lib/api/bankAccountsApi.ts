import { authFetch } from "@/lib/authFetch";
import { getApiUrl } from "@/lib/env";
import { parseOkJson } from "@/lib/api/json";

const BASE = "/api/v1/merchant/bank-accounts";

export interface BankAccountDto {
  id: string;
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  verified: boolean;
  isPrimary: boolean;
  createdAtUtc: string;
}

export interface CreateBankAccountRequest {
  bankCode: string;
  bankName: string;
  accountNumber: string;
}

export async function listBankAccounts(): Promise<BankAccountDto[]> {
  const res = await authFetch(getApiUrl(BASE));
  return parseOkJson(res);
}

export async function createBankAccount(body: CreateBankAccountRequest): Promise<BankAccountDto> {
  const res = await authFetch(getApiUrl(BASE), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseOkJson(res);
}

export async function setBankAccountPrimary(id: string): Promise<BankAccountDto> {
  const res = await authFetch(getApiUrl(`${BASE}/${encodeURIComponent(id)}/primary`), {
    method: "PATCH",
  });
  return parseOkJson(res);
}

export async function deleteBankAccount(id: string): Promise<void> {
  const res = await authFetch(getApiUrl(`${BASE}/${encodeURIComponent(id)}`), { method: "DELETE" });
  if (res.status === 204) return;
  // Any non-204 error is normalized by throwFromResponse in parseOkJson
  await parseOkJson(res);
}

