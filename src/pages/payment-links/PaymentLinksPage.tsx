import { useState } from "react";
import { LinkIcon, PlusIcon, MoreHorizontalIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { CopyButton } from "@/components/common/CopyButton";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { CreateLinkDialog } from "@/components/payment-links/CreateLinkDialog";
import { usePaymentLinksStore } from "@/store/usePaymentLinksStore";
import { formatDate, formatNaira } from "@/lib/format";
import type { PaymentLink } from "@/types";
import { toast } from "sonner";

export function PaymentLinksPage() {
  const links = usePaymentLinksStore((s) => s.items);
  const toggleActive = usePaymentLinksStore((s) => s.toggleActive);
  const remove = usePaymentLinksStore((s) => s.remove);
  const [open, setOpen] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState<PaymentLink | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<PaymentLink | null>(null);

  const totalCollected = links.reduce((s, l) => s + l.totalCollected, 0);

  return (
    <div>
      <PageHeader
        title="Payment Links"
        description={`${links.length} links Â· ${formatNaira(totalCollected, { compact: true })} collected lifetime`}
        actions={
          <Button size="sm" onClick={() => setOpen(true)}>
            <PlusIcon /> New link
          </Button>
        }
      />

      <Card size="sm">
        <CardContent className="p-0">
          {links.length === 0 ? (
            <EmptyState
              title="No payment links yet"
              description="Create a hosted checkout link to start collecting payments instantly â€” no integration required."
              icon={<LinkIcon className="size-8" />}
              action={<Button size="sm" onClick={() => setOpen(true)}><PlusIcon /> Create link</Button>}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Collected</TableHead>
                    <TableHead>Payments</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {links.map((l) => {
                    const url = `pay.icad.ng/${l.slug}`;
                    return (
                      <TableRow key={l.id}>
                        <TableCell>
                          <div className="font-medium">{l.name}</div>
                          {l.description && <div className="text-xs text-muted-foreground">{l.description}</div>}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 font-mono text-xs">
                            <span className="text-muted-foreground">{url}</span>
                            <CopyButton value={`https://${url}`} label="Link" size="icon-xs" />
                          </div>
                        </TableCell>
                        <TableCell>
                          {l.amount === null ? (
                            <span className="text-xs text-muted-foreground">Open</span>
                          ) : (
                            <span className="font-semibold">{formatNaira(l.amount)}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{formatNaira(l.totalCollected, { compact: true })}</TableCell>
                        <TableCell className="text-sm">{l.paymentCount}</TableCell>
                        <TableCell>
                          <StatusBadge status={l.active ? "active" : "inactive"} />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatDate(l.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon-xs" aria-label="More">
                                <MoreHorizontalIcon />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(`https://${url}`).then(() => toast.success("Link copied"))}>
                                Copy link
                              </DropdownMenuItem>
                              {l.active ? (
                                <DropdownMenuItem onClick={() => setConfirmDeactivate(l)}>
                                  Deactivate
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => { toggleActive(l.id); toast.success("Link reactivated"); }}>
                                  Reactivate
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem variant="destructive" onClick={() => setConfirmDelete(l)}>
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateLinkDialog open={open} onOpenChange={setOpen} />

      <ConfirmDialog
        open={confirmDeactivate !== null}
        onOpenChange={(o) => !o && setConfirmDeactivate(null)}
        title="Deactivate payment link?"
        description={`"${confirmDeactivate?.name}" will stop accepting new payments. You can reactivate it any time.`}
        confirmLabel="Deactivate"
        onConfirm={() => {
          if (confirmDeactivate) {
            toggleActive(confirmDeactivate.id);
            toast.success("Link deactivated");
          }
        }}
      />

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
        title="Delete payment link permanently?"
        description={`"${confirmDelete?.name}" will be removed. Existing transactions associated with it remain in your records, but the URL will return 404.`}
        confirmLabel="Delete link"
        variant="destructive"
        onConfirm={() => {
          if (confirmDelete) {
            remove(confirmDelete.id);
            toast.success("Payment link deleted");
          }
        }}
      />
    </div>
  );
}
