import { authFetch } from "@/lib/authFetch";
import { getApiUrl } from "@/lib/env";
import { parseOkJson } from "@/lib/api/json";

const BASE = "/api/v1/merchant/transactions";

export interface TransactionsPageDto<TItem> {
  items: TItem[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface TransactionListItemDto {
  id: string;
  channel: number;
  mode: "Test" | "Live" | string;
  providerCode: string | null;
  amountMinor: number;
  currency: string;
  status: string;
  reference: string;
  customerEmail: string | null;
  createdAtUtc: string;
}

export interface TransactionDetailDto {
  id: string;
  merchantId: string;
  createdByUserId: string | null;
  channel: number;
  mode: "Test" | "Live" | string;
  providerCode: string | null;
  amountMinor: number;
  currency: string;
  status: string;
  providerReference: string | null;
  reference: string;
  customerEmail: string | null;
  clientHintsJson: string | null;
  createdAtUtc: string;
  updatedAtUtc: string | null;
}

export interface ListTransactionsParams {
  page?: number;
  pageSize?: number;
  status?: string;
  channel?: number;
  mode?: "Test" | "Live";
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export async function listTransactions(
  params: ListTransactionsParams,
): Promise<TransactionsPageDto<TransactionListItemDto>> {
  const qs = new URLSearchParams();
  if (params.page != null) qs.set("page", String(params.page));
  if (params.pageSize != null) qs.set("page_size", String(params.pageSize));
  if (params.status) qs.set("status", params.status);
  if (params.channel != null) qs.set("channel", String(params.channel));
  if (params.mode) qs.set("mode", params.mode);
  if (params.dateFrom) qs.set("date_from", params.dateFrom);
  if (params.dateTo) qs.set("date_to", params.dateTo);
  if (params.search) qs.set("search", params.search);

  const url = qs.size ? `${BASE}?${qs.toString()}` : BASE;
  const res = await authFetch(getApiUrl(url));
  return parseOkJson(res);
}

export async function getTransaction(id: string): Promise<TransactionDetailDto> {
  const res = await authFetch(getApiUrl(`${BASE}/${encodeURIComponent(id)}`));
  return parseOkJson(res);
}

