import { type FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forgotPassword } from "@/lib/auth/merchantAuthApi";
import { AuthApiError } from "@/types/auth";
import { toast } from "sonner";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err) {
      const message =
        err instanceof AuthApiError ? err.message : "Could not send reset email. Try again.";
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
        Reset password
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Enter the email on your account and we'll send you a link to choose a new password.
      </p>

      {sent ? (
        <p className="mt-8 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          If an account with that email exists, a reset email has been sent
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
            {submitting ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      )}
    </div>
  );
}
