import { useRef, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { switchToLive, switchToTest } from "@/lib/api/settingsApi";
import { AuthApiError } from "@/types/auth";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { useHasPermission } from "@/hooks/usePermissions";

function showSwitchError(err: unknown) {
  if (err instanceof AuthApiError) {
    toast.error(err.message);
    return;
  }
  if (err instanceof Error && err.message) {
    toast.error(err.message);
    return;
  }
  toast.error("Could not switch mode");
}

export function ModeToggle() {
  const mode = useAppStore((s) => s.mode);
  const setMode = useAppStore((s) => s.setMode);
  const canUpdate = useHasPermission(PERMISSIONS["settings.update"]);
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);

  async function commit(target: "test" | "live") {
    if (inFlight.current || !canUpdate || target === mode) return;
    inFlight.current = true;
    setPending(true);
    const merchantId = useAppStore.getState().activeMerchantId;
    try {
      if (target === "live") {
        await switchToLive();
      } else {
        await switchToTest();
      }
      if (useAppStore.getState().activeMerchantId !== merchantId) return;
      setMode(target);
      if (target === "test") {
        toast.message("Switched to test mode", {
          description: "All data shown is sandbox data.",
        });
      } else {
        toast.success("You're now in live mode", {
          description: "Real transactions are being shown.",
        });
      }
    } catch (err) {
      showSwitchError(err);
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  function flip(target: "test" | "live") {
    if (!canUpdate || pending) return;
    if (target === mode) return;
    if (target === "live") {
      setConfirming(true);
      return;
    }
    void commit("test");
  }

  return (
    <>
      <div
        className="inline-flex items-center rounded-full border border-border bg-muted/50 p-0.5 text-xs font-medium"
        aria-busy={pending}
        title={!canUpdate ? "You don't have permission to change account mode." : undefined}
      >
        <button
          type="button"
          onClick={() => flip("test")}
          disabled={pending || !canUpdate}
          className={cn(
            "rounded-full px-3 py-1 transition-colors disabled:cursor-not-allowed disabled:opacity-60",
            mode === "test"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Test
        </button>
        <button
          type="button"
          onClick={() => flip("live")}
          disabled={pending || !canUpdate}
          className={cn(
            "rounded-full px-3 py-1 transition-colors disabled:cursor-not-allowed disabled:opacity-60",
            mode === "live"
              ? "bg-success text-success-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <span className="inline-flex items-center gap-1.5">
            {mode === "live" && <span className="size-1.5 animate-pulse rounded-full bg-current" />}
            Live
          </span>
        </button>
      </div>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Switch to live mode?"
        description="In live mode you'll be working with real transactions and real customer money. Make sure your integration is fully tested before going live."
        confirmLabel="Yes, go live"
        onConfirm={() => commit("live")}
      />
    </>
  );
}
