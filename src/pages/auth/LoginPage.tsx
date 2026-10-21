import { type FormEvent, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ArrowRightIcon, EyeIcon, EyeOffIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { login } from "@/lib/auth/merchantAuthApi";
import { armOnboardingPrompt, isOnboardingDestination } from "@/lib/onboardingPrompt";
import { AuthApiError, EMAIL_NOT_VERIFIED_CODE } from "@/types/auth";
import { useAppStore } from "@/store/useAppStore";
import { toast } from "sonner";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAppStore((s) => s.user);
  const applyAuthResponse = useAppStore((s) => s.applyAuthResponse);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const session = await login({ email, password });
      applyAuthResponse(session);
      toast.success(`Welcome back, ${session.user.firstName}`);
      const from = (location.state as { from?: string })?.from;
      const destination = from && from !== "/login" ? from : "/dashboard";
      if (!isOnboardingDestination(destination)) {
        armOnboardingPrompt();
      }
      navigate(destination, { replace: true });
    } catch (err) {
      if (err instanceof AuthApiError && err.code === EMAIL_NOT_VERIFIED_CODE) {
        navigate("/resend-verification", { state: { email } });
        return;
      }
      const message =
        err instanceof AuthApiError ? err.message : "Could not sign you in. Try again.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">
        Sign in
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Enter your merchant credentials to access your dashboard.
      </p>

      <form onSubmit={(e) => void handleSubmit(e)} className="mt-8 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/forgot-password" className="text-xs font-semibold text-primary hover:underline">
              Forgot?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="pr-10"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-2 grid place-items-center text-muted-foreground hover:text-foreground"
              onClick={() => setShowPw((s) => !s)}
              aria-label={showPw ? "Hide password" : "Show password"}
            >
              {showPw ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="remember" defaultChecked />
          <Label htmlFor="remember" className="text-sm font-normal normal-case tracking-normal">
            Keep me signed in for 14 days
          </Label>
        </div>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in"} <ArrowRightIcon data-icon="inline-end" />
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Don't have an account?{" "}
        <Link to="/signup" className="font-semibold text-foreground hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
