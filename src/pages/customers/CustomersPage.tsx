import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { SearchIcon, UsersIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { customers } from "@/mock/customers";
import { formatDate, formatNaira, initials } from "@/lib/format";

export function CustomersPage() {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    if (!query) return customers;
    const q = query.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.includes(q),
    );
  }, [query]);

  return (
    <div>
      <PageHeader
        title="Customers"
        description={`${customers.length} customers · ₦${(customers.reduce((s, c) => s + c.totalSpend, 0) / 100 / 1_000_000).toFixed(1)}M lifetime value`}
      />

      <Card size="sm">
        <CardContent className="p-0">
          <div className="border-b px-5 py-3">
            <div className="relative max-w-md">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or phone"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState title="No customers match" icon={<UsersIcon className="size-8" />} />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Total spend</TableHead>
                    <TableHead>Transactions</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => (
                    <TableRow key={c.id} className="cursor-pointer">
                      <TableCell>
                        <Link to={`/customers/${c.id}`} className="flex items-center gap-3 hover:underline">
                          <Avatar className="size-8 rounded-none">
                            <AvatarFallback className="rounded-none bg-secondary text-[11px] font-semibold uppercase">
                              {initials(c.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{c.name}</div>
                            <div className="text-xs text-muted-foreground">{c.email}</div>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{c.phone}</TableCell>
                      <TableCell className="font-semibold">{formatNaira(c.totalSpend, { compact: true })}</TableCell>
                      <TableCell>{c.transactionCount}</TableCell>
                      <TableCell><StatusBadge status={c.status} /></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(c.createdAt)}</TableCell>
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
