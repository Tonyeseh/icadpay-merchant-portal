import { authFetch } from "@/lib/authFetch";
import { getApiUrl } from "@/lib/env";
import { parseOkJson } from "@/lib/api/json";

const BASE = "/api/v1/bank-verification";

export interface VerifyBankAccountRequest {
  bankCode: string;
  accountNumber: string;
}

export interface VerifyBankAccountResponse {
  accountName: string;
}

export async function verifyBankAccount(body: VerifyBankAccountRequest): Promise<VerifyBankAccountResponse> {
  const res = await authFetch(getApiUrl(BASE), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseOkJson(res);
}
