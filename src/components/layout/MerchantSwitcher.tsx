import { type FormEvent, useState } from "react";
import { ChevronDownIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useActiveMerchantLogo } from "@/hooks/useActiveMerchantLogo";
import { useHasPermission } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { useAppStore } from "@/store/useAppStore";
import { getStoredAccessToken } from "@/lib/auth/accessToken";
import { refresh } from "@/lib/auth/merchantAuthApi";
import * as merchantsApi from "@/lib/api/merchantsApi";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

type MerchantSwitcherProps = {
  collapsed: boolean;
};

export function MerchantSwitcher({ collapsed }: MerchantSwitcherProps) {
  const merchants = useAppStore((s) => s.merchants);
  const activeMerchantId = useAppStore((s) => s.activeMerchantId);
  const switchMerchantAccount = useAppStore((s) => s.switchMerchantAccount);
  const setActiveMerchant = useAppStore((s) => s.setActiveMerchant);
  const applyAuthResponse = useAppStore((s) => s.applyAuthResponse);
  const clearSession = useAppStore((s) => s.clearSession);

  const [addOpen, setAddOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [displayName, setDisplayName] = useState("");

  const active =
    merchants.find((m) => m.id === activeMerchantId) ?? merchants[0] ?? null;
  const canViewSettings = useHasPermission(PERMISSIONS["settings.view"]);
  const canViewOnboarding = useHasPermission(PERMISSIONS["onboarding.view"]);
  const logoUrl = useActiveMerchantLogo(
    active?.id ?? null,
    active?.logoKey ?? null,
    canViewSettings,
    canViewOnboarding,
  );
  const [failedLogoUrl, setFailedLogoUrl] = useState<string | null>(null);

  const multi = merchants.length > 1;

  if (!active || merchants.length === 0) {
    return null;
  }

  const showLogo = logoUrl != null && failedLogoUrl !== logoUrl;

  async function onMerchantChange(id: string) {
    if (id === activeMerchantId) return;
    if (multi) {
      try {
        await switchMerchantAccount(id);
      } catch {
        toast.error("Could not switch merchant. Try again.");
      }
      return;
    }
    setActiveMerchant(id);
  }

  async function onCreateMerchant(e: FormEvent) {
    e.preventDefault();
    const token = getStoredAccessToken();
    if (!token) {
      clearSession();
      toast.error("Your session has expired. Please sign in again.");
      return;
    }
    const name = displayName.trim();
    if (!name) return;

    setCreating(true);
    try {
      const created = await merchantsApi.createMerchant({ displayName: name });
      const session = await refresh(token);
      applyAuthResponse(session);
      await switchMerchantAccount(created.id);
      toast.success("Merchant created");
      setAddOpen(false);
      setDisplayName("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create merchant");
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            "flex w-full items-center gap-2.5 rounded-lg border border-border bg-sidebar px-2.5 py-2 text-left outline-none transition-colors",
            "hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
            collapsed && "size-10 justify-center p-0",
          )}
          aria-label="Switch merchant"
        >
          <div
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-md bg-[var(--ink-1)] text-[13px] font-bold text-white",
            )}
          >
            {showLogo ? (
              <img
                src={logoUrl}
                alt=""
                className="size-full rounded-md object-cover"
                onError={() => setFailedLogoUrl(logoUrl)}
              />
            ) : (
              initialsFromName(active.name)
            )}
          </div>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold text-sidebar-foreground">
                  {active.name}
                </div>
                <div className="truncate text-[11px] text-muted-foreground">{active.planLabel}</div>
              </div>
              <ChevronDownIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            </>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="min-w-[var(--radix-dropdown-menu-trigger-width)] max-w-[280px]"
          align="start"
          sideOffset={6}
        >
          <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
            Switch merchant
          </DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={activeMerchantId ?? active.id}
            onValueChange={(id) => void onMerchantChange(id)}
          >
            {merchants.map((m) => (
              <DropdownMenuRadioItem
                key={m.id}
                value={m.id}
                className="cursor-pointer items-start py-2 pl-2 [&>span:first-child]:top-2.5"
              >
                <span className="flex min-w-0 flex-col gap-0.5 pr-6">
                  <span className="truncate font-medium">{m.name}</span>
                  <span className="truncate text-xs text-muted-foreground">{m.planLabel}</span>
                </span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setAddOpen(true)}>
            <PlusIcon className="size-4" /> Add merchant
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add merchant</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => void onCreateMerchant(e)} className="grid gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="merchantName">Business name</Label>
              <Input
                id="merchantName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="My Business"
                disabled={creating}
                autoFocus
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)} disabled={creating}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? "Creating..." : "Create merchant"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
