import { AuthApiError } from "@/types/auth";

const FRIENDLY_BY_CODE: Record<string, string> = {
  "merchant_roles.not_found": "This role was not found.",
  "merchant_roles.duplicate_name": "A role with this name already exists.",
  "merchant_roles.name_required": "Role name is required.",
  "merchant_roles.invalid_permission": "One or more permissions are invalid.",
  "merchant_roles.invalid_permission_id": "One or more permissions are invalid.",
  "merchant_roles.cannot_edit_admin_created_role": "Built-in roles cannot be changed.",
};

function knownCode(err: AuthApiError): string | undefined {
  if (err.code && FRIENDLY_BY_CODE[err.code]) return err.code;
  const fields = err.fieldErrors;
  if (!fields) return undefined;
  for (const key of Object.keys(fields)) {
    if (FRIENDLY_BY_CODE[key]) return key;
  }
  return undefined;
}

/** Maps role API errors to short UI copy. Validation problems keep the code on `fieldErrors`. */
export function describeRoleError(err: unknown): string {
  if (err instanceof AuthApiError) {
    const code = knownCode(err);
    if (code) return FRIENDLY_BY_CODE[code]!;
    return err.message;
  }
  if (err instanceof Error && err.message) return err.message;
  return "Something went wrong";
}
