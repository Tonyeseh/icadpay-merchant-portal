import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  CreditCardIcon,
  PercentIcon,
  ReceiptIcon,
  WalletIcon,
  PlusIcon,
  DownloadIcon,
  LinkIcon,
  UserPlusIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/common/PageHeader";
import { AccessDenied } from "@/components/common/AccessDenied";
import { KpiCard } from "@/components/common/KpiCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ChannelIcon } from "@/components/common/ChannelIcon";
import { useAppStore } from "@/store/useAppStore";
import { listTransactions } from "@/lib/api/transactionsApi";
import { isForbidden, PERMISSIONS } from "@/lib/auth/permissions";
import { useHasPermission } from "@/hooks/usePermissions";
import { formatNaira, formatRelative } from "@/lib/format";
import type { AppMode, Transaction, TxStatus, Channel } from "@/types";

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

function buildSeries(seed: number): { day: string; volume: number; count: number }[] {
  const today = new Date();
  const out = [];
  let v = 850_000_00 + seed * 25_000_00;
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const drift = (Math.sin((i + seed) * 0.6) + 1) * 350_000_00;
    const noise = ((i * 73 + seed * 17) % 100) * 1_500_00;
    v = Math.max(80_000_00, 600_000_00 + drift + noise);
    out.push({
      day: d.toLocaleDateString("en-NG", { day: "2-digit", month: "short" }),
      volume: Math.round(v),
      count: Math.round(20 + (Math.cos(i * 0.4) + 1) * 18 + (i % 5)),
    });
  }
  return out;
}

export function DashboardPage() {
  const mode = useAppStore((s) => s.mode);
  const user = useAppStore((s) => s.user);
  const canViewTransactions = useHasPermission(PERMISSIONS["transactions.view"]);
  const [referenceNow] = useState(() => Date.now());
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [forbiddenMode, setForbiddenMode] = useState<AppMode | null>(null);
  /** When this matches `mode`, the list is fresh for that mode (avoids sync setState in effects). */
  const [txnsLoadedForMode, setTxnsLoadedForMode] = useState<AppMode | null>(null);
  const txForbidden = forbiddenMode === mode;
  const txnsLoading = canViewTransactions && txnsLoadedForMode !== mode;

  const series = useMemo(() => buildSeries(mode === "live" ? 4 : 1), [mode]);

  useEffect(() => {
    if (!canViewTransactions) return;
    let cancelled = false;
    void listTransactions({
      page: 1,
      pageSize: 100,
      mode: mode === "live" ? "Live" : "Test",
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
          customerId: "",
          customerEmail: t.customerEmail ?? "",
          customerName: (t.customerEmail ?? "").split("@")[0] || "Customer",
          createdAt: t.createdAtUtc,
          mode,
        }));
        setTxns(items);
        setForbiddenMode(null);
        setTxnsLoadedForMode(mode);
      })
      .catch((err) => {
        if (cancelled) return;
        setTxns([]);
        setForbiddenMode(isForbidden(err) ? mode : null);
        setTxnsLoadedForMode(mode);
      });
    return () => {
      cancelled = true;
    };
  }, [canViewTransactions, mode]);

  const txnsForMode = useMemo(() => txns.filter((t) => t.mode === mode), [txns, mode]);

  const today = txnsForMode.filter(
    (t) => referenceNow - new Date(t.createdAt).getTime() < 1000 * 60 * 60 * 24,
  );
  const todayVolume = today
    .filter((t) => t.status === "success")
    .reduce((sum, t) => sum + t.amount, 0);
  const successCount = txnsForMode.filter((t) => t.status === "success").length;
  const successRate = txnsForMode.length > 0 ? (successCount / txnsForMode.length) * 100 : 0;
  const balance = mode === "live" ? 4_245_300_00 : 920_000_00;

  const recent = [...txnsForMode]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user?.firstName ?? "there"}.`}
        description={
          mode === "live"
            ? "You're viewing live data. All amounts are in Naira."
            : "You're in test mode. Switch to Live in the topbar when you're ready to go live."
        }
        actions={
          <>
            <Button variant="outline" size="sm">
              <DownloadIcon /> Export
            </Button>
            <Button size="sm" asChild>
              <Link to="/payment-links"><PlusIcon /> New payment link</Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Today's volume"
          value={formatNaira(todayVolume, { compact: true })}
          delta={12.4}
          icon={<ReceiptIcon className="size-4" />}
          hint="vs. yesterday"
        />
        <KpiCard
          label="Transactions"
          value={txnsForMode.length.toLocaleString()}
          delta={4.8}
          icon={<CreditCardIcon className="size-4" />}
          hint="last 30 days"
        />
        <KpiCard
          label="Success rate"
          value={`${successRate.toFixed(1)}%`}
          delta={mode === "live" ? 1.6 : -0.4}
          icon={<PercentIcon className="size-4" />}
          hint="rolling 7-day"
        />
        <KpiCard
          label="Available balance"
          value={formatNaira(balance, { compact: true })}
          icon={<WalletIcon className="size-4" />}
          hint="Settles tomorrow"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card size="sm" className="lg:col-span-2">
          <CardHeader className="border-b">
            <CardTitle>Revenue · last 14 days</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-72 w-full">
              <ResponsiveContainer>
                <AreaChart data={series} margin={{ top: 16, right: 8, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="day"
                    stroke="var(--color-muted-foreground)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="var(--color-muted-foreground)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `₦${(v / 1_000_000).toFixed(0)}M`}
                  />
                  <Tooltip
                    cursor={{ stroke: "var(--color-primary)", strokeDasharray: "3 3" }}
                    contentStyle={{
                      background: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      color: "var(--color-popover-foreground)",
                      fontSize: 12,
                    }}
                    formatter={(value) => [formatNaira(Number(value)), "Volume"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="volume"
                    stroke="var(--color-primary)"
                    strokeWidth={2}
                    fill="url(#rev)"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader className="border-b">
            <CardTitle>Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button asChild variant="outline" className="w-full justify-between" size="sm">
              <Link to="/payment-links">
                <span className="inline-flex items-center gap-2 normal-case tracking-normal">
                  <LinkIcon className="size-4" /> Create payment link
                </span>
                <ArrowRightIcon />
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-between" size="sm">
              <Link to="/customers">
                <span className="inline-flex items-center gap-2 normal-case tracking-normal">
                  <UserPlusIcon className="size-4" /> Add a customer
                </span>
                <ArrowRightIcon />
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-between" size="sm">
              <Link to="/payouts">
                <span className="inline-flex items-center gap-2 normal-case tracking-normal">
                  <WalletIcon className="size-4" /> Withdraw to bank
                </span>
                <ArrowRightIcon />
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-between" size="sm">
              <Link to="/settings/developers">
                <span className="inline-flex items-center gap-2 normal-case tracking-normal">
                  <ArrowUpRightIcon className="size-4" /> Manage API keys
                </span>
                <ArrowRightIcon />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card size="sm" className="mt-6">
        <CardHeader className="flex-row items-center justify-between border-b">
          <CardTitle>Recent transactions</CardTitle>
          <Button asChild variant="link" size="xs">
            <Link to="/transactions">View all <ArrowRightIcon /></Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {!canViewTransactions || txForbidden ? (
            <AccessDenied description="You don't have permission to view transactions." />
          ) : (
          <ul className="divide-y">
            {txnsLoading && (
              <li className="px-6 py-4 text-sm text-muted-foreground">Loading…</li>
            )}
            {recent.map((t) => (
              <li key={t.id} className="flex items-center gap-4 px-6 py-3 hover:bg-muted/40">
                <div className="flex flex-1 items-center gap-3 min-w-0">
                  <div className="grid size-9 shrink-0 place-items-center bg-muted">
                    <ChannelIcon channel={t.channel} withLabel={false} />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{t.customerName}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {t.reference} · {formatRelative(t.createdAt)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">{formatNaira(t.amount)}</div>
                  <StatusBadge status={t.status} className="mt-0.5" />
                </div>
              </li>
            ))}
          </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
