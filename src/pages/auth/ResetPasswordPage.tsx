import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeftIcon, ArrowRightIcon, CheckCircle2Icon, EyeIcon, EyeOffIcon, XCircleIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPassword } from "@/lib/auth/merchantAuthApi";
import { AuthApiError } from "@/types/auth";
import { toast } from "sonner";

type PageState = "form" | "success" | "invalid";

const MISSING_TOKEN_MESSAGE = "This reset link is missing its token. Request a new one below.";
const INVALID_TOKEN_MESSAGE = "This reset link is invalid or has expired. Request a new one below.";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  // Captured once on first render so clearing the URL below doesn't re-derive a null token.
  const [token] = useState(() => new URLSearchParams(window.location.search).get("token"));
  const [state, setState] = useState<PageState>(token ? "form" : "invalid");
  const [invalidMessage, setInvalidMessage] = useState(MISSING_TOKEN_MESSAGE);
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    navigate("/reset-password", { replace: true });
  }, [token, navigate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) {
      setInvalidMessage(MISSING_TOKEN_MESSAGE);
      setState("invalid");
      return;
    }
    setSubmitting(true);
    try {
      await resetPassword({ token, newPassword: password });
      setState("success");
    } catch (err) {
      if (
        err instanceof AuthApiError &&
        (err.code === "auth.tokeninvalid" || err.code === "auth.tokenexpired")
      ) {
        setInvalidMessage(INVALID_TOKEN_MESSAGE);
        setState("invalid");
        return;
      }
      const message =
        err instanceof AuthApiError ? err.message : "Could not reset your password. Try again.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      {state !== "success" && (
        <Link to="/login" className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeftIcon className="size-3" /> Back to sign in
        </Link>
      )}

      {state === "form" && (
        <>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">
            Choose a new password
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter a new password for your account.
          </p>
          <form onSubmit={(e) => void handleSubmit(e)} className="mt-8 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password">New password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
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
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Saving…" : "Reset password"}
            </Button>
          </form>
        </>
      )}

      {state === "success" && (
        <>
          <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2Icon className="size-5 text-primary" />
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">
            Password updated
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your password has been reset. Sign in with your new password.
          </p>
          <Button asChild className="mt-8 w-full">
            <Link to="/login">
              Sign in <ArrowRightIcon data-icon="inline-end" />
            </Link>
          </Button>
        </>
      )}

      {state === "invalid" && (
        <>
          <div className="mt-6 flex size-10 items-center justify-center rounded-full bg-destructive/10">
            <XCircleIcon className="size-5 text-destructive" />
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">
            This reset link isn't valid
          </h1>
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>{invalidMessage}</AlertDescription>
          </Alert>
          <Button asChild className="mt-8 w-full">
            <Link to="/forgot-password">Request a new reset link</Link>
          </Button>
        </>
      )}
    </div>
  );
}
