import { useState } from "react";
import { MenuIcon, SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ModeToggle } from "./ModeToggle";
import { ThemeToggle } from "./ThemeToggle";
import { ProfileMenu } from "./ProfileMenu";
import { NotificationsPopover } from "./NotificationsPopover";
import { Sidebar } from "./Sidebar";
import { Logo } from "@/components/common/Logo";
import { Link } from "react-router-dom";
import { useAppStore } from "@/store/useAppStore";
import { StatusBadge } from "@/components/common/StatusBadge";

export function Topbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const user = useAppStore((s) => s.user);
  const onboardingStatus = user?.onboardingStatus;
  const percent = user?.onboardingPercentComplete;
  const showKyc =
    onboardingStatus &&
    onboardingStatus !== "Approved" &&
    onboardingStatus !== "approved";
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur supports-backdrop-filter:bg-background/65 lg:px-6">
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon-sm" className="lg:hidden" aria-label="Open menu">
            <MenuIcon />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[260px] p-0">
          <Sidebar />
        </SheetContent>
      </Sheet>

      <div className="lg:hidden">
        <Logo />
      </div>

      <div className="ml-1 hidden flex-1 max-w-md md:block">
        <button
          type="button"
          className="flex h-9 w-full items-center gap-2.5 rounded-lg border border-border bg-muted/50 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <SearchIcon className="size-4" />
          <span>Search transactions, customers, links…</span>
          <kbd className="ml-auto rounded-md border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">
            ⌘K
          </kbd>
        </button>
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        {showKyc && (
          <Button asChild variant="outline" size="sm" className="hidden md:inline-flex">
            <Link to="/onboarding">
              KYC <StatusBadge status={String(onboardingStatus).replaceAll("_", " ")} className="ml-2" />
              {typeof percent === "number" ? (
                <span className="ml-2 text-xs text-muted-foreground">{percent}%</span>
              ) : null}
            </Link>
          </Button>
        )}
        <ModeToggle />
        <ThemeToggle />
        <NotificationsPopover />
        <div className="mx-1 hidden h-6 w-px bg-border md:block" />
        <ProfileMenu />
      </div>
    </header>
  );
}
