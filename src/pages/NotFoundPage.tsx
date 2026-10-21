import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/common/Logo";

export function NotFoundPage() {
  return (
    <div className="grid min-h-screen place-items-center px-6 text-center">
      <div className="flex flex-col items-center gap-6">
        <Logo />
        <h1 className="font-heading text-7xl font-semibold tracking-tight">404</h1>
        <p className="max-w-md text-muted-foreground">
          The page you're looking for has moved, been deactivated, or never existed.
        </p>
        <Button asChild>
          <Link to="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
