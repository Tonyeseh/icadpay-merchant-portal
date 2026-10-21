import { authFetch } from "@/lib/authFetch";
import { getApiUrl } from "@/lib/env";
import { parseOkJson } from "@/lib/api/json";
import type {
  AllKeysDto,
  CallbackUrlDto,
  CreateMerchantRequest,
  KeyPairDto,
  MerchantListItemDTO,
  UpdateWebhookRequest,
} from "@/types/merchantPortal";

const MERCHANTS_BASE = "/api/v1/merchants";

export async function createMerchant(body: CreateMerchantRequest): Promise<MerchantListItemDTO> {
  const res = await authFetch(getApiUrl(MERCHANTS_BASE), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseOkJson(res);
}

export async function getKeys(): Promise<AllKeysDto> {
  const res = await authFetch(getApiUrl("/api/v1/keys"));
  return parseOkJson(res);
}

export async function rotateLiveKeys(): Promise<KeyPairDto> {
  const res = await authFetch(getApiUrl("/api/v1/keys/live/new"), { method: "PATCH" });
  return parseOkJson(res);
}

export async function rotateTestKeys(): Promise<KeyPairDto> {
  const res = await authFetch(getApiUrl("/api/v1/keys/test/new"), { method: "PATCH" });
  return parseOkJson(res);
}

export async function getCallback(): Promise<CallbackUrlDto> {
  const res = await authFetch(getApiUrl("/api/v1/callback"));
  return parseOkJson(res);
}

export async function updateCallback(body: UpdateWebhookRequest): Promise<CallbackUrlDto> {
  const res = await authFetch(getApiUrl("/api/v1/callback"), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseOkJson(res);
}
