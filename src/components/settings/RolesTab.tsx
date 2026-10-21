import { useCallback, useEffect, useRef, useState } from "react";
import { EyeIcon, KeyRoundIcon, MoreHorizontalIcon, PencilIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { AccessDenied } from "@/components/common/AccessDenied";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { RoleFormDialog, type RoleFormMode } from "@/components/settings/RoleFormDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useHasPermission } from "@/hooks/usePermissions";
import * as rolesApi from "@/lib/api/rolesApi";
import { isForbidden, PERMISSIONS } from "@/lib/auth/permissions";
import { formatDate } from "@/lib/format";
import { describeRoleError } from "@/lib/roleErrors";
import { useAppStore } from "@/store/useAppStore";
import type { Permission, RoleListItem, RolePage } from "@/types/roles";

const PAGE_SIZE = 100;

export function RolesTab() {
  const canView = useHasPermission(PERMISSIONS["roles.view"]);
  const canCreate = useHasPermission(PERMISSIONS["roles.create"]);
  const canUpdate = useHasPermission(PERMISSIONS["roles.update"]);
  const activeMerchantId = useAppStore((s) => s.activeMerchantId);

  const [items, setItems] = useState<RoleListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(canView);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [catalog, setCatalog] = useState<Permission[] | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<RoleFormMode>("create");
  const [formRoleId, setFormRoleId] = useState<string | null>(null);

  const requestGen = useRef(0);

  const applyPage = useCallback((page: RolePage) => {
    setItems(page.items);
    setTotalCount(page.totalCount);
    setPageNumber(page.pageNumber >= 1 ? page.pageNumber : 1);
    setPageSize(page.pageSize >= 1 ? page.pageSize : PAGE_SIZE);
    setForbidden(false);
    setError(null);
  }, []);

  const loadCatalog = useCallback(async (gen: number) => {
    try {
      const permissions = await rolesApi.listPermissionCatalog();
      if (requestGen.current !== gen) return;
      setCatalog(permissions);
      setCatalogError(null);
    } catch (err) {
      if (requestGen.current !== gen) return;
      const message = describeRoleError(err);
      setCatalog(null);
      setCatalogError(message);
      toast.error(message);
    }
  }, []);

  const loadPage = useCallback(async (page: number, gen: number) => {
    setLoading(true);
    setError(null);
    setForbidden(false);
    try {
      const data = await rolesApi.listManagedRoles(page, PAGE_SIZE);
      if (requestGen.current !== gen) return;
      applyPage(data);
    } catch (err) {
      if (requestGen.current !== gen) return;
      if (isForbidden(err)) {
        setForbidden(true);
        setError(null);
        return;
      }
      setError(describeRoleError(err));
    } finally {
      if (requestGen.current === gen) setLoading(false);
    }
  }, [applyPage]);

  useEffect(() => {
    if (!canView) return;
    const gen = ++requestGen.current;
    void Promise.all([loadCatalog(gen), loadPage(1, gen)]);
    return () => {
      requestGen.current += 1;
    };
  }, [canView, activeMerchantId, loadCatalog, loadPage]);

  function openForm(mode: RoleFormMode, roleId: string | null) {
    setFormMode(mode);
    setFormRoleId(roleId);
    setFormOpen(true);
  }

  function retry() {
    const gen = ++requestGen.current;
    void Promise.all([
      catalog === null ? loadCatalog(gen) : Promise.resolve(),
      loadPage(pageNumber, gen),
    ]);
  }

  function goToPage(page: number) {
    const gen = ++requestGen.current;
    void loadPage(page, gen);
  }

  if (forbidden) {
    return <AccessDenied description="You don't have permission to view roles." />;
  }

  const showPager = !loading && !error && totalCount > pageSize;
  const catalogLoaded = catalog !== null && catalogError === null;

  return (
    <>
      <PageHeader
        title="Roles"
        description="Control what teammates can see and change."
        actions={
          canCreate ? (
            <Button disabled={!catalogLoaded} onClick={() => openForm("create", null)}>
              <PlusIcon /> Add role
            </Button>
          ) : undefined
        }
      />

      <Card size="sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="px-5 py-10 text-sm text-muted-foreground">Loading roles…</div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 px-5 py-10 text-center">
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button size="sm" variant="outline" onClick={retry}>
                Retry
              </Button>
            </div>
          ) : totalCount === 0 ? (
            <EmptyState
              title="No roles yet"
              description="Create a role to control what teammates can do."
              icon={<KeyRoundIcon className="size-8" />}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="w-[70px] text-right" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((row) => {
                    const builtIn = row.merchantId === null;
                    const editable = !builtIn && canUpdate;
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.roleName}</TableCell>
                        <TableCell>
                          {builtIn ? (
                            <Badge variant="outline">Built-in</Badge>
                          ) : (
                            <Badge variant="secondary">Custom</Badge>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                          {formatDate(row.updatedAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon-xs" aria-label="Row actions">
                                <MoreHorizontalIcon />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {editable ? (
                                <DropdownMenuItem onClick={() => openForm("edit", row.id)}>
                                  <PencilIcon />
                                  Edit
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => openForm("view", row.id)}>
                                  <EyeIcon />
                                  View
                                </DropdownMenuItem>
                              )}
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
        {showPager && (
          <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
            <Button
              size="sm"
              variant="outline"
              disabled={pageNumber <= 1}
              onClick={() => goToPage(pageNumber - 1)}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pageNumber * pageSize >= totalCount}
              onClick={() => goToPage(pageNumber + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </Card>

      <RoleFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        roleId={formRoleId}
        catalog={catalog}
        onSaved={() => {
          const gen = ++requestGen.current;
          void loadPage(pageNumber, gen);
        }}
      />
    </>
  );
}
