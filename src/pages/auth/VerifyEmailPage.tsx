import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeftIcon, ArrowRightIcon, CheckCircle2Icon, XCircleIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { verifyEmail } from "@/lib/auth/merchantAuthApi";
import { cn } from "@/lib/utils";
import { AuthApiError } from "@/types/auth";

type VerifyState = "pending" | "success" | "error";

/** Friendlier copy for known backend error codes; falls back to the raw message otherwise. */
function friendlyErrorMessage(err: unknown): string {
  if (err instanceof AuthApiError) {
    if (err.code === "auth.tokeninvalid") {
      return "This verification link is invalid or has expired. Request a new one below.";
    }
    return err.message;
  }
  return "Something went wrong while verifying your email. Please try again.";
}

export function VerifyEmailPage() {
  const navigate = useNavigate();
  // Captured once on first render so clearing the URL below doesn't re-derive a null token.
  const [token] = useState(() => new URLSearchParams(window.location.search).get("token"));
  const [state, setState] = useState<VerifyState>(token ? "pending" : "error");
  const [alreadyVerified, setAlreadyVerified] = useState(false);
  const [message, setMessage] = useState(() =>
    token ? "" : "This verification link is missing its token. Request a new one below.",
  );

  useEffect(() => {
    if (!token) return;
    // Drop the token from the URL/history once read, so it doesn't linger in the address bar.
    navigate("/verify-email", { replace: true });
    let cancelled = false;
    void verifyEmail(token)
      .then(() => {
        if (cancelled) return;
        setState("success");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        // Already-verified isn't really a failure from the user's perspective.
        if (err instanceof AuthApiError && err.code === "auth.email_already_verified") {
          setAlreadyVerified(true);
          setState("success");
          return;
        }
        setState("error");
        setMessage(friendlyErrorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const isSuccess = state === "success";

  return (
    <div aria-live="polite">
      {!isSuccess && (
        <Link to="/login" className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeftIcon className="size-3" /> Back to sign in
        </Link>
      )}

      <div
        className={cn(
          "flex size-10 items-center justify-center rounded-full",
          !isSuccess && "mt-6",
          state === "error" ? "bg-destructive/10" : "bg-primary/10",
        )}
      >
        {state === "pending" && <Spinner className="size-5 text-primary" />}
        {state === "success" && <CheckCircle2Icon className="size-5 text-primary" />}
        {state === "error" && <XCircleIcon className="size-5 text-destructive" />}
      </div>

      <h1 className="mt-4 text-3xl font-semibold tracking-tight">
        {state === "pending" && "Verifying your email"}
        {state === "success" && "Email verified"}
        {state === "error" && "Couldn't verify your email"}
      </h1>

      {state === "pending" && (
        <p className="mt-2 text-sm text-muted-foreground">This only takes a moment.</p>
      )}

      {state === "success" && (
        <>
          <p className="mt-2 text-sm text-muted-foreground">
            {alreadyVerified
              ? "This email was already verified. Sign in with the password you chose when you created your account."
              : "Your email is verified. Sign in with the password you chose when you created your account."}
          </p>
          <Button asChild className="mt-8 w-full">
            <Link to="/login">
              Sign in <ArrowRightIcon data-icon="inline-end" />
            </Link>
          </Button>
        </>
      )}

      {state === "error" && (
        <>
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>{message}</AlertDescription>
          </Alert>
          <Button asChild className="mt-8 w-full">
            <Link to="/resend-verification">Request a new verification email</Link>
          </Button>
        </>
      )}
    </div>
  );
}
