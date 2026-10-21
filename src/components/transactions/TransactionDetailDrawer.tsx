import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/common/CopyButton";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ChannelIcon } from "@/components/common/ChannelIcon";
import { formatDateTime, formatNaira } from "@/lib/format";
import type { Transaction } from "@/types";

export function TransactionDetailDrawer({
  txn,
  open,
  onOpenChange,
}: {
  txn: Transaction | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        {txn && (
          <>
            <SheetHeader>
              <SheetTitle>Transaction</SheetTitle>
              <SheetDescription>
                <span className="inline-flex items-center gap-2 font-mono text-xs">
                  {txn.reference} <CopyButton value={txn.reference} size="icon-xs" />
                </span>
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-6 px-6 pb-6">
              <div className="space-y-1">
                <div className="text-3xl font-semibold tracking-tight tracking-tight">
                  {formatNaira(txn.amount)}
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={txn.status} />
                  <ChannelIcon channel={txn.channel} />
                </div>
              </div>

              <Separator />

              <Field label="Customer" value={txn.customerName} sub={txn.customerEmail} />
              <Field label="Created" value={formatDateTime(txn.createdAt)} />
              {txn.paidAt && <Field label="Paid at" value={formatDateTime(txn.paidAt)} />}
              <Field label="Fee" value={formatNaira(txn.fee)} />
              <Field label="Net settled" value={formatNaira(txn.amount - txn.fee)} />
              {txn.cardLast4 && (
                <Field
                  label="Card"
                  value={`${txn.cardBrand?.toUpperCase()} â€¢â€¢â€¢â€¢ ${txn.cardLast4}`}
                />
              )}
              {txn.bankName && <Field label="Bank" value={txn.bankName} />}
              {txn.description && <Field label="Description" value={txn.description} />}

              <Separator />

              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={txn.status !== "success"}>
                  Refund
                </Button>
                <Button variant="outline" size="sm">
                  Email receipt
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-sm font-medium">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}
