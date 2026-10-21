import { authFetch } from "@/lib/authFetch";
import { getApiUrl } from "@/lib/env";
import { parseOkJson } from "@/lib/api/json";
import { throwFromResponse } from "@/lib/auth/merchantAuthApi";
import { AuthApiError } from "@/types/auth";
import { SETTLEMENT_ACCOUNT_NOT_FOUND_CODE } from "@/lib/onboardingErrors";
import type {
  AddOwnerRequest,
  AddSettlementAccountRequest,
  CompanyTypeListItemDto,
  DocumentTypeLookupItemDto,
  IndustryTypeListItemDto,
  OnboardingDocumentDto,
  OnboardingOwnerDto,
  OnboardingProfileDto,
  OnboardingRequirementsDto,
  OnboardingSettlementAccountDto,
  UpdateOnboardingProfileRequest,
  UpdateOwnerRequest,
} from "@/types/onboarding";

const ONBOARDING_BASE = "/api/v1/merchant/onboarding";
const LOOKUPS_BASE = "/api/v1/merchant/lookups";
const DOCUMENT_FILE_NOT_FOUND_CODE = "document.file_not_found";

async function storageKeyFromLogoResponse(res: Response): Promise<string> {
  const text = await res.text();
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.toLowerCase().includes("application/json")) {
    try {
      const parsed: unknown = text ? JSON.parse(text) : null;
      if (typeof parsed === "string" && parsed.length > 0) return parsed;
    } catch {
      // Invalid JSON is handled below.
    }
    throw new AuthApiError("Invalid response body", res.status, "unknown");
  }
  if (text.length > 0) return text;
  throw new AuthApiError("Invalid response body", res.status, "unknown");
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

export async function getIndustryTypes(): Promise<IndustryTypeListItemDto[]> {
  const res = await authFetch(getApiUrl(`${LOOKUPS_BASE}/industry-types`));
  return parseOkJson(res);
}

export async function getCompanyTypes(businessType?: string): Promise<CompanyTypeListItemDto[]> {
  const query = businessType ? `?businessType=${encodeURIComponent(businessType)}` : "";
  const res = await authFetch(getApiUrl(`${LOOKUPS_BASE}/company-types${query}`));
  return parseOkJson(res);
}

export async function getDocumentTypes(category?: string): Promise<DocumentTypeLookupItemDto[]> {
  const query = category ? `?category=${encodeURIComponent(category)}` : "";
  const res = await authFetch(getApiUrl(`${LOOKUPS_BASE}/document-types${query}`));
  return parseOkJson(res);
}

export async function getProfile(): Promise<OnboardingProfileDto> {
  const res = await authFetch(getApiUrl(`${ONBOARDING_BASE}/profile`));
  return parseOkJson(res);
}

export async function updateProfile(body: UpdateOnboardingProfileRequest): Promise<OnboardingProfileDto> {
  const res = await authFetch(getApiUrl(`${ONBOARDING_BASE}/profile`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseOkJson(res);
}

export async function updateLogo(file: File): Promise<string> {
  const form = new FormData();
  form.append("Logo", file, file.name);
  const res = await authFetch(getApiUrl(`${ONBOARDING_BASE}/profile/logo`), {
    method: "POST",
    headers: { Accept: "application/json" },
    body: form,
  });
  if (!res.ok) {
    await throwFromResponse(res);
  }
  return storageKeyFromLogoResponse(res);
}

export async function getLogo(): Promise<Blob | null> {
  const res = await authFetch(getApiUrl(`${ONBOARDING_BASE}/profile/logo`));
  return logoBlobFromResponse(res);
}

export async function getOwners(): Promise<OnboardingOwnerDto[]> {
  const res = await authFetch(getApiUrl(`${ONBOARDING_BASE}/owners`));
  return parseOkJson(res);
}

export async function addOwner(input: AddOwnerRequest): Promise<OnboardingOwnerDto> {
  const form = new FormData();
  form.append("FirstName", input.firstName);
  form.append("LastName", input.lastName);
  form.append("DateOfBirth", input.dateOfBirth);
  form.append("Nationality", input.nationality);
  form.append("IDType", input.idType);
  form.append("IDNumber", input.idNumber);
  form.append("Address", input.address);
  form.append("BVN", input.bvn);
  form.append("IDDocumentTypeId", input.idDocumentTypeId);
  form.append("IDDocument", input.idDocument, input.idDocument.name);

  const res = await authFetch(getApiUrl(`${ONBOARDING_BASE}/owners`), {
    method: "POST",
    body: form,
  });
  return parseOkJson(res);
}

export async function updateOwner(ownerId: string, input: UpdateOwnerRequest): Promise<OnboardingOwnerDto> {
  const form = new FormData();
  form.append("FirstName", input.firstName);
  form.append("LastName", input.lastName);
  form.append("DateOfBirth", input.dateOfBirth);
  form.append("Nationality", input.nationality);
  form.append("IDType", input.idType);
  form.append("IDNumber", input.idNumber);
  form.append("Address", input.address);
  form.append("BVN", input.bvn);
  if (input.idDocumentTypeId) form.append("IDDocumentTypeId", input.idDocumentTypeId);
  if (input.idDocument) form.append("IDDocument", input.idDocument, input.idDocument.name);

  const res = await authFetch(getApiUrl(`${ONBOARDING_BASE}/owners/${encodeURIComponent(ownerId)}`), {
    method: "PUT",
    body: form,
  });
  return parseOkJson(res);
}

export async function deleteOwner(ownerId: string): Promise<unknown> {
  const res = await authFetch(getApiUrl(`${ONBOARDING_BASE}/owners/${encodeURIComponent(ownerId)}`), {
    method: "DELETE",
  });
  return parseOkJson(res);
}

export async function getSettlementAccount(): Promise<OnboardingSettlementAccountDto | null> {
  try {
    const res = await authFetch(getApiUrl(`${ONBOARDING_BASE}/settlement-bank`));
    return await parseOkJson(res);
  } catch (err) {
    // Backend returns 404 merchant_bank_accounts.not_found when no account has been added yet.
    if (err instanceof AuthApiError && err.code === SETTLEMENT_ACCOUNT_NOT_FOUND_CODE) {
      return null;
    }
    throw err;
  }
}

export async function addSettlementAccount(
  body: AddSettlementAccountRequest,
): Promise<OnboardingSettlementAccountDto> {
  const res = await authFetch(getApiUrl(`${ONBOARDING_BASE}/settlement-bank`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseOkJson(res);
}

export async function getRequirements(): Promise<OnboardingRequirementsDto> {
  const res = await authFetch(getApiUrl(`${ONBOARDING_BASE}/requirements`));
  return parseOkJson(res);
}

export async function getDocuments(): Promise<OnboardingDocumentDto[]> {
  const res = await authFetch(getApiUrl(`${ONBOARDING_BASE}/documents`));
  return parseOkJson(res);
}

export async function uploadDocument(input: { documentTypeId: string; file: File }): Promise<OnboardingDocumentDto> {
  const form = new FormData();
  // Backend binds [FromForm] UploadBusinessDocumentRequest(DocumentTypeId, Document).
  form.append("DocumentTypeId", input.documentTypeId);
  form.append("Document", input.file, input.file.name);

  const res = await authFetch(getApiUrl(`${ONBOARDING_BASE}/documents`), {
    method: "POST",
    body: form,
  });
  return parseOkJson(res);
}

export async function submitOnboarding(): Promise<boolean> {
  const res = await authFetch(getApiUrl(`${ONBOARDING_BASE}/submit`), { method: "POST" });
  return parseOkJson(res);
}
