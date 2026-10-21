export type MerchantCredentialMode = "Test" | "Live";

export interface MerchantListItemDTO {
  id: string;
  displayName: string;
  status: string;
  createdAt: string;
}

export interface CreateMerchantRequest {
  displayName: string;
}

export interface AllKeysDto {
  testPublicKey: string;
  testSecretKey: string;
  livePublicKey: string | null;
  liveSecretKey: string | null;
}

export interface KeyPairDto {
  mode: string;
  publicKey: string;
  privateKey: string;
}

export interface CallbackUrlDto {
  testCallbackUrl: string | null;
  liveCallbackUrl: string | null;
}

export interface UpdateWebhookRequest {
  liveCallbakcUrl?: string | null; // backend typo, match exactly
  testCallbackUrl?: string | null;
}

export interface MerchantRoleListItemDto {
  id: string;
  name: string;
}

