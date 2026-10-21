export * from "./auth";
export * from "./merchantPortal";
export * from "./onboarding";
export * from "./subaccounts";

export type AppMode = "test" | "live";

/** Business / org the user can switch between in the dashboard sidebar */
export interface Merchant {
  id: string;
  name: string;
  planLabel: string;
  /** Auth storage key for the merchant logo. Not an image URL. */
  logoKey: string | null;
}

export type TxStatus = "success" | "failed" | "pending" | "abandoned";
export type Channel = "card" | "transfer" | "ussd" | "qr" | "bank";

export interface Transaction {
  id: string;
  reference: string;
  amount: number; // in kobo (NGN minor units)
  fee: number;
  currency: "NGN";
  status: TxStatus;
  channel: Channel;
  customerId: string;
  customerEmail: string;
  customerName: string;
  paymentLinkId?: string;
  createdAt: string; // ISO
  paidAt?: string;
  mode: AppMode;
  description?: string;
  cardLast4?: string;
  cardBrand?: "visa" | "mastercard" | "verve";
  bankName?: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  totalSpend: number;
  transactionCount: number;
  status: "active" | "blacklisted";
}

export interface PaymentLink {
  id: string;
  slug: string;
  name: string;
  description?: string;
  amount: number | null; // null = customer chooses
  currency: "NGN";
  redirectUrl?: string;
  createdAt: string;
  active: boolean;
  totalCollected: number;
  paymentCount: number;
}

export interface Payout {
  id: string;
  amount: number;
  status: "paid" | "processing" | "failed";
  bankAccountId: string;
  createdAt: string;
  settledAt?: string;
  reference: string;
  transactionCount: number;
}

export interface BankAccount {
  id: string;
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  isPrimary: boolean;
  addedAt: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "developer" | "support";
  roleId?: string;
  roleName?: string;
  status: "active" | "invited";
  invitedAt: string;
  avatarUrl?: string;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  businessName: string;
  businessType: "starter" | "registered" | "enterprise";
  rcNumber?: string;
  industry: string;
  role: "owner" | "admin" | "developer" | "support";
  kycStatus: "pending" | "in_review" | "approved" | "rejected";
  /** Merchant onboarding status for the active merchant context (e.g. Draft, RequiresAction, Submitted, Approved). */
  onboardingStatus?: string;
  /** 0-100 */
  onboardingPercentComplete?: number;
  twoFAEnabled: boolean;
  avatarUrl?: string;
  joinedAt: string;
}

export interface Bank {
  code: string;
  name: string;
  shortName: string;
}
