/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  /** Public URL to merchant terms (PDF or page) for onboarding / signup links */
  readonly VITE_MERCHANT_TERMS_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
