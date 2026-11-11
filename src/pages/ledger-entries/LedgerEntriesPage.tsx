import { useEffect, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon, Link as LinkIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { AccessDenied } from "@/components/common/AccessDenied";
import { listLedgerEntries } from "@/lib/api/ledgerEntriesApi";
import { isForbidden, PERMISSIONS } from "@/lib/auth/permissions";
import { useHasPermission } from "@/hooks/usePermissions";
import { formatDate, formatNaira } from "@/lib/format";
import type { LedgerEntry } from "@/types";

const PAGE_SIZE = 20;

export function LedgerEntriesPage() {
  const canView = useHasPermission(PERMISSIONS["ledger_entries.view"]);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const requestKey = canView ? `${page}` : null;
  const loading = requestKey !== null && loadedKey !== requestKey;
  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  useEffect(() => {
    if (!canView) return;
    let cancelled = false;
    void listLedgerEntries({ pageNumber: page, pageSize: PAGE_SIZE })
      .then((res) => {
        if (cancelled) return;
        setEntries(
          res.items.map((dto) => ({
            id: dto.id,
            beneficiaryType: dto.beneficiaryType,
            beneficiaryId: dto.beneficiaryId,
            entryType: dto.entryType,
            amount: dto.amountMinor,
            currency: dto.currency,
            sourceType: dto.sourceType,
            sourceId: dto.sourceId,
            payoutId: dto.payoutId,
            createdAt: dto.createdAtUtc,
          })),
        );
        setTotalCount(res.totalCount);
        setForbidden(false);
        setLoadedKey(`${page}`);
      })
      .catch((err) => {
        if (cancelled) return;
        setEntries([]);
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
        <PageHeader title="Ledger" description="Every entry recorded against your balance." />
        <AccessDenied description="You don't have permission to view ledger entries." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Ledger"
        description={`${totalCount} entr${totalCount === 1 ? "y" : "ies"} total`}
      />

      <Card size="sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="px-5 py-10 text-sm text-muted-foreground">Loading ledger entries…</div>
          ) : entries.length === 0 ? (
            <EmptyState title="No ledger entries yet" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Beneficiary</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Settled</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell><StatusBadge status={e.entryType} /></TableCell>
                      <TableCell className="font-semibold">{formatNaira(e.amount, { compact: true })}</TableCell>
                      <TableCell className="text-xs">{e.beneficiaryType}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{e.sourceType}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {e.payoutId ? (
                          <span className="inline-flex items-center gap-1">
                            <LinkIcon className="size-3" /> Settled
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(e.createdAt)}</TableCell>
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
  );
}
