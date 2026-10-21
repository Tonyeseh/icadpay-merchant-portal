import { useEffect, useState } from "react";
import { BuildingIcon, PlusIcon, MoreHorizontalIcon, StarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { AddBankAccountDialog } from "@/components/payouts/AddBankAccountDialog";
import { useBankAccountsStore } from "@/store/useBankAccountsStore";
import { payouts } from "@/mock/payouts";
import { formatDate, formatDateTime, formatNaira } from "@/lib/format";
import type { BankAccount } from "@/types";
import { toast } from "sonner";

export function PayoutsPage() {
  const accounts = useBankAccountsStore((s) => s.items);
  const hydrate = useBankAccountsStore((s) => s.hydrate);
  const remove = useBankAccountsStore((s) => s.remove);
  const setPrimary = useBankAccountsStore((s) => s.setPrimary);
  const [addOpen, setAddOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<BankAccount | null>(null);
  const [confirmPrimary, setConfirmPrimary] = useState<BankAccount | null>(null);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const totalSettled = payouts
    .filter((p) => p.status === "paid")
    .reduce((s, p) => s + p.amount, 0);

  return (
    <div>
      <PageHeader
        title="Payouts"
        description={`${formatNaira(totalSettled, { compact: true })} settled across ${payouts.filter((p) => p.status === "paid").length} payouts`}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card size="sm" className="lg:col-span-1">
          <CardHeader className="flex-row items-center justify-between border-b">
            <CardTitle>Bank accounts</CardTitle>
            <Button size="xs" variant="outline" onClick={() => setAddOpen(true)}>
              <PlusIcon /> Add
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {accounts.length === 0 ? (
              <EmptyState
                title="No bank accounts"
                icon={<BuildingIcon className="size-8" />}
                action={<Button size="sm" onClick={() => setAddOpen(true)}><PlusIcon /> Add account</Button>}
              />
            ) : (
              <ul className="divide-y">
                {accounts.map((a) => (
                  <li key={a.id} className="flex items-center justify-between px-5 py-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{a.bankName}</span>
                        {a.isPrimary && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary">
                            <StarIcon className="size-3" /> Primary
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-xs text-muted-foreground">Â·Â·Â·Â·{a.accountNumber.slice(-4)} Â· {a.accountName}</div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-xs" aria-label="More">
                          <MoreHorizontalIcon />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {!a.isPrimary && (
                          <DropdownMenuItem onClick={() => setConfirmPrimary(a)}>
                            Set as primary
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem variant="destructive" onClick={() => setConfirmRemove(a)}>
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card size="sm" className="lg:col-span-2">
          <CardHeader className="border-b">
            <CardTitle>Settlement history</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Transactions</TableHead>
                    <TableHead>Bank</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payouts.map((p) => {
                    const acct = accounts.find((a) => a.id === p.bankAccountId);
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-xs">{p.reference}</TableCell>
                        <TableCell className="font-semibold">{formatNaira(p.amount, { compact: true })}</TableCell>
                        <TableCell>{p.transactionCount}</TableCell>
                        <TableCell className="text-xs">
                          {acct ? `${acct.bankName.split(" ")[0]} Â·Â·Â·Â·${acct.accountNumber.slice(-4)}` : "â€”"}
                        </TableCell>
                        <TableCell><StatusBadge status={p.status} /></TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {p.settledAt ? formatDateTime(p.settledAt) : formatDate(p.createdAt)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <AddBankAccountDialog open={addOpen} onOpenChange={setAddOpen} />

      <ConfirmDialog
        open={confirmRemove !== null}
        onOpenChange={(o) => !o && setConfirmRemove(null)}
        title="Remove bank account?"
        description={`${confirmRemove?.bankName} Â·Â·Â·Â·${confirmRemove?.accountNumber.slice(-4)} will no longer receive settlements.${confirmRemove?.isPrimary ? " Another account will be promoted to primary automatically." : ""}`}
        confirmLabel="Remove account"
        variant="destructive"
        onConfirm={() => {
          if (!confirmRemove) return;
          void remove(confirmRemove.id)
            .then(() => toast.success("Bank account removed"))
            .catch((e) =>
              toast.error("Unable to remove bank account", {
                description: e instanceof Error ? e.message : "Please try again",
              }),
            );
        }}
      />

      <ConfirmDialog
        open={confirmPrimary !== null}
        onOpenChange={(o) => !o && setConfirmPrimary(null)}
        title="Change primary settlement account?"
        description={`Future settlements will be sent to ${confirmPrimary?.bankName} Â·Â·Â·Â·${confirmPrimary?.accountNumber.slice(-4)} instead.`}
        confirmLabel="Make primary"
        onConfirm={() => {
          if (!confirmPrimary) return;
          void setPrimary(confirmPrimary.id)
            .then(() => toast.success("Primary account updated"))
            .catch((e) =>
              toast.error("Unable to update primary account", {
                description: e instanceof Error ? e.message : "Please try again",
              }),
            );
        }}
      />
    </div>
  );
}
