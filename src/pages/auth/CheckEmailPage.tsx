import { useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { MailCheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resendVerificationEmail } from "@/lib/auth/merchantAuthApi";
import { AuthApiError } from "@/types/auth";
import { toast } from "sonner";

export function CheckEmailPage() {
  const location = useLocation();
  const email = (location.state as { email?: string })?.email;
  const [submitting, setSubmitting] = useState(false);

  if (!email) {
    return <Navigate to="/resend-verification" replace />;
  }

  async function handleResend() {
    setSubmitting(true);
    try {
      await resendVerificationEmail(email as string);
      toast.success("Verification email sent", {
        description: "Check your inbox for the new link.",
      });
    } catch (err) {
      const message =
        err instanceof AuthApiError ? err.message : "Could not send verification email. Try again.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
        <MailCheckIcon className="size-5 text-primary" />
      </div>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">
        Verify your email
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        We sent a verification link to <span className="font-medium text-foreground">{email}</span>.
        Open it to activate your account before signing in.
      </p>

      <Button
        type="button"
        variant="outline"
        className="mt-8 w-full"
        disabled={submitting}
        onClick={() => void handleResend()}
      >
        {submitting ? "Resending…" : "Resend verification email"}
      </Button>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Already verified?{" "}
        <Link to="/login" className="font-semibold text-foreground hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
