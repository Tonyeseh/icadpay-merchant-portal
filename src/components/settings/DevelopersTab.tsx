import { useEffect, useMemo, useRef, useState } from "react";
import { RefreshCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CopyButton } from "@/components/common/CopyButton";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { AccessDenied } from "@/components/common/AccessDenied";
import { useAppStore } from "@/store/useAppStore";
import { maskKey } from "@/lib/format";
import type { AllKeysDto, AppMode, CallbackUrlDto } from "@/types";
import { toast } from "sonner";
import * as merchantsApi from "@/lib/api/merchantsApi";
import { AuthApiError } from "@/types/auth";
import { isForbidden, PERMISSIONS } from "@/lib/auth/permissions";
import { useHasPermission } from "@/hooks/usePermissions";

const LIVE_KEYS_REQUIRE_APPROVED = "merchant.live_keys_require_approved_onboarding";
const CALLBACK_URL_MAX_LENGTH = 2048;

type ModeUrls = Record<AppMode, string>;

const emptyUrls = (): ModeUrls => ({ test: "", live: "" });

const emptyUrlErrors = (): Record<AppMode, string | null> => ({ test: null, live: null });

function showError(err: unknown, fallback = "Something went wrong") {
  if (err instanceof AuthApiError) {
    toast.error(err.message);
    return;
  }
  if (err instanceof Error) {
    toast.error(err.message || fallback);
    return;
  }
  toast.error(fallback);
}

function keysForMode(keys: AllKeysDto, mode: AppMode): { publicKey: string | null; secretKey: string | null } {
  if (mode === "live") {
    return { publicKey: keys.livePublicKey, secretKey: keys.liveSecretKey };
  }
  return { publicKey: keys.testPublicKey, secretKey: keys.testSecretKey };
}

function otherMode(mode: AppMode): AppMode {
  return mode === "live" ? "test" : "live";
}

function urlsFromDto(dto: CallbackUrlDto): ModeUrls {
  return {
    test: dto.testCallbackUrl ?? "",
    live: dto.liveCallbackUrl ?? "",
  };
}

function callbackUrlError(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return "Enter an absolute http or https URL.";
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return "Enter an absolute http or https URL.";
  }
  if (value.length > CALLBACK_URL_MAX_LENGTH) {
    return "Callback URL must be 2048 characters or fewer.";
  }
  return null;
}

export function DevelopersTab() {
  const mode = useAppStore((s) => s.mode);
  const activeMerchantId = useAppStore((s) => s.activeMerchantId);
  const canViewKeys = useHasPermission(PERMISSIONS["developer.view_keys"]);
  const canRotateKeys = useHasPermission(PERMISSIONS["developer.rotate_keys"]);
  const canManageCallback = useHasPermission(PERMISSIONS["developer.manage_callback"]);

  const [loadingKeys, setLoadingKeys] = useState(canViewKeys);
  const [keys, setKeys] = useState<AllKeysDto | null>(null);
  const [keysError, setKeysError] = useState<string | null>(null);
  const [keysForbidden, setKeysForbidden] = useState(false);
  const [confirmRotate, setConfirmRotate] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [revealedPrivateKey, setRevealedPrivateKey] = useState<string | null>(null);

  const [loadingCallback, setLoadingCallback] = useState(canManageCallback);
  const [savingCallback, setSavingCallback] = useState<AppMode | null>(null);
  const [callbackError, setCallbackError] = useState<string | null>(null);
  const [callbackForbidden, setCallbackForbidden] = useState(false);
  const [savedUrls, setSavedUrls] = useState<ModeUrls>(emptyUrls);
  const [drafts, setDrafts] = useState<ModeUrls>(emptyUrls);
  const [urlError, setUrlError] = useState<Record<AppMode, string | null>>(emptyUrlErrors);

  const keysGen = useRef(0);
  const callbackGen = useRef(0);

  const [scope, setScope] = useState({ mode, activeMerchantId });
  if (scope.mode !== mode || scope.activeMerchantId !== activeMerchantId) {
    setScope({ mode, activeMerchantId });
    setRevealedPrivateKey(null);
    setUrlError(emptyUrlErrors());
  }

  const currentKeys = useMemo(() => (keys ? keysForMode(keys, mode) : null), [keys, mode]);

  useEffect(() => {
    if (!canViewKeys) return;
    const gen = ++keysGen.current;
    let cancelled = false;
    (async () => {
      setLoadingKeys(true);
      setKeysError(null);
      setKeysForbidden(false);
      try {
        const all = await merchantsApi.getKeys();
        if (cancelled || keysGen.current !== gen) return;
        setKeys(all);
      } catch (e) {
        if (cancelled || keysGen.current !== gen) return;
        if (isForbidden(e)) {
          setKeysForbidden(true);
          return;
        }
        const message = e instanceof Error && e.message ? e.message : "Could not load API keys";
        setKeysError(message);
        showError(e, "Could not load API keys");
      } finally {
        if (!cancelled && keysGen.current === gen) setLoadingKeys(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canViewKeys, activeMerchantId]);

  useEffect(() => {
    if (!canManageCallback) return;
    const gen = ++callbackGen.current;
    let cancelled = false;
    (async () => {
      setLoadingCallback(true);
      setCallbackError(null);
      setCallbackForbidden(false);
      const blank = emptyUrls();
      setSavedUrls(blank);
      setDrafts(blank);
      try {
        const dto = await merchantsApi.getCallback();
        if (cancelled || callbackGen.current !== gen) return;
        const next = urlsFromDto(dto);
        setSavedUrls(next);
        setDrafts(next);
      } catch (e) {
        if (cancelled || callbackGen.current !== gen) return;
        if (isForbidden(e)) {
          setCallbackForbidden(true);
          return;
        }
        const message = e instanceof Error && e.message ? e.message : "Could not load callback URL";
        setCallbackError(message);
        showError(e, "Could not load callback URL");
      } finally {
        if (!cancelled && callbackGen.current === gen) setLoadingCallback(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canManageCallback, activeMerchantId]);

  async function rotateKeys() {
    const startedMode = mode;
    const startedMerchant = activeMerchantId;
    const gen = keysGen.current;
    setRotating(true);
    try {
      const rotated = startedMode === "live" ? await merchantsApi.rotateLiveKeys() : await merchantsApi.rotateTestKeys();
      const current = useAppStore.getState();
      if (keysGen.current !== gen || current.activeMerchantId !== startedMerchant) return;
      setKeys((prev) => {
        if (!prev) return prev;
        if (startedMode === "live") {
          return { ...prev, livePublicKey: rotated.publicKey, liveSecretKey: rotated.privateKey };
        }
        return { ...prev, testPublicKey: rotated.publicKey, testSecretKey: rotated.privateKey };
      });
      if (current.mode === startedMode) {
        setRevealedPrivateKey(rotated.privateKey);
        toast.success("Keys rotated", { description: "Copy the new private key now. It will only be shown once." });
      }
    } catch (e) {
      if (keysGen.current !== gen || useAppStore.getState().activeMerchantId !== startedMerchant) return;
      if (e instanceof AuthApiError && e.status === 403) {
        if (e.code === LIVE_KEYS_REQUIRE_APPROVED) {
          toast.error(e.message);
          return;
        }
        setKeysForbidden(true);
        return;
      }
      showError(e, "Could not rotate keys");
    } finally {
      setRotating(false);
    }
  }

  async function saveCallback(mode: AppMode) {
    const draft = drafts[mode];
    const clientError = callbackUrlError(draft);
    if (clientError) {
      setUrlError((prev) => ({ ...prev, [mode]: clientError }));
      return;
    }
    const trimmed = draft.trim();
    const startedMerchant = activeMerchantId;
    const previousSaved = savedUrls;
    const gen = callbackGen.current;
    setUrlError((prev) => ({ ...prev, [mode]: null }));
    setSavingCallback(mode);
    try {
      const updated = await merchantsApi.updateCallback(
        mode === "live" ? { liveCallbakcUrl: trimmed } : { testCallbackUrl: trimmed },
      );
      if (callbackGen.current !== gen || useAppStore.getState().activeMerchantId !== startedMerchant) return;
      const nextSaved = urlsFromDto(updated);
      const inactive = otherMode(mode);
      setSavedUrls(nextSaved);
      setDrafts((prev) => {
        const next = { ...prev, [mode]: nextSaved[mode] };
        if (prev[inactive] === previousSaved[inactive]) {
          next[inactive] = nextSaved[inactive];
        }
        return next;
      });
      const modeLabel = mode === "live" ? "Live" : "Test";
      toast.success(trimmed ? `${modeLabel} callback URL saved` : `${modeLabel} callback URL cleared`);
    } catch (e) {
      if (callbackGen.current !== gen || useAppStore.getState().activeMerchantId !== startedMerchant) return;
      if (isForbidden(e)) {
        setCallbackForbidden(true);
        return;
      }
      showError(e, "Could not save callback URL");
    } finally {
      setSavingCallback(null);
    }
  }

  return (
    <div className="space-y-4">
      {canViewKeys && (
        keysForbidden ? (
          <AccessDenied description="You don't have permission to view API keys." />
        ) : (
          <>
            <Card size="sm">
                <CardHeader className="flex-row items-center justify-between border-b">
                  <CardTitle>API keys · {mode}</CardTitle>
                  {canRotateKeys && (
                    <Button size="xs" variant="outline" onClick={() => setConfirmRotate(true)} disabled={rotating || loadingKeys}>
                      <RefreshCwIcon /> Rotate keys
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="divide-y p-0">
                  {loadingKeys ? (
                    <div className="px-6 py-5 text-sm text-muted-foreground">Loading API keys…</div>
                  ) : keysError ? (
                    <div className="px-6 py-5 text-sm text-destructive">{keysError}</div>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-center gap-3 px-6 py-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">Public key</span>
                            <span className="rounded-none border border-border bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                              public
                            </span>
                          </div>
                          <div className="mt-1 break-all font-mono text-xs text-muted-foreground">
                            {currentKeys?.publicKey ?? "Not issued"}
                          </div>
                        </div>
                        {currentKeys?.publicKey && (
                          <CopyButton value={currentKeys.publicKey} label={`${mode} public key`} />
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 px-6 py-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">Secret key</span>
                            <span className="rounded-none border border-border bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                              secret
                            </span>
                          </div>
                          <div className="mt-1 break-all font-mono text-xs text-muted-foreground">
                            {currentKeys?.secretKey ? maskKey(currentKeys.secretKey, 6, 4) : "Not issued"}
                          </div>
                        </div>
                        {currentKeys?.secretKey && (
                          <CopyButton value={currentKeys.secretKey} label={`${mode} secret key`} />
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
            </Card>

            {revealedPrivateKey && (
              <div className="mt-4 rounded-none border border-warning/40 bg-warning/10 px-5 py-4">
                <div className="text-sm font-semibold">New private key</div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-muted-foreground">
                      This private key is shown once. Copy and store it securely.
                    </div>
                    <div className="mt-1 break-all font-mono text-xs">{revealedPrivateKey}</div>
                  </div>
                  <CopyButton value={revealedPrivateKey} label={`${mode} private key`} />
                </div>
              </div>
            )}

            <p className="mt-3 text-xs text-muted-foreground">
              Never share secret keys publicly or commit them to source control. Rotate immediately if exposed.
            </p>
          </>
        )
      )}

      {canManageCallback && (
        callbackForbidden ? (
          <AccessDenied description="You don't have permission to manage callback URLs." />
        ) : (
          <Card size="sm">
              <CardHeader className="border-b">
                <CardTitle>Callback URLs</CardTitle>
                <CardDescription>Payments in each mode are sent to that mode's URL.</CardDescription>
              </CardHeader>
              <CardContent className="divide-y p-0">
                {loadingCallback ? (
                  <div className="px-6 py-5 text-sm text-muted-foreground">Loading callback URL…</div>
                ) : callbackError ? (
                  <div className="px-6 py-5 text-sm text-destructive">{callbackError}</div>
                ) : (
                  (["test", "live"] as const).map((rowMode) => {
                    const draftValue = drafts[rowMode];
                    const trimmed = draftValue.trim();
                    const rowError = urlError[rowMode];
                    const helpId = `callback-url-${rowMode}-help`;
                    const errorId = `callback-url-${rowMode}-error`;
                    const modeLabel = rowMode === "live" ? "Live" : "Test";
                    return (
                      <div key={rowMode} className="space-y-2 px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{modeLabel}</span>
                          <span className="rounded-none border border-border bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                            {rowMode}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Input
                            id={`callback-url-${rowMode}`}
                            type="url"
                            placeholder="https://example.com/webhooks/icad"
                            value={draftValue}
                            className="min-w-0 flex-1"
                            aria-invalid={rowError ? true : undefined}
                            aria-describedby={rowError ? `${helpId} ${errorId}` : helpId}
                            onChange={(e) => {
                              const value = e.target.value;
                              setDrafts((prev) => ({ ...prev, [rowMode]: value }));
                              setUrlError((prev) => ({ ...prev, [rowMode]: null }));
                            }}
                          />
                          {trimmed && (
                            <CopyButton value={trimmed} label={`${modeLabel} callback URL`} />
                          )}
                          <Button
                            size="xs"
                            onClick={() => void saveCallback(rowMode)}
                            disabled={loadingCallback || savingCallback !== null || trimmed === savedUrls[rowMode]}
                          >
                            Save
                          </Button>
                        </div>
                        <p id={helpId} className="text-xs text-muted-foreground">
                          Leave blank and save to clear it.
                        </p>
                        {rowError && (
                          <p id={errorId} className="text-xs text-destructive">{rowError}</p>
                        )}
                      </div>
                    );
                  })
                )}
              </CardContent>
          </Card>
        )
      )}

      <ConfirmDialog
        open={confirmRotate}
        onOpenChange={(o) => !o && setConfirmRotate(false)}
        title="Rotate API keys?"
        description={`The current ${mode} keys will be invalidated immediately. Update any integrations using them.`}
        confirmLabel="Rotate keys"
        variant="destructive"
        onConfirm={() => {
          setConfirmRotate(false);
          void rotateKeys();
        }}
      />
    </div>
  );
}
