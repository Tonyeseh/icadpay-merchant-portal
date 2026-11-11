import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BuildingIcon,
  PlusIcon,
  MoreHorizontalIcon,
  StarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react";
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
import { AccessDenied } from "@/components/common/AccessDenied";
import { AddBankAccountDialog } from "@/components/payouts/AddBankAccountDialog";
import { useBankAccountsStore } from "@/store/useBankAccountsStore";
import { listPayouts, type PayoutItemDto } from "@/lib/api/payoutsApi";
import { isForbidden, PERMISSIONS } from "@/lib/auth/permissions";
import { useHasPermission } from "@/hooks/usePermissions";
import { formatDate, formatNaira } from "@/lib/format";
import type { BankAccount, Payout } from "@/types";
import { toast } from "sonner";

const PAGE_SIZE = 20;

function mapPayout(dto: PayoutItemDto): Payout {
  return {
    id: dto.id,
    beneficiaryType: dto.beneficiaryType,
    beneficiaryId: dto.beneficiaryId,
    beneficiaryName: dto.beneficiaryName,
    bankName: dto.bankName,
    accountNumber: dto.accountNumber,
    amount: dto.amountMinor,
    currency: dto.currency,
    status: dto.status,
    reference: dto.reference,
    createdAt: dto.createdAtUtc,
  };
}

export function PayoutsPage() {
  const accounts = useBankAccountsStore((s) => s.items);
  const hydrate = useBankAccountsStore((s) => s.hydrate);
  const remove = useBankAccountsStore((s) => s.remove);
  const setPrimary = useBankAccountsStore((s) => s.setPrimary);
  const [addOpen, setAddOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<BankAccount | null>(null);
  const [confirmPrimary, setConfirmPrimary] = useState<BankAccount | null>(null);

  const canView = useHasPermission(PERMISSIONS["payouts.view"]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const requestKey = canView ? `${page}` : null;
  const loading = requestKey !== null && loadedKey !== requestKey;
  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!canView) return;
    let cancelled = false;
    void listPayouts({ pageNumber: page, pageSize: PAGE_SIZE })
      .then((res) => {
        if (cancelled) return;
        setPayouts(res.items.map(mapPayout));
        setTotalCount(res.totalCount);
        setForbidden(false);
        setLoadedKey(`${page}`);
      })
      .catch((err) => {
        if (cancelled) return;
        setPayouts([]);
        setForbidden(isForbidden(err));
        setLoadedKey(`${page}`);
      });
    return () => {
      cancelled = true;
    };
  }, [canView, page]);

  if (!canView || forbidden) {
    return (
      <div>
        <PageHeader title="Payouts" description="Settlements to your bank accounts." />
        <AccessDenied description="You don't have permission to view payouts." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Payouts"
        description={`${totalCount} payout${totalCount === 1 ? "" : "s"} total`}
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
            {loading ? (
              <div className="px-5 py-10 text-sm text-muted-foreground">Loading payouts…</div>
            ) : payouts.length === 0 ? (
              <EmptyState title="No payouts yet" />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reference</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Beneficiary</TableHead>
                      <TableHead>Bank</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payouts.map((p) => (
                      <TableRow key={p.id} className="cursor-pointer">
                        <TableCell className="font-mono text-xs">
                          <Link to={`/payouts/${p.id}`} className="hover:underline">
                            {p.reference ?? p.id}
                          </Link>
                        </TableCell>
                        <TableCell className="font-semibold">{formatNaira(p.amount, { compact: true })}</TableCell>
                        <TableCell className="text-xs">{p.beneficiaryName ?? p.beneficiaryType}</TableCell>
                        <TableCell className="text-xs">
                          {p.bankName && p.accountNumber
                            ? `${p.bankName.split(" ")[0]} ····${p.accountNumber.slice(-4)}`
                            : "—"}
                        </TableCell>
                        <TableCell><StatusBadge status={p.status} /></TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(p.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {!loading && pageCount > 1 && (
              <div className="flex items-center justify-between border-t px-5 py-3 text-xs text-muted-foreground">
                <span>
                  Page {page} of {pageCount} · {totalCount} total
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeftIcon /> Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= pageCount}
                    onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  >
                    Next <ChevronRightIcon />
                  </Button>
                </div>
              </div>
            )}
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
