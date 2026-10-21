import { Outlet } from "react-router-dom";
import { Logo } from "@/components/common/Logo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export function AuthLayout() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative flex flex-col p-6 lg:p-10">
        <div className="flex items-center justify-between">
          <Logo />
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-md">
            <Outlet />
          </div>
        </div>
        <p className="mt-6 text-xs text-muted-foreground">
          ICAD Pay · Licensed Payment Solution Service Provider
        </p>
      </div>

      <div className="relative hidden overflow-hidden bg-primary text-primary-foreground lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.18),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,rgba(255,255,255,0.10),transparent_50%)]" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <div>
            <span className="text-xs font-medium text-primary-foreground/80">
              Built for African businesses
            </span>
            <h1 className="font-heading mt-6 text-5xl font-semibold leading-tight tracking-tight text-primary-foreground">
              Accept payments,<br />
              pay your team,<br />
              grow your business.
            </h1>
            <p className="mt-6 max-w-md text-primary-foreground/80">
              The payment infrastructure trusted by 12,000+ Nigerian merchants — from mainland markets
              to listed enterprises.
            </p>
          </div>
          <ul className="grid grid-cols-3 gap-4 text-sm">
            <li>
              <div className="font-heading text-3xl font-semibold">99.99%</div>
              <div className="text-xs text-primary-foreground/70">uptime SLA</div>
            </li>
            <li>
              <div className="font-heading text-3xl font-semibold">₦2.4T+</div>
              <div className="text-xs text-primary-foreground/70">processed</div>
            </li>
            <li>
              <div className="font-heading text-3xl font-semibold">T+1</div>
              <div className="text-xs text-primary-foreground/70">settlements</div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
