import { useEffect, useState } from "react";
import { PieChartIcon, PlusIcon, MoreHorizontalIcon, PencilIcon, Trash2Icon } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/common/PageHeader";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { AccessDenied } from "@/components/common/AccessDenied";
import { CreateSubaccountDialog } from "@/components/subaccounts/CreateSubaccountDialog";
import { EditSubaccountDialog } from "@/components/subaccounts/EditSubaccountDialog";
import { useSubaccountsStore } from "@/store/useSubaccountsStore";
import type { SubaccountDto } from "@/types/subaccounts";
import { formatDate, formatDefaultSplitSummary } from "@/lib/format";
import { describeSubaccountError } from "@/lib/subaccountErrors";
import { toast } from "sonner";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { useHasPermission } from "@/hooks/usePermissions";

function maskAccountNumber(acct: string): string {
  if (acct.length <= 4) return "••••";
  return `••••${acct.slice(-4)}`;
}

export function SubaccountsPage() {
  const canView = useHasPermission(PERMISSIONS["subaccounts.view"]);
  const canCreate = useHasPermission(PERMISSIONS["subaccounts.create"]);
  const canUpdate = useHasPermission(PERMISSIONS["subaccounts.update"]);
  const canDelete = useHasPermission(PERMISSIONS["subaccounts.delete"]);
  const items = useSubaccountsStore((s) => s.items);
  const forbidden = useSubaccountsStore((s) => s.forbidden);
  const hydrate = useSubaccountsStore((s) => s.hydrate);
  const update = useSubaccountsStore((s) => s.update);
  const remove = useSubaccountsStore((s) => s.remove);

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SubaccountDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SubaccountDto | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    if (!canView) return;
    void hydrate();
  }, [canView, hydrate]);

  if (!canView || forbidden) {
    return (
      <div>
        <PageHeader
          title="Subaccounts"
          description="Split beneficiaries and default platform share for each settlement leg."
        />
        <AccessDenied description="You don't have permission to view subaccounts." />
      </div>
    );
  }

  async function handleToggleActive(row: SubaccountDto, next: boolean) {
    if (next === row.isActive) return;
    setTogglingId(row.id);
    try {
      await update(row.id, { isActive: next });
      toast.success(next ? "Subaccount activated" : "Subaccount deactivated");
    } catch (e) {
      toast.error("Unable to update subaccount", { description: describeSubaccountError(e) });
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Subaccounts"
        description="Split beneficiaries and default platform share for each settlement leg."
        actions={
          canCreate ? (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <PlusIcon />
              Add subaccount
            </Button>
          ) : undefined
        }
      />

      <Card size="sm">
        <CardContent className="p-0">
          {items.length === 0 ? (
            <EmptyState
              title="No subaccounts yet"
              description="Create a subaccount to route part of each payment to a partner bank account."
              icon={<PieChartIcon className="size-8" />}
              action={
                canCreate ? (
                  <Button size="sm" onClick={() => setCreateOpen(true)}>
                    <PlusIcon />
                    Add subaccount
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Business</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Bank</TableHead>
                    <TableHead>Default split</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[70px] text-right" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.businessName}</TableCell>
                      <TableCell>
                        <div className="text-sm">{row.accountName}</div>
                        <div className="font-mono text-xs text-muted-foreground">
                          {maskAccountNumber(row.accountNumber)}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{row.bankName}</TableCell>
                      <TableCell className="max-w-[200px] text-sm">
                        {formatDefaultSplitSummary(row)}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={row.isActive}
                          disabled={!canUpdate || togglingId === row.id}
                          onCheckedChange={(v) => void handleToggleActive(row, v)}
                          aria-label="Active"
                        />
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatDate(row.createdAtUtc)}
                      </TableCell>
                      <TableCell className="text-right">
                        {(canUpdate || canDelete) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon-xs" aria-label="Row actions">
                                <MoreHorizontalIcon />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {canUpdate && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setEditTarget(row);
                                  }}
                                >
                                  <PencilIcon />
                                  Edit
                                </DropdownMenuItem>
                              )}
                              {canDelete && (
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => setDeleteTarget(row)}
                                >
                                  <Trash2Icon />
                                  Delete
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {canCreate && <CreateSubaccountDialog open={createOpen} onOpenChange={setCreateOpen} />}

      <EditSubaccountDialog
        open={editTarget !== null}
        onOpenChange={(o) => {
          if (!o) setEditTarget(null);
        }}
        subaccount={editTarget}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete subaccount?"
        description={
          deleteTarget
            ? `${deleteTarget.businessName} (${maskAccountNumber(deleteTarget.accountNumber)}) will be removed. This cannot be undone from the dashboard.`
            : undefined
        }
        confirmLabel="Delete subaccount"
        variant="destructive"
        onConfirm={() => {
          if (!deleteTarget) return;
          void remove(deleteTarget.id)
            .then(() => toast.success("Subaccount deleted"))
            .catch((e) =>
              toast.error("Unable to delete subaccount", {
                description: describeSubaccountError(e),
              }),
            );
        }}
      />
    </div>
  );
}
