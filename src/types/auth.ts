/** Signed-in user summary from MerchantPortal authentication responses */
export interface AuthUserSummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  isEmailVerified: boolean;
}

/** One merchant membership entry under `myMerchant` (singular key in JSON). */
export interface MyMerchantMembership {
  merchantId: string;
  displayName: string;
  roleId: string;
  roleName: string;
  accountMode: "Test" | "Live";
  onboardingStatus: string;
  /** Storage key for the merchant logo. Null when the merchant has no logo. */
  logo: string | null;
}

export interface AuthenticationResponse {
  user: AuthUserSummary;
  myMerchant: MyMerchantMembership[];
  accessToken: string;
  currentMerchantId: string;
  /** Merchant onboarding/KYC summary for the active merchant context. */
  onboardingStatus: string;
  /** `"Test"` | `"Live"` for the active merchant context. */
  accountMode: "Test" | "Live";
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  businessName: string;
  phoneNumber?: string;
}

/** Register no longer logs the user in — it only creates the account and sends a verification email. */
export interface RegisterResponse {
  userId: string;
  email: string;
  message: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

/** `{ message }` body returned by forgot-password, reset-password, and similar auth endpoints. */
export interface MessageResponse {
  message: string;
}

export interface DomainErrorBody {
  code: string;
  description: string;
}

/** ASP.NET validation problem details shape (subset). */
export interface ValidationProblemBody {
  title?: string;
  errors?: Record<string, string[]>;
}

export type AuthApiErrorKind = "validation" | "domain" | "unknown";

/** Domain error code for an unverified email on login (backend spelling, including the typo). */
export const EMAIL_NOT_VERIFIED_CODE = "auth.emailnotverfied";

export class AuthApiError extends Error {
  override readonly name = "AuthApiError";
  readonly status: number;
  readonly kind: AuthApiErrorKind;
  readonly fieldErrors?: Record<string, string[]>;
  readonly code?: string;

  constructor(
    message: string,
    status: number,
    kind: AuthApiErrorKind,
    fieldErrors?: Record<string, string[]>,
    code?: string,
  ) {
    super(message);
    this.status = status;
    this.kind = kind;
    this.fieldErrors = fieldErrors;
    this.code = code;
  }
}
