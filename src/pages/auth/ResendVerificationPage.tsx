import { type FormEvent, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resendVerificationEmail } from "@/lib/auth/merchantAuthApi";
import { AuthApiError } from "@/types/auth";
import { toast } from "sonner";

export function ResendVerificationPage() {
  const location = useLocation();
  const prefillEmail = (location.state as { email?: string })?.email ?? "";
  const [email, setEmail] = useState(prefillEmail);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await resendVerificationEmail(email);
      setSent(true);
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
      <Link to="/login" className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-3" /> Back to sign in
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">
        Verify your email
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Your email address hasn't been verified yet. Enter it below and we'll send you a new verification link.
      </p>

      {sent ? (
        <p className="mt-8 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          If an account with that email exists, a verification email has been sent. Check your inbox.
        </p>
      ) : (
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
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Sending…" : "Resend verification email"}
          </Button>
        </form>
      )}
    </div>
  );
}
