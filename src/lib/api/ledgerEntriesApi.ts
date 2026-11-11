import { authFetch } from "@/lib/authFetch";
import { getApiUrl } from "@/lib/env";
import { parseOkJson } from "@/lib/api/json";
import type { PaginatedResult } from "@/lib/api/pagination";

const BASE = "/api/v1/merchant/ledger-entries";

export interface MerchantLedgerEntryItemDto {
  id: string;
  beneficiaryType: string;
  beneficiaryId: string;
  entryType: string;
  amountMinor: number;
  currency: string;
  sourceType: string;
  sourceId: string;
  payoutId: string | null;
  createdAtUtc: string;
}

export interface ListLedgerEntriesParams {
  pageNumber?: number;
  pageSize?: number;
  entryType?: string;
  beneficiaryType?: string;
  settled?: boolean;
  dateFromUtc?: string;
  dateToUtc?: string;
}

export async function listLedgerEntries(
  params: ListLedgerEntriesParams = {},
): Promise<PaginatedResult<MerchantLedgerEntryItemDto>> {
  const qs = new URLSearchParams();
  if (params.pageNumber != null) qs.set("page_number", String(params.pageNumber));
  if (params.pageSize != null) qs.set("page_size", String(params.pageSize));
  if (params.entryType) qs.set("entry_type", params.entryType);
  if (params.beneficiaryType) qs.set("beneficiary_type", params.beneficiaryType);
  if (params.settled != null) qs.set("settled", String(params.settled));
  if (params.dateFromUtc) qs.set("date_from", params.dateFromUtc);
  if (params.dateToUtc) qs.set("date_to", params.dateToUtc);

  const url = qs.size ? `${BASE}?${qs.toString()}` : BASE;
  const res = await authFetch(getApiUrl(url));
  return parseOkJson(res);
}
