import { AuthApiError } from "@/types/auth";
import { SUBACCOUNT_ERROR_CODES } from "@/types/subaccounts";

const FRIENDLY_BY_CODE: Record<string, string> = {
  [SUBACCOUNT_ERROR_CODES.NOT_FOUND]: "This subaccount was not found or is no longer available.",
  [SUBACCOUNT_ERROR_CODES.DUPLICATE]:
    "A subaccount with this bank and account number already exists.",
  [SUBACCOUNT_ERROR_CODES.INVALID_ID]: "This subaccount id is not valid.",
  [SUBACCOUNT_ERROR_CODES.INVALID_BUSINESS_NAME]: "Enter a business name.",
  [SUBACCOUNT_ERROR_CODES.INVALID_BANK_CODE]: "Select a valid bank.",
  [SUBACCOUNT_ERROR_CODES.INVALID_ACCOUNT_NUMBER]: "Enter a valid account number.",
  [SUBACCOUNT_ERROR_CODES.INVALID_SPLIT_MODE]: "Choose a valid split mode.",
  [SUBACCOUNT_ERROR_CODES.SPLIT_FIELDS_MISMATCH]:
    "Split fields do not match the selected mode. Adjust percent or fixed amount.",
  [SUBACCOUNT_ERROR_CODES.PERCENT_REQUIRED]: "Enter a platform share percent for percentage splits.",
  [SUBACCOUNT_ERROR_CODES.FLAT_AMOUNT_REQUIRED]: "Enter a fixed platform amount for this split mode.",
  [SUBACCOUNT_ERROR_CODES.INVALID_PERCENT]: "Percent must be between 0 and 100.",
  [SUBACCOUNT_ERROR_CODES.INVALID_FLAT_AMOUNT]: "Fixed amount must be greater than zero.",
};

/** Maps API validation/domain errors to short UI-friendly copy (toast / inline). */
export function describeSubaccountError(err: unknown): string {
  if (err instanceof AuthApiError) {
    if (err.code && FRIENDLY_BY_CODE[err.code]) {
      return FRIENDLY_BY_CODE[err.code];
    }
    if (err.fieldErrors) {
      for (const key of Object.keys(err.fieldErrors)) {
        const friendly = FRIENDLY_BY_CODE[key];
        if (friendly) return friendly;
      }
    }
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong";
}
