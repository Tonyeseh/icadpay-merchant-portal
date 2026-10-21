import { type FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowRightIcon, EyeIcon, EyeOffIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getMerchantTermsUrl } from "@/lib/env";
import { register } from "@/lib/auth/merchantAuthApi";
import { AuthApiError } from "@/types/auth";
import { useAppStore } from "@/store/useAppStore";
import { toast } from "sonner";

export function SignupPage() {
  const navigate = useNavigate();
  const user = useAppStore((s) => s.user);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const merchantTermsUrl = getMerchantTermsUrl();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await register({
        firstName,
        lastName,
        email,
        password,
        businessName,
        ...(phoneNumber.trim() ? { phoneNumber: phoneNumber.trim() } : {}),
      });
      navigate("/check-email", { replace: true, state: { email } });
    } catch (err) {
      const message =
        err instanceof AuthApiError ? err.message : "Could not create your account. Try again.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">
        Create account
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Start accepting payments in under 5 minutes.
      </p>

      <form onSubmit={(e) => void handleSubmit(e)} className="mt-8 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="first">First name</Label>
            <Input id="first" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="last">Last name</Label>
            <Input id="last" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Work email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="business">Business name</Label>
          <Input id="business" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone (optional)</Label>
          <Input
            id="phone"
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="+234 …"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
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
          <p className="text-[11px] text-muted-foreground">
            Min. 8 characters with upper, lower, digit, and special character.
          </p>
        </div>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Creating account…" : "Create account"} <ArrowRightIcon data-icon="inline-end" />
        </Button>
        <p className="text-center text-[11px] text-muted-foreground">
          By creating an account you agree to our{" "}
          {merchantTermsUrl ? (
            <a
              href={merchantTermsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary underline underline-offset-2"
            >
              merchant terms
            </a>
          ) : (
            <span className="underline">merchant terms</span>
          )}{" "}
          and <span className="underline">privacy policy</span>.
        </p>
      </form>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Already on ICAD Pay?{" "}
        <Link to="/login" className="font-semibold text-foreground hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
