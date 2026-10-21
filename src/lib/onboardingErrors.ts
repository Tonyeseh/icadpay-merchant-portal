import { AuthApiError } from "@/types/auth";

/**
 * Domain/validation error codes returned by MerchantPortal's onboarding endpoints.
 * Source: backend `src/ApplicationCore/DomainErrors/Errors.*.cs`.
 */
export const ONBOARDING_ERROR_CODES = {
  ONBOARDING_NOT_EDITABLE: "merchant.onboarding_not_editable",
  INVALID_BUSINESS_TYPE: "merchant.invalid_business_type",
  INVALID_INDUSTRY_TYPE: "merchant.invalid_industry_type",
  INVALID_COMPANY_TYPE: "merchant.invalid_company_type",
  COMPANY_TYPE_BUSINESS_TYPE_MISMATCH: "merchant.company_type_business_type_mismatch",
  PROFILE_INCOMPLETE: "merchant.profile_incomplete",
  MERCHANT_NOT_FOUND: "merchant.notfound",
  INSUFFICIENT_OWNERS: "merchant_owners.insufficient_owners",
  DUPLICATE_BVN: "merchant_owners.duplicate_bvn",
  MISSING_REQUIRED_DOCUMENTS: "document.missing_required_documents",
  INVALID_DOCUMENT_TYPE: "document.invalid_document_type",
  SETTLEMENT_ACCOUNT_NOT_FOUND: "merchant_bank_accounts.not_found",
  SETTLEMENT_ACCOUNT_DUPLICATE: "merchant_bank_accounts.duplicate",
  SETTLEMENT_NAME_ENQUIRY_FAILED: "merchant_bank_accounts.name_enquiry_failed",
} as const;

export const SETTLEMENT_ACCOUNT_NOT_FOUND_CODE = ONBOARDING_ERROR_CODES.SETTLEMENT_ACCOUNT_NOT_FOUND;

export function validationKeys(fieldErrors?: Record<string, string[]>): string[] {
  if (!fieldErrors) return [];
  return Object.keys(fieldErrors);
}

export function firstValidationMessage(
  fieldErrors: Record<string, string[]> | undefined,
  key: string,
): string | undefined {
  return fieldErrors?.[key]?.[0];
}

export function hasValidationKey(err: AuthApiError, key: string): boolean {
  return validationKeys(err.fieldErrors).includes(key);
}

/** Which wizard tab should be opened for a given submit failure, if any. */
export function submitErrorWizardTab(err: AuthApiError): string | null {
  if (hasValidationKey(err, ONBOARDING_ERROR_CODES.PROFILE_INCOMPLETE)) return "profile";
  if (hasValidationKey(err, ONBOARDING_ERROR_CODES.INSUFFICIENT_OWNERS)) return "owners";
  if (hasValidationKey(err, ONBOARDING_ERROR_CODES.MISSING_REQUIRED_DOCUMENTS)) return "documents";
  if (err.code === ONBOARDING_ERROR_CODES.SETTLEMENT_ACCOUNT_NOT_FOUND) return "settlement_account";
  return null;
}
