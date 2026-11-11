import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowLeftIcon } from "lucide-react";
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
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { AccessDenied } from "@/components/common/AccessDenied";
import { getPayout } from "@/lib/api/payoutsApi";
import { isForbidden, PERMISSIONS } from "@/lib/auth/permissions";
import { useHasPermission } from "@/hooks/usePermissions";
import { formatDate, formatNaira } from "@/lib/format";
import type { Payout } from "@/types";

export function PayoutDetailPage() {
  const { id } = useParams<{ id: string }>();
  const canView = useHasPermission(PERMISSIONS["payouts.view"]);
  const [payout, setPayout] = useState<Payout | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const requestKey = id && canView ? id : null;
  const loading = requestKey !== null && loadedKey !== requestKey;

  useEffect(() => {
    if (!id || !canView) return;
    let cancelled = false;
    void getPayout(id)
      .then((dto) => {
        if (cancelled) return;
        setPayout({
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
          ledgerEntries: dto.ledgerEntries.map((e) => ({
            id: e.id,
            entryType: e.entryType,
            amount: e.amountMinor,
            currency: e.currency,
            sourceType: e.sourceType,
            sourceId: e.sourceId,
            createdAt: e.createdAtUtc,
          })),
        });
        setForbidden(false);
        setLoadedKey(id);
      })
      .catch((err) => {
        if (cancelled) return;
        setPayout(null);
        setForbidden(isForbidden(err));
        setLoadedKey(id);
      });
    return () => {
      cancelled = true;
    };
  }, [id, canView]);

  if (!canView || forbidden) {
    return <AccessDenied description="You don't have permission to view payouts." />;
  }

  if (loading) {
    return <div className="px-5 py-10 text-sm text-muted-foreground">Loading payout…</div>;
  }

  if (!payout) {
    return (
      <EmptyState
        title="Payout not found"
        description="This payout may have been removed or never existed."
        action={<Button asChild variant="outline"><Link to="/payouts">Back to payouts</Link></Button>}
      />
    );
  }

  return (
    <div>
      <Link
        to="/payouts"
        className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-3" /> Payouts
      </Link>

      <div className="mt-4 mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight font-mono">
            {payout.reference ?? payout.id}
          </h1>
          <div className="mt-1 text-sm text-muted-foreground">
            {payout.beneficiaryName ?? payout.beneficiaryType}
            {payout.bankName && payout.accountNumber
              ? ` · ${payout.bankName} ····${payout.accountNumber.slice(-4)}`
              : ""}
          </div>
        </div>
        <StatusBadge status={payout.status} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card size="sm">
          <CardContent>
            <div className="text-[11px] font-semibold text-muted-foreground">Amount</div>
            <div className="font-heading mt-2 text-2xl font-semibold">{formatNaira(payout.amount)}</div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent>
            <div className="text-[11px] font-semibold text-muted-foreground">Date</div>
            <div className="font-heading mt-2 text-2xl font-semibold">{formatDate(payout.createdAt)}</div>
          </CardContent>
        </Card>
      </div>

      <Card size="sm" className="mt-6">
        <CardHeader className="border-b">
          <CardTitle>Ledger entries</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!payout.ledgerEntries || payout.ledgerEntries.length === 0 ? (
            <EmptyState title="No ledger entries for this payout" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payout.ledgerEntries.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell><StatusBadge status={e.entryType} /></TableCell>
                      <TableCell className="font-semibold">{formatNaira(e.amount, { compact: true })}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{e.sourceType}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(e.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
