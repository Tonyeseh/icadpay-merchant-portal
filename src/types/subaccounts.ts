export type SplitMode = "Percentage" | "FixedPlatformAmount";

/** Domain error codes from MerchantPortal subaccounts endpoints (reference). */
export const SUBACCOUNT_ERROR_CODES = {
  NOT_FOUND: "subaccounts.not_found",
  DUPLICATE: "subaccounts.duplicate",
  INVALID_ID: "subaccounts.invalid_id",
  INVALID_BUSINESS_NAME: "subaccounts.invalid_business_name",
  INVALID_BANK_CODE: "subaccounts.invalid_bank_code",
  INVALID_ACCOUNT_NUMBER: "subaccounts.invalid_account_number",
  INVALID_SPLIT_MODE: "subaccounts.invalid_split_mode",
  SPLIT_FIELDS_MISMATCH: "subaccounts.split_fields_mismatch",
  PERCENT_REQUIRED: "subaccounts.percent_required",
  FLAT_AMOUNT_REQUIRED: "subaccounts.flat_amount_required",
  INVALID_PERCENT: "subaccounts.invalid_percent",
  INVALID_FLAT_AMOUNT: "subaccounts.invalid_flat_amount",
} as const;

export interface SubaccountDto {
  id: string;
  businessName: string;
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  splitMode: SplitMode;
  sharePercent: number | null;
  flatAmount: number | null;
  isActive: boolean;
  createdAtUtc: string;
  updatedAtUtc: string | null;
}

export interface CreateSubaccountRequest {
  businessName: string;
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  splitMode: SplitMode;
  sharePercent?: number;
  flatAmount?: number;
}

/** PATCH body: only send fields that change. */
export interface UpdateSubaccountRequest {
  businessName?: string;
  isActive?: boolean;
  splitMode?: SplitMode;
  sharePercent?: number;
  flatAmount?: number;
}
