import { useEffect, useRef, useState } from "react";
import * as onboardingApi from "@/lib/api/onboardingApi";
import * as settingsApi from "@/lib/api/settingsApi";

type LogoSource = "settings" | "onboarding";

type StoredLogo = {
  url: string;
  activeMerchantId: string | null;
  logoKey: string;
  source: LogoSource;
};

function logoSource(canViewSettings: boolean, canViewOnboarding: boolean): LogoSource | null {
  if (canViewSettings) return "settings";
  if (canViewOnboarding) return "onboarding";
  return null;
}

function sameLogoRequest(
  stored: StoredLogo,
  activeMerchantId: string | null,
  logoKey: string | null,
  source: LogoSource | null,
): boolean {
  return (
    stored.activeMerchantId === activeMerchantId &&
    stored.logoKey === logoKey &&
    stored.source === source
  );
}

/**
 * Object URL for the signed-in merchant's logo.
 * The URL stays in this hook; callers must not store it on merchant or session state.
 */
export function useActiveMerchantLogo(
  activeMerchantId: string | null,
  logoKey: string | null,
  canViewSettings: boolean,
  canViewOnboarding: boolean,
): string | null {
  const source = logoSource(canViewSettings, canViewOnboarding);
  const [stored, setStored] = useState<StoredLogo | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  // Drop a URL that belongs to a previous merchant, key, or source before paint.
  // The effect revokes the blob; this keeps a revoked URL from being returned.
  if (stored !== null && !sameLogoRequest(stored, activeMerchantId, logoKey, source)) {
    setStored(null);
  }

  useEffect(() => {
    let cancelled = false;

    function revokeCurrent() {
      const current = objectUrlRef.current;
      if (!current) return;
      URL.revokeObjectURL(current);
      objectUrlRef.current = null;
    }

    revokeCurrent();

    if (!logoKey || source == null) {
      return () => {
        cancelled = true;
        revokeCurrent();
      };
    }

    const requestedMerchantId = activeMerchantId;
    const requestedLogoKey = logoKey;
    const requestedSource = source;

    void (async () => {
      try {
        const blob =
          requestedSource === "settings" ? await settingsApi.getLogo() : await onboardingApi.getLogo();
        if (cancelled) return;
        if (!blob || blob.size === 0) {
          setStored(null);
          return;
        }
        const url = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        objectUrlRef.current = url;
        setStored({
          url,
          activeMerchantId: requestedMerchantId,
          logoKey: requestedLogoKey,
          source: requestedSource,
        });
      } catch {
        if (!cancelled) setStored(null);
      }
    })();

    return () => {
      cancelled = true;
      revokeCurrent();
    };
  }, [activeMerchantId, logoKey, source]);

  if (stored !== null && sameLogoRequest(stored, activeMerchantId, logoKey, source)) {
    return stored.url;
  }
  return null;
}
