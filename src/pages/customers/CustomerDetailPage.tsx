import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowLeftIcon, MailIcon, PhoneIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { ChannelIcon } from "@/components/common/ChannelIcon";
import { EmptyState } from "@/components/common/EmptyState";
import { AccessDenied } from "@/components/common/AccessDenied";
import { customers } from "@/mock/customers";
import { listTransactions } from "@/lib/api/transactionsApi";
import { isForbidden, PERMISSIONS } from "@/lib/auth/permissions";
import { useHasPermission } from "@/hooks/usePermissions";
import { formatDate, formatDateTime, formatNaira, initials } from "@/lib/format";
import { useAppStore } from "@/store/useAppStore";
import type { Channel, Transaction, TxStatus } from "@/types";

function mapStatus(status: string): TxStatus {
  const s = status.toLowerCase();
  if (s.includes("complete") || s.includes("success") || s.includes("paid")) return "success";
  if (s.includes("fail") || s.includes("error")) return "failed";
  if (s.includes("abandon") || s.includes("cancel")) return "abandoned";
  return "pending";
}

function mapChannel(channel: number): Channel {
  if (channel === 1) return "card";
  if (channel === 2) return "ussd";
  if (channel === 3) return "transfer";
  return "transfer";
}

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const customer = customers.find((c) => c.id === id);
  const mode = useAppStore((s) => s.mode);
  const canViewTransactions = useHasPermission(PERMISSIONS["transactions.view"]);
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [forbiddenKey, setForbiddenKey] = useState<string | null>(null);
  const requestKey = customer && canViewTransactions ? `${customer.id}:${mode}` : null;
  const txForbidden = requestKey !== null && forbiddenKey === requestKey;
  const loading = requestKey !== null && loadedKey !== requestKey;

  useEffect(() => {
    if (!customer || !canViewTransactions) return;
    let cancelled = false;
    const key = `${customer.id}:${mode}`;
    void listTransactions({
      page: 1,
      pageSize: 50,
      mode: mode === "live" ? "Live" : "Test",
      // Backend supports searching by customerEmail; customerId isn't a backend filter.
      search: customer.email,
    })
      .then((res) => {
        if (cancelled) return;
        const items: Transaction[] = res.items.map((t) => ({
          id: t.id,
          reference: t.reference,
          amount: t.amountMinor,
          fee: 0,
          currency: "NGN",
          status: mapStatus(t.status),
          channel: mapChannel(t.channel),
          customerId: customer.id,
          customerEmail: t.customerEmail ?? customer.email,
          customerName: customer.name,
          createdAt: t.createdAtUtc,
          mode,
        }));
        setTxns(items);
        setForbiddenKey(null);
        setLoadedKey(key);
      })
      .catch((err) => {
        if (cancelled) return;
        setTxns([]);
        setForbiddenKey(isForbidden(err) ? key : null);
        setLoadedKey(key);
      });
    return () => {
      cancelled = true;
    };
  }, [canViewTransactions, customer, mode]);

  if (!customer) {
    return (
      <EmptyState
        title="Customer not found"
        description="This customer may have been removed or never existed."
        action={<Button asChild variant="outline"><Link to="/customers">Back to customers</Link></Button>}
      />
    );
  }

  return (
    <div>
      <Link
        to="/customers"
        className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-3" /> Customers
      </Link>

      <div className="mt-4 mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="size-14 rounded-none">
            <AvatarFallback className="rounded-none bg-primary text-base font-semibold uppercase text-primary-foreground">
              {initials(customer.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {customer.name}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1"><MailIcon className="size-3.5" /> {customer.email}</span>
              <span className="inline-flex items-center gap-1"><PhoneIcon className="size-3.5" /> {customer.phone}</span>
            </div>
          </div>
        </div>
        <StatusBadge status={customer.status} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card size="sm">
          <CardContent>
            <div className="text-[11px] font-semibold text-muted-foreground">
              Lifetime spend
            </div>
            <div className="font-heading mt-2 text-2xl font-semibold">{formatNaira(customer.totalSpend)}</div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent>
            <div className="text-[11px] font-semibold text-muted-foreground">
              Transactions
            </div>
            <div className="font-heading mt-2 text-2xl font-semibold">{customer.transactionCount}</div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent>
            <div className="text-[11px] font-semibold text-muted-foreground">
              Joined
            </div>
            <div className="font-heading mt-2 text-2xl font-semibold">{formatDate(customer.createdAt)}</div>
          </CardContent>
        </Card>
      </div>

      <Card size="sm" className="mt-6">
        <CardHeader className="border-b">
          <CardTitle>Transaction history Â· {mode} mode</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!canViewTransactions || txForbidden ? (
            <AccessDenied description="You don't have permission to view transactions." />
          ) : loading ? (
            <div className="px-5 py-10 text-sm text-muted-foreground">Loading transactions…</div>
          ) : txns.length === 0 ? (
            <EmptyState title="No transactions in this mode" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {txns.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-mono text-xs">{t.reference}</TableCell>
                      <TableCell className="font-semibold">{formatNaira(t.amount)}</TableCell>
                      <TableCell><ChannelIcon channel={t.channel} /></TableCell>
                      <TableCell><StatusBadge status={t.status} /></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDateTime(t.createdAt)}</TableCell>
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
