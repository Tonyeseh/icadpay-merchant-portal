import { type FormEvent, type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AccessDenied } from "@/components/common/AccessDenied";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useHasPermission } from "@/hooks/usePermissions";
import * as bankVerificationApi from "@/lib/api/bankVerificationApi";
import * as settlementBankApi from "@/lib/api/settlementBankApi";
import type { SettlementBankAccountDto } from "@/lib/api/settlementBankApi";
import { isForbidden, PERMISSIONS } from "@/lib/auth/permissions";
import { banks } from "@/mock/banks";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import { AuthApiError } from "@/types/auth";

const CHIP_CLASS =
  "rounded-none border border-success/30 bg-success/10 px-1.5 py-0.5 text-[10px] font-semibold text-success";

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

function slotMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

function pairKey(bank: string, acct: string) {
  return `${bank}|${acct}`;
}

function isEligible(bank: string, acct: string) {
  return bank !== "" && /^\d{10}$/.test(acct) && banks.some((b) => b.code === bank);
}

function stillCurrent(gen: number, loadGen: number, merchantId: string | null): boolean {
  return loadGen === gen && useAppStore.getState().activeMerchantId === merchantId;
}

function AccountBox({ account, chips }: { account: SettlementBankAccountDto; chips?: ReactNode }) {
  return (
    <div className="rounded-none border border-border bg-muted/25 px-4 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-sm font-semibold">{account.accountName}</div>
        {chips}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        {account.bankName} · {account.accountNumber}
      </div>
    </div>
  );
}

export function SettlementAccountSection() {
  const canView = useHasPermission(PERMISSIONS["settlement_bank_account.view"]);
  const canUpdate = useHasPermission(PERMISSIONS["settlement_bank_account.update"]);
  const activeMerchantId = useAppStore((s) => s.activeMerchantId);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [current, setCurrent] = useState<SettlementBankAccountDto | null>(null);
  const [pending, setPending] = useState<SettlementBankAccountDto | null>(null);
  const [currentError, setCurrentError] = useState<string | null>(null);
  const [pendingError, setPendingError] = useState<string | null>(null);

  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifiedKey, setVerifiedKey] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const verifySeq = useRef(0);
  const loadGen = useRef(0);

  const scopeKey = `${canView}:${activeMerchantId ?? ""}`;
  const [seenScope, setSeenScope] = useState(scopeKey);
  if (seenScope !== scopeKey) {
    setSeenScope(scopeKey);
    setLoading(true);
    setSaving(false);
    setForbidden(false);
    setCurrent(null);
    setPending(null);
    setCurrentError(null);
    setPendingError(null);
    setBankCode("");
    setAccountNumber("");
    setAccountName("");
    setVerifiedKey(null);
    setVerifyError(null);
    setVerifying(false);
  }

  const resetForm = useCallback(() => {
    verifySeq.current += 1;
    setBankCode("");
    setAccountNumber("");
    setAccountName("");
    setVerifiedKey(null);
    setVerifyError(null);
    setVerifying(false);
  }, []);

  useEffect(() => {
    return () => {
      verifySeq.current += 1;
    };
  }, []);

  useEffect(() => {
    if (!canView) {
      loadGen.current += 1;
      verifySeq.current += 1;
      return;
    }
    const gen = ++loadGen.current;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setSaving(false);
      setForbidden(false);
      setCurrent(null);
      setPending(null);
      setCurrentError(null);
      setPendingError(null);
      resetForm();
      try {
        const [currentResult, pendingResult] = await Promise.allSettled([
          settlementBankApi.getSettlementBankAccount(),
          settlementBankApi.getPendingSettlementBankAccount(),
        ]);
        if (cancelled || loadGen.current !== gen) return;

        const currentForbidden = currentResult.status === "rejected" && isForbidden(currentResult.reason);
        const pendingForbidden = pendingResult.status === "rejected" && isForbidden(pendingResult.reason);
        if (currentForbidden || pendingForbidden) {
          setForbidden(true);
          return;
        }

        if (currentResult.status === "fulfilled") {
          setCurrent(currentResult.value);
          setCurrentError(null);
        } else {
          setCurrentError(slotMessage(currentResult.reason, "Could not load settlement account"));
          showError(currentResult.reason, "Could not load settlement account");
        }

        if (pendingResult.status === "fulfilled") {
          setPending(pendingResult.value);
          setPendingError(null);
        } else {
          setPendingError(slotMessage(pendingResult.reason, "Could not load the pending settlement account"));
          showError(pendingResult.reason, "Could not load the pending settlement account");
        }
      } finally {
        if (!cancelled && loadGen.current === gen) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canView, activeMerchantId, resetForm]);

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
    if (saving || !isEligible(nextBank, nextAcct)) return;
    void runVerify(nextBank, nextAcct);
  }

  const trimmedName = accountName.trim();
  const canSubmit =
    canUpdate &&
    !saving &&
    !verifying &&
    trimmedName.length >= 1 &&
    trimmedName.length <= 200 &&
    verifiedKey === pairKey(bankCode, accountNumber);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const bank = banks.find((b) => b.code === bankCode);
    if (!bank) {
      toast.error("Select a bank");
      return;
    }
    if (!canSubmit) return;

    const startedMerchant = activeMerchantId;
    const gen = loadGen.current;
    setSaving(true);
    try {
      const submitted = await settlementBankApi.updateSettlementBankAccount({
        bankCode: bank.code,
        bankName: bank.name,
        accountNumber,
        accountName,
      });
      if (!stillCurrent(gen, loadGen.current, startedMerchant)) return;
      toast.success("Settlement account change submitted. It is awaiting approval.");
      setPending(submitted);
      try {
        const latest = await settlementBankApi.getSettlementBankAccount();
        if (!stillCurrent(gen, loadGen.current, startedMerchant)) return;
        setCurrent(latest);
        setCurrentError(null);
      } catch (refetchErr) {
        if (!stillCurrent(gen, loadGen.current, startedMerchant)) return;
        if (isForbidden(refetchErr)) {
          setForbidden(true);
          resetForm();
          return;
        }
        setCurrentError(slotMessage(refetchErr, "Could not load settlement account"));
        showError(refetchErr, "Could not load settlement account");
      }
      resetForm();
    } catch (err) {
      if (!stillCurrent(gen, loadGen.current, startedMerchant)) return;
      if (isForbidden(err)) {
        setForbidden(true);
        return;
      }
      showError(err, "Could not submit settlement account change");
    } finally {
      if (stillCurrent(gen, loadGen.current, startedMerchant)) setSaving(false);
    }
  }

  if (!canView) return null;

  return (
    <Card size="sm">
      <CardHeader className="border-b">
        <CardTitle>Settlement account</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[180px] rounded-none bg-muted/20" />
        ) : forbidden ? (
          <AccessDenied description="You don't have permission to view the settlement account." />
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              {currentError ? <p className="text-xs text-destructive">{currentError}</p> : null}
              {current ? (
                <AccountBox
                  account={current}
                  chips={
                    <>
                      {current.verified ? <span className={CHIP_CLASS}>Verified</span> : null}
                      {current.isPrimary ? <span className={CHIP_CLASS}>Primary</span> : null}
                    </>
                  }
                />
              ) : currentError ? null : (
                <p className="text-sm text-muted-foreground">No settlement account is on file.</p>
              )}
            </div>

            {pendingError ? <p className="text-xs text-destructive">{pendingError}</p> : null}
            {pending ? (
              <div className="space-y-2">
                <AccountBox account={pending} chips={<StatusBadge status="pending" />} />
                <p className="text-xs text-muted-foreground">
                  Awaiting approval. This does not replace the settlement account above until an administrator approves it.
                </p>
              </div>
            ) : null}

            {canUpdate ? (
              <form onSubmit={(e) => void submit(e)} className="grid gap-4 sm:grid-cols-2">
                <div className="min-w-0 space-y-1.5">
                  <Label>Bank</Label>
                  <Select
                    value={bankCode}
                    onValueChange={(value) => applyPair(value, accountNumber)}
                    disabled={saving}
                  >
                    <SelectTrigger className="w-full">
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
                <div className="min-w-0 space-y-1.5">
                  <Label>Account number</Label>
                  <Input
                    inputMode="numeric"
                    value={accountNumber}
                    onChange={(e) => applyPair(bankCode, e.target.value.replace(/\D/g, "").slice(0, 10))}
                    disabled={saving}
                    placeholder="10-digit account number"
                  />
                </div>
                <div className="min-w-0 space-y-1.5 sm:col-span-2">
                  <Label>Account name</Label>
                  <div className="relative">
                    <Input
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
                <div className="space-y-1 sm:col-span-2">
                  <p className="text-xs text-muted-foreground">
                    Submitting sends this account for approval. The settlement account on file does not change until it is approved.
                  </p>
                  {pending ? (
                    <p className="text-xs text-muted-foreground">
                      If a change is already awaiting approval, submitting again updates that request.
                    </p>
                  ) : null}
                </div>
                <div className="flex justify-end sm:col-span-2">
                  <Button type="submit" disabled={!canSubmit}>
                    {saving ? "Submitting..." : "Submit for approval"}
                  </Button>
                </div>
              </form>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
