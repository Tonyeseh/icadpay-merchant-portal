import { authFetch } from "@/lib/authFetch";
import { getApiUrl } from "@/lib/env";
import { parseOkJson } from "@/lib/api/json";
import { throwFromResponse } from "@/lib/auth/merchantAuthApi";

const BASE = "/api/v1/merchant/settings";
const DOCUMENT_FILE_NOT_FOUND_CODE = "document.file_not_found";

export interface MerchantSettingsProfileDto {
  id: string;
  displayName: string;
  status: string;
  businessType: string;
  onboardingStatus: string;
  industryType: string | null;
  companyType: string | null;
  phoneNumber: string | null;
  emailAddress: string | null;
  supportEmailAddress: string | null;
  tradingName: string | null;
  website: string | null;
  registeredAddress: string | null;
  address: string | null;
  logoUrl: string | null;
  createdAtUtc: string;
  updatedAtUtc: string | null;
}

export interface PatchMerchantSettingsProfileRequest {
  displayName?: string;
  phoneNumber?: string;
  emailAddress?: string;
  supportEmailAddress?: string;
  website?: string;
  address?: string;
}

async function logoBlobFromResponse(res: Response): Promise<Blob | null> {
  if (!res.ok) {
    if (res.status === 404) {
      const text = await res.clone().text();
      try {
        const body: unknown = text ? JSON.parse(text) : null;
        if (
          body &&
          typeof body === "object" &&
          "code" in body &&
          (body as { code?: unknown }).code === DOCUMENT_FILE_NOT_FOUND_CODE
        ) {
          return null;
        }
      } catch {
        // Not the empty-logo 404. Fall through and throw the response as usual.
      }
    }
    await throwFromResponse(res);
  }
  return res.blob();
}

export async function getProfile(): Promise<MerchantSettingsProfileDto> {
  const res = await authFetch(getApiUrl(`${BASE}/profile`));
  return parseOkJson(res);
}

export async function patchProfile(
  body: PatchMerchantSettingsProfileRequest,
): Promise<MerchantSettingsProfileDto> {
  const res = await authFetch(getApiUrl(`${BASE}/profile`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseOkJson(res);
}

export async function getLogo(): Promise<Blob | null> {
  const res = await authFetch(getApiUrl(`${BASE}/profile/logo`));
  return logoBlobFromResponse(res);
}

export async function uploadLogo(file: File): Promise<void> {
  const form = new FormData();
  form.append("Logo", file, file.name);
  const res = await authFetch(getApiUrl(`${BASE}/profile/logo`), {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    await throwFromResponse(res);
  }
}

export async function switchToLive(): Promise<void> {
  const res = await authFetch(getApiUrl(`${BASE}/switch-to-live`), {
    method: "POST",
  });
  if (!res.ok) {
    await throwFromResponse(res);
  }
}

export async function switchToTest(): Promise<void> {
  const res = await authFetch(getApiUrl(`${BASE}/switch-to-test`), {
    method: "POST",
  });
  if (!res.ok) {
    await throwFromResponse(res);
  }
}
