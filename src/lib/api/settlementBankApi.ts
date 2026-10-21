import { authFetch } from "@/lib/authFetch";
import { getApiUrl } from "@/lib/env";
import { parseOkJson } from "@/lib/api/json";
import { AuthApiError } from "@/types/auth";

const BASE = "/api/v1/merchant/settlement-bank-account";
const NOT_FOUND_CODE = "merchant_bank_accounts.not_found";

export interface SettlementBankAccountDto {
  id: string;
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  verified: boolean;
  isPrimary: boolean;
  createdAtUtc: string;
}

export interface UpdateSettlementBankAccountRequest {
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
}

function isMissingSettlementAccount(err: unknown): boolean {
  return err instanceof AuthApiError && err.status === 404 && err.code === NOT_FOUND_CODE;
}

async function readSettlementAccount(path: string): Promise<SettlementBankAccountDto | null> {
  try {
    const res = await authFetch(getApiUrl(path));
    return await parseOkJson<SettlementBankAccountDto>(res);
  } catch (err) {
    if (isMissingSettlementAccount(err)) return null;
    throw err;
  }
}

export function getSettlementBankAccount(): Promise<SettlementBankAccountDto | null> {
  return readSettlementAccount(BASE);
}

export function getPendingSettlementBankAccount(): Promise<SettlementBankAccountDto | null> {
  return readSettlementAccount(`${BASE}/pending`);
}

export async function updateSettlementBankAccount(
  body: UpdateSettlementBankAccountRequest,
): Promise<SettlementBankAccountDto> {
  const res = await authFetch(getApiUrl(BASE), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseOkJson(res);
}
