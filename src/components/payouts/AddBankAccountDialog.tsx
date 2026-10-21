import { type FormEvent, useState } from "react";
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
import { useBankAccountsStore } from "@/store/useBankAccountsStore";
import { banks } from "@/mock/banks";
import { toast } from "sonner";

export function AddBankAccountDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const add = useBankAccountsStore((s) => s.add);
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setBankCode("");
    setAccountNumber("");
    setSubmitting(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const bank = banks.find((b) => b.code === bankCode);
    if (!bank) return;
    setSubmitting(true);
    try {
      const created = await add(bankCode, bank.name, accountNumber);
      toast.success("Bank account added", {
        description: `${created.accountName} · ${created.accountNumber}`,
      });
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error("Unable to add bank account", {
        description: err instanceof Error ? err.message : "Please try again",
      });
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add bank account</DialogTitle>
          <DialogDescription>
            Settlements are sent to your linked bank accounts. Account name is verified against the bank's records.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="bank">Bank</Label>
            <Select
              value={bankCode}
              onValueChange={(v) => setBankCode(v)}
            >
              <SelectTrigger id="bank">
                <SelectValue placeholder="Select bank" />
              </SelectTrigger>
              <SelectContent>
                {banks.map((b) => (
                  <SelectItem key={b.code} value={b.code}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="acct">Account number</Label>
            <Input
              id="acct"
              inputMode="numeric"
              maxLength={10}
              minLength={10}
              value={accountNumber}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 10);
                setAccountNumber(v);
              }}
              placeholder="0123456789"
              required
            />
          </div>
          <div className="rounded-none border border-border bg-muted/40 px-4 py-3 text-sm">
            <span className="text-muted-foreground">
              The server will verify the account name via bank name-enquiry when you add the account.
            </span>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!bankCode || accountNumber.length !== 10 || submitting}>
              {submitting ? "Adding..." : "Add account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
