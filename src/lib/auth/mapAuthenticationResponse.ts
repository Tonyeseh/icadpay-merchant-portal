import type { AuthenticationResponse } from "@/types/auth";
import type { Merchant, User } from "@/types";

function mapMerchantRoleToUserRole(roleName: string): User["role"] {
  const r = roleName.toLowerCase();
  if (r.includes("owner")) return "owner";
  if (r.includes("admin")) return "admin";
  if (r.includes("developer") || r.includes("dev")) return "developer";
  if (r.includes("support")) return "support";
  return "owner";
}

function mapOnboardingStatusToKycStatus(status?: string): User["kycStatus"] {
  const s = (status ?? "").toLowerCase();
  if (s === "approved") return "approved";
  if (s === "rejected") return "rejected";
  if (s === "submitted" || s === "underreview" || s === "under_review") return "in_review";
  return "pending";
}

/** Runtime values may not match the type: `parseAuthenticationResponse` is an unchecked cast. */
function logoKeyFromMembership(logo: unknown): string | null {
  if (typeof logo !== "string") return null;
  const trimmed = logo.trim();
  return trimmed === "" ? null : trimmed;
}

export function merchantsFromMemberships(
  memberships: AuthenticationResponse["myMerchant"],
): Merchant[] {
  return memberships.map((m) => ({
    id: m.merchantId,
    name: m.displayName,
    planLabel: m.roleName,
    logoKey: logoKeyFromMembership(m.logo),
  }));
}

/** Best-effort membership row for the active merchant context. */
function membershipForCurrent(
  res: AuthenticationResponse,
): AuthenticationResponse["myMerchant"][number] | undefined {
  const { currentMerchantId, myMerchant } = res;
  return (
    myMerchant.find((x) => x.merchantId === currentMerchantId) ?? myMerchant[0]
  );
}

export function mapAuthenticationResponseToUser(res: AuthenticationResponse): User {
  const { user } = res;
  const membership = membershipForCurrent(res);
  const businessName = membership?.displayName ?? "Merchant";

  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: "",
    businessName,
    businessType: "starter",
    industry: "",
    role: membership ? mapMerchantRoleToUserRole(membership.roleName) : "owner",
    kycStatus: mapOnboardingStatusToKycStatus(res.onboardingStatus),
    onboardingStatus: res.onboardingStatus,
    twoFAEnabled: false,
    joinedAt: new Date().toISOString(),
  };
}
