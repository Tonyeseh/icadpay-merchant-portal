import { authFetch } from "@/lib/authFetch";
import { getApiUrl } from "@/lib/env";
import { parseOkJson } from "@/lib/api/json";
import type { PaginatedResult } from "@/lib/api/pagination";

const BASE = "/api/v1/merchant/payouts";

export interface PayoutItemDto {
  id: string;
  beneficiaryType: string;
  beneficiaryId: string;
  beneficiaryName: string | null;
  bankName: string | null;
  accountNumber: string | null;
  amountMinor: number;
  currency: string;
  status: string;
  reference: string | null;
  createdAtUtc: string;
}

export interface PayoutLedgerEntryDto {
  id: string;
  entryType: string;
  amountMinor: number;
  currency: string;
  sourceType: string;
  sourceId: string;
  createdAtUtc: string;
}

export interface PayoutDetailDto extends PayoutItemDto {
  ledgerEntries: PayoutLedgerEntryDto[];
}

export interface ListPayoutsParams {
  pageNumber?: number;
  pageSize?: number;
  status?: string;
  beneficiaryType?: string;
  dateFromUtc?: string;
  dateToUtc?: string;
}

export async function listPayouts(
  params: ListPayoutsParams = {},
): Promise<PaginatedResult<PayoutItemDto>> {
  const qs = new URLSearchParams();
  if (params.pageNumber != null) qs.set("page_number", String(params.pageNumber));
  if (params.pageSize != null) qs.set("page_size", String(params.pageSize));
  if (params.status) qs.set("status", params.status);
  if (params.beneficiaryType) qs.set("beneficiary_type", params.beneficiaryType);
  if (params.dateFromUtc) qs.set("date_from", params.dateFromUtc);
  if (params.dateToUtc) qs.set("date_to", params.dateToUtc);

  const url = qs.size ? `${BASE}?${qs.toString()}` : BASE;
  const res = await authFetch(getApiUrl(url));
  return parseOkJson(res);
}

export async function getPayout(id: string): Promise<PayoutDetailDto> {
  const res = await authFetch(getApiUrl(`${BASE}/${encodeURIComponent(id)}`));
  return parseOkJson(res);
}
