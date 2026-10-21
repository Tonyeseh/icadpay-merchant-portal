import { getApiUrl } from "@/lib/env";
import {
  AuthApiError,
  type AuthenticationResponse,
  type DomainErrorBody,
  type LoginRequest,
  type MessageResponse,
  type RegisterRequest,
  type RegisterResponse,
  type ResetPasswordRequest,
  type ValidationProblemBody,
} from "@/types/auth";

const MERCHANT_AUTH_BASE = "/api/v1/auth/merchant";

async function readJsonUnknown(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function firstValidationMessage(errors?: Record<string, string[]>): string {
  if (!errors) return "Validation failed";
  for (const msgs of Object.values(errors)) {
    if (msgs?.[0]) return msgs[0];
  }
  return "Validation failed";
}

export async function throwFromResponse(res: Response): Promise<never> {
  const body = await readJsonUnknown(res);
  if (res.status === 400 && body && typeof body === "object") {
    const v = body as ValidationProblemBody;
    if (v.errors && typeof v.errors === "object") {
      throw new AuthApiError(
        firstValidationMessage(v.errors),
        res.status,
        "validation",
        v.errors,
      );
    }
  }
  if (body && typeof body === "object") {
    const d = body as Partial<DomainErrorBody>;
    if (typeof d.description === "string") {
      throw new AuthApiError(
        d.description,
        res.status,
        "domain",
        undefined,
        typeof d.code === "string" ? d.code : undefined,
      );
    }
  }
  throw new AuthApiError(
    `Request failed (${res.status})`,
    res.status,
    "unknown",
  );
}

async function parseAuthenticationResponse(res: Response): Promise<AuthenticationResponse> {
  if (!res.ok) {
    await throwFromResponse(res);
  }
  const body = await readJsonUnknown(res);
  if (!body || typeof body !== "object") {
    throw new AuthApiError("Invalid response body", res.status, "unknown");
  }
  return body as AuthenticationResponse;
}

export async function login(body: LoginRequest): Promise<AuthenticationResponse> {
  const res = await fetch(getApiUrl(`${MERCHANT_AUTH_BASE}/login`), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseAuthenticationResponse(res);
}

export async function register(body: RegisterRequest): Promise<RegisterResponse> {
  const res = await fetch(getApiUrl(`${MERCHANT_AUTH_BASE}/register`), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    await throwFromResponse(res);
  }
  const responseBody = await readJsonUnknown(res);
  if (!responseBody || typeof responseBody !== "object") {
    throw new AuthApiError("Invalid response body", res.status, "unknown");
  }
  return responseBody as RegisterResponse;
}

export async function refresh(accessToken: string): Promise<AuthenticationResponse> {
  const res = await fetch(getApiUrl(`${MERCHANT_AUTH_BASE}/refresh`), {
    method: "POST",
    credentials: "include",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return parseAuthenticationResponse(res);
}

export async function switchMerchant(
  accessToken: string,
  merchantId: string,
): Promise<AuthenticationResponse> {
  const res = await fetch(getApiUrl(`${MERCHANT_AUTH_BASE}/switch`), {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ merchantId }),
  });
  return parseAuthenticationResponse(res);
}

export async function resendVerificationEmail(email: string): Promise<{ message: string }> {
  const res = await fetch(getApiUrl(`${MERCHANT_AUTH_BASE}/resend-verification-email`), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    await throwFromResponse(res);
  }
  const body = await readJsonUnknown(res);
  if (!body || typeof body !== "object") {
    throw new AuthApiError("Invalid response body", res.status, "unknown");
  }
  return body as { message: string };
}

export async function verifyEmail(token: string): Promise<{ status: string; message: string }> {
  const res = await fetch(getApiUrl(`${MERCHANT_AUTH_BASE}/verify-email`), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  if (!res.ok) {
    await throwFromResponse(res);
  }
  const body = await readJsonUnknown(res);
  if (!body || typeof body !== "object") {
    throw new AuthApiError("Invalid response body", res.status, "unknown");
  }
  return body as { status: string; message: string };
}

export async function forgotPassword(email: string): Promise<MessageResponse> {
  const res = await fetch(getApiUrl(`${MERCHANT_AUTH_BASE}/forgot-password`), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    await throwFromResponse(res);
  }
  const body = await readJsonUnknown(res);
  if (!body || typeof body !== "object") {
    throw new AuthApiError("Invalid response body", res.status, "unknown");
  }
  return body as MessageResponse;
}

export async function resetPassword(body: ResetPasswordRequest): Promise<MessageResponse> {
  const res = await fetch(getApiUrl(`${MERCHANT_AUTH_BASE}/reset-password`), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: body.token, newPassword: body.newPassword }),
  });
  if (!res.ok) {
    await throwFromResponse(res);
  }
  const responseBody = await readJsonUnknown(res);
  if (!responseBody || typeof responseBody !== "object") {
    throw new AuthApiError("Invalid response body", res.status, "unknown");
  }
  return responseBody as MessageResponse;
}

export async function logout(accessToken: string): Promise<void> {
  const res = await fetch(getApiUrl(`${MERCHANT_AUTH_BASE}/logout`), {
    method: "POST",
    credentials: "include",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (res.status === 204 || res.ok) return;
  await throwFromResponse(res);
}
