import { type FormEvent, useMemo, useState } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import type { SplitMode, SubaccountDto } from "@/types/subaccounts";
import { useSubaccountsStore } from "@/store/useSubaccountsStore";
import {
  buildSubaccountUpdatePatch,
  isNonEmptyPatch,
  type SubaccountEditForm,
} from "@/lib/subaccountPatch";
import { describeSubaccountError } from "@/lib/subaccountErrors";
import { formatNaira } from "@/lib/format";
import { toast } from "sonner";

function dtoToForm(d: SubaccountDto): SubaccountEditForm {
  return {
    businessName: d.businessName,
    isActive: d.isActive,
    splitMode: d.splitMode,
    sharePercent: d.sharePercent ?? 0,
    flatAmount: d.flatAmount ?? 0,
  };
}

function EditSubaccountForm({
  subaccount,
  onDone,
}: {
  subaccount: SubaccountDto;
  onDone: () => void;
}) {
  const update = useSubaccountsStore((s) => s.update);
  const [form, setForm] = useState<SubaccountEditForm>(() => dtoToForm(subaccount));
  const [submitting, setSubmitting] = useState(false);

  function validate(): string | null {
    if (!form.businessName.trim()) return "Business name is required.";
    if (form.splitMode === "Percentage") {
      const p = Math.trunc(form.sharePercent);
      if (Number.isNaN(p) || p < 0 || p > 100) return "Percent must be an integer from 0 to 100.";
    } else {
      const f = Math.trunc(form.flatAmount);
      if (Number.isNaN(f) || f <= 0) return "Fixed amount must be a positive whole number (minor units).";
    }
    return null;
  }

  const patchPreview = useMemo(
    () => buildSubaccountUpdatePatch(subaccount, form),
    [subaccount, form],
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    const patch = buildSubaccountUpdatePatch(subaccount, form);
    if (!isNonEmptyPatch(patch)) {
      toast.message("No changes to save");
      return;
    }

    setSubmitting(true);
    try {
      await update(subaccount.id, patch);
      toast.success("Subaccount updated");
      onDone();
    } catch (e) {
      toast.error("Unable to update subaccount", { description: describeSubaccountError(e) });
      setSubmitting(false);
    }
  }

  const flatPreview =
    form.splitMode === "FixedPlatformAmount" ? formatNaira(Math.max(0, Math.trunc(form.flatAmount))) : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
        <div className="space-y-0.5">
          <Label htmlFor="sub-active">Active</Label>
          <p className="text-xs text-muted-foreground">Inactive split legs will not be available for new splits.</p>
        </div>
        <Switch
          id="sub-active"
          checked={form.isActive}
          onCheckedChange={(v) => setForm({ ...form, isActive: v })}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="edit-biz">Business name</Label>
        <Input
          id="edit-biz"
          value={form.businessName}
          onChange={(e) => setForm({ ...form, businessName: e.target.value })}
        />
      </div>

      <div className="space-y-1">
        <p className="text-sm font-medium">Bank</p>
        <p className="text-sm text-muted-foreground">{subaccount.bankName}</p>
      </div>

      <div className="space-y-1">
        <p className="text-sm font-medium">Account number</p>
        <p className="font-mono text-sm text-muted-foreground">{subaccount.accountNumber}</p>
      </div>

      <div className="space-y-1">
        <p className="text-sm font-medium">Account name</p>
        <p className="text-sm text-muted-foreground">{subaccount.accountName}</p>
      </div>

      <div className="space-y-2">
        <Label>Default split</Label>
        <RadioGroup
          value={form.splitMode}
          onValueChange={(v) => setForm({ ...form, splitMode: v as SplitMode })}
          className="grid gap-2"
        >
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2">
            <RadioGroupItem value="Percentage" id="edit-mode-pct" />
            <span className="text-sm">Percentage</span>
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2">
            <RadioGroupItem value="FixedPlatformAmount" id="edit-mode-flat" />
            <span className="text-sm">Fixed amount (minor units)</span>
          </label>
        </RadioGroup>
      </div>

      {form.splitMode === "Percentage" ? (
        <div className="space-y-1.5">
          <Label htmlFor="edit-pct">Platform share (%)</Label>
          <Input
            id="edit-pct"
            inputMode="numeric"
            type="number"
            min={0}
            max={100}
            step={1}
            value={form.sharePercent}
            onChange={(e) => setForm({ ...form, sharePercent: Number(e.target.value) })}
          />
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label htmlFor="edit-flat">Fixed platform amount (kobo)</Label>
          <Input
            id="edit-flat"
            inputMode="numeric"
            type="number"
            min={1}
            step={1}
            value={form.flatAmount}
            onChange={(e) => setForm({ ...form, flatAmount: Number(e.target.value) })}
          />
          <p className="text-xs text-muted-foreground">Preview: {flatPreview}</p>
        </div>
      )}

      {Object.keys(patchPreview).length > 0 && (
        <p className="text-xs text-muted-foreground">
          {Object.keys(patchPreview).length} field(s) will be updated.
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : "Save changes"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function EditSubaccountDialog({
  open,
  onOpenChange,
  subaccount,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  subaccount: SubaccountDto | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit subaccount</DialogTitle>
          <DialogDescription>
            Only changed fields are sent. Bank, account number, and account name cannot be changed.
          </DialogDescription>
        </DialogHeader>
        {subaccount ? (
          <EditSubaccountForm
            key={subaccount.id}
            subaccount={subaccount}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
