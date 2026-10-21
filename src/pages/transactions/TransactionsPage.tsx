import { useEffect, useMemo, useState } from "react";
import { DownloadIcon, FilterIcon, SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { ChannelIcon } from "@/components/common/ChannelIcon";
import { EmptyState } from "@/components/common/EmptyState";
import { AccessDenied } from "@/components/common/AccessDenied";
import { TransactionDetailDrawer } from "@/components/transactions/TransactionDetailDrawer";
import { useAppStore } from "@/store/useAppStore";
import { useTransactionsStore } from "@/store/useTransactionsStore";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { useHasPermission } from "@/hooks/usePermissions";
import { getTransaction } from "@/lib/api/transactionsApi";
import { formatDateTime, formatNaira } from "@/lib/format";
import type { Channel, Transaction, TxStatus } from "@/types";
import { toast } from "sonner";

export function TransactionsPage() {
  const mode = useAppStore((s) => s.mode);
  const canView = useHasPermission(PERMISSIONS["transactions.view"]);
  const items = useTransactionsStore((s) => s.items);
  const totalCount = useTransactionsStore((s) => s.totalCount);
  const loading = useTransactionsStore((s) => s.loading);
  const forbidden = useTransactionsStore((s) => s.forbidden);
  const filters = useTransactionsStore((s) => s.filters);
  const setFilters = useTransactionsStore((s) => s.setFilters);
  const fetch = useTransactionsStore((s) => s.fetch);
  const [active, setActive] = useState<Transaction | null>(null);

  useEffect(() => {
    if (!canView) return;
    void fetch(mode);
  }, [canView, fetch, mode, filters.page, filters.pageSize, filters.status, filters.channel, filters.query]);

  const filtered = useMemo(() => items, [items]);

  if (!canView || forbidden) {
    return (
      <div>
        <PageHeader title="Transactions" description="Payments collected through ICAD Pay." />
        <AccessDenied description="You don't have permission to view transactions." />
      </div>
    );
  }

  const totalAmount = filtered
    .filter((t) => t.status === "success")
    .reduce((s, t) => s + t.amount, 0);

  return (
    <div>
      <PageHeader
        title="Transactions"
        description={`${filtered.length} of ${totalCount} transactions in ${mode} mode · ${formatNaira(totalAmount, { compact: true })} successful`}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              toast.success("Export started", {
                description: `${filtered.length} transactions queued for CSV export.`,
              })
            }
          >
            <DownloadIcon /> Export CSV
          </Button>
        }
      />

      <Card size="sm">
        <CardContent className="space-y-4 p-0">
          <div className="flex flex-wrap items-center gap-2 border-b px-5 py-3">
            <div className="relative flex-1 min-w-[200px]">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by reference, customer, or email"
                value={filters.query}
                onChange={(e) => setFilters({ query: e.target.value, page: 1 })}
                className="pl-9"
              />
            </div>
            <Select
              value={filters.status}
              onValueChange={(v) => setFilters({ status: v as TxStatus | "all", page: 1 })}
            >
              <SelectTrigger className="w-[150px]">
                <FilterIcon className="size-3.5" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="abandoned">Abandoned</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.channel}
              onValueChange={(v) => setFilters({ channel: v as Channel | "all", page: 1 })}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All channels</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
                <SelectItem value="ussd">USSD</SelectItem>
                <SelectItem value="qr">QR</SelectItem>
                <SelectItem value="bank">Bank</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="px-5 py-10 text-sm text-muted-foreground">Loading transactions…</div>
          ) : filtered.length === 0 ? (
            <EmptyState
              title="No matching transactions"
              description="Try adjusting your filters or switching modes."
              icon={<SearchIcon className="size-8" />}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((t) => (
                    <TableRow
                      key={t.id}
                      onClick={() => {
                        // Fetch detail on demand to populate richer fields where available
                        void getTransaction(t.id)
                          .then((d) => {
                            setActive({
                              ...t,
                              reference: d.reference,
                              customerEmail: d.customerEmail ?? t.customerEmail,
                              description: d.providerReference ?? t.description,
                            });
                          })
                          .catch(() => setActive(t));
                      }}
                      className="cursor-pointer"
                    >
                      <TableCell className="font-mono text-xs">{t.reference}</TableCell>
                      <TableCell>
                        <div className="font-medium">{t.customerName}</div>
                        <div className="text-xs text-muted-foreground">{t.customerEmail}</div>
                      </TableCell>
                      <TableCell className="font-semibold">{formatNaira(t.amount)}</TableCell>
                      <TableCell><ChannelIcon channel={t.channel} /></TableCell>
                      <TableCell><StatusBadge status={t.status} /></TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDateTime(t.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <TransactionDetailDrawer
        txn={active}
        open={active !== null}
        onOpenChange={(o) => !o && setActive(null)}
      />
    </div>
  );
}
