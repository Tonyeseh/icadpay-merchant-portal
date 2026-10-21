import { type FormEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Spinner } from "@/components/ui/spinner";
import * as bankVerificationApi from "@/lib/api/bankVerificationApi";
import { describeSubaccountError } from "@/lib/subaccountErrors";
import { formatNaira } from "@/lib/format";
import { cn } from "@/lib/utils";
import { banks } from "@/mock/banks";
import { useSubaccountsStore } from "@/store/useSubaccountsStore";
import { useAppStore } from "@/store/useAppStore";
import { AuthApiError } from "@/types/auth";
import type { CreateSubaccountRequest, SplitMode } from "@/types/subaccounts";

function showError(err: unknown, fallback = "Something went wrong") {
  if (err instanceof AuthApiError) {
    toast.error(err.message);
    return;
  }
  if (err instanceof Error) {
    toast.error(err.message || fallback);
    return;
  }
  toast.error(fallback);
}

function pairKey(bank: string, acct: string) {
  return `${bank}|${acct}`;
}

function isEligible(bank: string, acct: string) {
  return bank !== "" && /^\d{10}$/.test(acct) && banks.some((b) => b.code === bank);
}

function splitFieldsValid(mode: SplitMode, sharePercent: number, flatAmount: number) {
  if (mode === "Percentage") {
    const p = Math.trunc(sharePercent);
    return !Number.isNaN(p) && p >= 0 && p <= 100;
  }
  const f = Math.trunc(flatAmount);
  return !Number.isNaN(f) && f > 0;
}

export function CreateSubaccountDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const create = useSubaccountsStore((s) => s.create);
  const activeMerchantId = useAppStore((s) => s.activeMerchantId);

  const [businessName, setBusinessName] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifiedKey, setVerifiedKey] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [splitMode, setSplitMode] = useState<SplitMode>("Percentage");
  const [sharePercent, setSharePercent] = useState<number>(25);
  const [flatAmount, setFlatAmount] = useState<number>(10000);
  const [submitting, setSubmitting] = useState(false);
  const verifySeq = useRef(0);
  const merchantRef = useRef(activeMerchantId);

  useEffect(() => {
    return () => {
      verifySeq.current += 1;
    };
  }, []);

  useEffect(() => {
    if (merchantRef.current === activeMerchantId) return;
    merchantRef.current = activeMerchantId;
    verifySeq.current += 1;
    setAccountName("");
    setVerifiedKey(null);
    setVerifyError(null);
    setVerifying(false);
  }, [activeMerchantId]);

  function reset() {
    verifySeq.current += 1;
    setBusinessName("");
    setBankCode("");
    setAccountNumber("");
    setAccountName("");
    setVerifiedKey(null);
    setVerifyError(null);
    setVerifying(false);
    setSplitMode("Percentage");
    setSharePercent(25);
    setFlatAmount(10000);
    setSubmitting(false);
  }

  async function runVerify(bank: string, acct: string) {
    const seq = ++verifySeq.current;
    const startedMerchant = activeMerchantId;
    setVerifying(true);
    try {
      const result = await bankVerificationApi.verifyBankAccount({ bankCode: bank, accountNumber: acct });
      if (seq !== verifySeq.current || useAppStore.getState().activeMerchantId !== startedMerchant) return;
      const name = typeof result?.accountName === "string" ? result.accountName.trim() : "";
      if (!name) {
        setAccountName("");
        setVerifiedKey(null);
        setVerifyError("Could not verify account name");
        return;
      }
      setAccountName(name);
      setVerifiedKey(pairKey(bank, acct));
      setVerifyError(null);
    } catch (err) {
      if (seq !== verifySeq.current || useAppStore.getState().activeMerchantId !== startedMerchant) return;
      setAccountName("");
      setVerifiedKey(null);
      setVerifyError(err instanceof Error && err.message ? err.message : "Could not verify account");
      showError(err, "Could not verify account");
    } finally {
      if (seq === verifySeq.current && useAppStore.getState().activeMerchantId === startedMerchant) {
        setVerifying(false);
      }
    }
  }

  function applyPair(nextBank: string, nextAcct: string) {
    if (nextBank === bankCode && nextAcct === accountNumber) return;
    verifySeq.current += 1;
    setAccountName("");
    setVerifiedKey(null);
    setVerifyError(null);
    setVerifying(false);
    setBankCode(nextBank);
    setAccountNumber(nextAcct);
    if (submitting || !isEligible(nextBank, nextAcct)) return;
    void runVerify(nextBank, nextAcct);
  }

  const trimmedName = accountName.trim();
  const canSubmit =
    businessName.trim().length >= 1 &&
    businessName.trim().length <= 256 &&
    !submitting &&
    !verifying &&
    trimmedName.length >= 1 &&
    trimmedName.length <= 200 &&
    verifiedKey === pairKey(bankCode, accountNumber) &&
    splitFieldsValid(splitMode, sharePercent, flatAmount);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    const bank = banks.find((b) => b.code === bankCode);
    if (!bank) return;

    const body: CreateSubaccountRequest = {
      businessName: businessName.trim(),
      bankCode,
      bankName: bank.name,
      accountNumber,
      accountName,
      splitMode,
      ...(splitMode === "Percentage"
        ? { sharePercent: Math.trunc(sharePercent) }
        : { flatAmount: Math.trunc(flatAmount) }),
    };

    setSubmitting(true);
    try {
      await create(body);
      toast.success("Subaccount created");
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error("Unable to create subaccount", { description: describeSubaccountError(err) });
      setSubmitting(false);
    }
  }

  const flatPreview =
    splitMode === "FixedPlatformAmount" ? formatNaira(Math.max(0, Math.trunc(flatAmount))) : null;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add subaccount</DialogTitle>
          <DialogDescription>
            Split beneficiaries receive part of each payment according to the default split rule. The account name is
            filled from the bank before you can create the subaccount.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="sub-biz">Business name</Label>
            <Input
              id="sub-biz"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Partner Vendor Ltd"
              required
              autoComplete="organization"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sub-bank">Bank</Label>
            <Select value={bankCode} onValueChange={(v) => applyPair(v, accountNumber)} disabled={submitting}>
              <SelectTrigger id="sub-bank" className="w-full">
                <SelectValue className="truncate" placeholder="Select bank" />
              </SelectTrigger>
              <SelectContent>
                {banks.map((b) => (
                  <SelectItem key={b.code} value={b.code}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sub-acct">Account number</Label>
            <Input
              id="sub-acct"
              inputMode="numeric"
              maxLength={10}
              value={accountNumber}
              disabled={submitting}
              onChange={(e) => applyPair(bankCode, e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="0123456789"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sub-acct-name">Account name</Label>
            <div className="relative">
              <Input
                id="sub-acct-name"
                value={accountName}
                readOnly
                placeholder={
                  verifying
                    ? "Verifying account…"
                    : "Filled automatically once you enter your 10-digit account number"
                }
                className={cn("bg-muted/40 dark:bg-muted/40", verifying && "pr-8")}
              />
              {verifying ? (
                <Spinner className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground" />
              ) : null}
            </div>
            {verifyError ? <p className="text-xs text-destructive">{verifyError}</p> : null}
          </div>

          <div className="space-y-2">
            <Label>Default split</Label>
            <RadioGroup
              value={splitMode}
              onValueChange={(v) => setSplitMode(v as SplitMode)}
              className="grid gap-2"
            >
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2">
                <RadioGroupItem value="Percentage" id="mode-pct" />
                <span className="text-sm">Percentage — platform share of gross</span>
              </label>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2">
                <RadioGroupItem value="FixedPlatformAmount" id="mode-flat" />
                <span className="text-sm">Fixed amount — platform takes a flat fee (minor units)</span>
              </label>
            </RadioGroup>
          </div>

          {splitMode === "Percentage" ? (
            <div className="space-y-1.5">
              <Label htmlFor="sub-pct">Platform share (%)</Label>
              <Input
                id="sub-pct"
                inputMode="numeric"
                type="number"
                min={0}
                max={100}
                step={1}
                value={sharePercent}
                onChange={(e) => setSharePercent(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Integer from 0 to 100 (share allocated to your primary settlement leg).
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="sub-flat">Fixed platform amount (kobo)</Label>
              <Input
                id="sub-flat"
                inputMode="numeric"
                type="number"
                min={1}
                step={1}
                value={flatAmount}
                onChange={(e) => setFlatAmount(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Enter minor units (e.g. NGN kobo). Preview: {flatPreview}
              </p>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            The account name is filled from the bank before you can create the subaccount.
          </p>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {submitting ? "Creating..." : "Create subaccount"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
