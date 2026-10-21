import { Outlet } from "react-router-dom";
import { Logo } from "@/components/common/Logo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { ProfileMenu } from "@/components/layout/ProfileMenu";

export function WizardLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-16 items-center justify-between border-b px-6">
        <Logo />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <ProfileMenu />
        </div>
      </header>
      <main className="flex flex-1 justify-center px-4 py-8 lg:py-12">
        <div className="w-full max-w-5xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
