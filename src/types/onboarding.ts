export type BusinessType = "Non-Registered Business" | "Registered Business" | "Government Agency";

export type OnboardingStatus =
  | "Draft"
  | "Submitted"
  | "UnderReview"
  | "Approved"
  | "Rejected"
  | "RequiresAction";

export interface IndustryTypeListItemDto {
  id: string;
  name: string;
}

export interface CompanyTypeListItemDto {
  id: string;
  name: string;
}

export interface DocumentTypeLookupItemDto {
  id: string;
  name: string;
  category: string | null;
}

export interface RequiredDocumentDto {
  documentTypeId: string;
  name: string;
  category: string | null;
}

export interface OnboardingRequirementsDto {
  requiredDocuments: RequiredDocumentDto[];
  minimumOwnerCount: number;
}

/** Matches backend `BusinessProfileDTO` — merges what used to be "profile" and "contact". */
export interface OnboardingProfileDto {
  id: string;
  displayName: string;
  logoUrl: string | null;
  businessType: BusinessType | (string & {});
  industryTypeId: string;
  companyTypeId: string;
  emailAddress: string;
  tradingName: string;
  staffSize: string;
  registeredAddress: string;
  phoneNumber: string;
  address: string;
  supportEmailAddress: string;
  website: string;
}

/** Matches backend `UpdateBusinessProfileRequest` — every field is a required string (use "" when not applicable). */
export interface UpdateOnboardingProfileRequest {
  displayName: string;
  businessType: BusinessType | (string & {});
  industryTypeId: string;
  companyTypeId: string;
  emailAddress: string;
  tradingName: string;
  staffSize: string;
  registeredAddress: string;
  phoneNumber: string;
  address: string;
  supportEmailAddress: string;
  website: string;
}

/** Matches backend `OwnerInformationDTO`. No "role" or BVN-consent concept exists server-side. */
export interface OnboardingOwnerDto {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  nationality: string;
  idType: string;
  idNumber: string;
  address: string;
  bvn: string;
  identificationDocumentKey: string;
}

/** Matches backend `AddOwnerInformationRequest` ([FromForm], multipart). An ID document is required. */
export interface AddOwnerRequest {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  nationality: string;
  idType: string;
  idNumber: string;
  address: string;
  bvn: string;
  idDocumentTypeId: string;
  idDocument: File;
}

/** Matches backend `UpdateOwnerInformationRequest` ([FromForm], multipart). The ID document is optional on update. */
export interface UpdateOwnerRequest {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  nationality: string;
  idType: string;
  idNumber: string;
  address: string;
  bvn: string;
  idDocumentTypeId?: string | null;
  idDocument?: File | null;
}

/** Matches backend `SettlementBankDTO`. No verification-status concept is exposed here. */
export interface OnboardingSettlementAccountDto {
  id: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  bankCode: string;
}

/** Matches backend `AddSettlementBankRequest`. There is no update endpoint — only add. */
export interface AddSettlementAccountRequest {
  accountName: string;
  accountNumber: string;
  bankName: string;
  bankCode: string;
}

/** Matches backend `BusinessDocumentDTO`. */
export interface OnboardingDocumentDto {
  id: string;
  documentTypeId: string;
  documentName: string;
  contentType: string;
  uploadedAt: string;
}
