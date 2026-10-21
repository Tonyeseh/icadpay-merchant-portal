import { NavLink } from "react-router-dom";
import {
  LayoutDashboardIcon,
  ReceiptIcon,
  UsersIcon,
  LinkIcon,
  PieChartIcon,
  WalletIcon,
  SettingsIcon,
  ChevronLeftIcon,
  CircleHelpIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/common/Logo";
import { MerchantSwitcher } from "@/components/layout/MerchantSwitcher";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
import { hasAny, PERMISSIONS } from "@/lib/auth/permissions";

const sections: {
  heading: string;
  items: { to: string; label: string; Icon: typeof LayoutDashboardIcon; anyOf?: readonly string[] }[];
}[] = [
  {
    heading: "Overview",
    items: [{ to: "/dashboard", label: "Dashboard", Icon: LayoutDashboardIcon }],
  },
  {
    heading: "Business",
    items: [
      { to: "/transactions", label: "Transactions", Icon: ReceiptIcon, anyOf: [PERMISSIONS["transactions.view"]] },
      { to: "/customers", label: "Customers", Icon: UsersIcon },
      { to: "/payment-links", label: "Payment Links", Icon: LinkIcon },
      { to: "/subaccounts", label: "Subaccounts", Icon: PieChartIcon, anyOf: [PERMISSIONS["subaccounts.view"]] },
      { to: "/payouts", label: "Payouts", Icon: WalletIcon },
    ],
  },
  {
    heading: "Tools",
    items: [
      {
        to: "/settings",
        label: "Settings",
        Icon: SettingsIcon,
        anyOf: [
          PERMISSIONS["settings.view"],
          PERMISSIONS["settlement_bank_account.view"],
          PERMISSIONS["team.view"],
          PERMISSIONS["developer.view_keys"],
          PERMISSIONS["developer.manage_callback"],
        ],
      },
    ],
  },
];

export function Sidebar() {
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggle = useAppStore((s) => s.toggleSidebar);
  const permissions = useAppStore((s) => s.permissions);
  const visibleSections = sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.anyOf || hasAny(permissions, item.anyOf)),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground transition-[width] duration-200 lg:flex",
        collapsed ? "w-[76px]" : "w-[248px]",
      )}
    >
      <div className={cn("flex h-16 items-center border-b px-5", collapsed && "justify-center px-2")}>
        <Logo showWord={!collapsed} />
      </div>
      <div
        className={cn(
          "border-b px-3 pt-3 pb-2",
          collapsed && "flex justify-center px-2 pt-2 pb-2",
        )}
      >
        <MerchantSwitcher collapsed={collapsed} />
      </div>
      <nav className="flex-1 overflow-y-auto py-4 scrollbar-thin">
        {visibleSections.map((section) => (
          <div key={section.heading} className="mb-5">
            {!collapsed && (
              <div className="mb-1.5 px-5 text-xs font-medium text-muted-foreground">
                {section.heading}
              </div>
            )}
            <ul className="space-y-0.5 px-3">
              {section.items.map(({ to, label, Icon }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={to === "/"}
                    className={({ isActive }) =>
                      cn(
                        "group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        isActive &&
                          "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary",
                        collapsed && "justify-center px-2",
                      )
                    }
                  >
                    <Icon className="size-[18px] shrink-0" />
                    {!collapsed && <span className="truncate">{label}</span>}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className={cn("border-t p-3", collapsed && "p-2")}>
        {!collapsed && (
          <a
            href="#"
            className="mb-2 flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <CircleHelpIcon className="size-[18px]" />
            <span>Help & support</span>
          </a>
        )}
        <Button
          variant="ghost"
          size={collapsed ? "icon-sm" : "sm"}
          className={cn("w-full", collapsed ? "" : "justify-start")}
          onClick={toggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeftIcon className={cn("transition-transform", collapsed && "rotate-180")} />
          {!collapsed && <span>Collapse</span>}
        </Button>
      </div>
    </aside>
  );
}
