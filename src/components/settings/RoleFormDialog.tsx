import { type FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import * as rolesApi from "@/lib/api/rolesApi";
import { isForbidden } from "@/lib/auth/permissions";
import { describeRoleError } from "@/lib/roleErrors";
import type { Permission, Role } from "@/types/roles";

export type RoleFormMode = "create" | "edit" | "view";

const GROUP_ORDER = [
  "onboarding",
  "documents",
  "team",
  "roles",
  "settings",
  "subaccounts",
  "transactions",
  "developer",
] as const;

function groupKey(code: string): string {
  const dot = code.indexOf(".");
  return dot === -1 ? code : code.slice(0, dot);
}

function groupPermissions(catalog: Permission[]): { group: string; items: Permission[] }[] {
  const map = new Map<string, Permission[]>();
  for (const permission of catalog) {
    const key = groupKey(permission.code);
    const list = map.get(key) ?? [];
    list.push(permission);
    map.set(key, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.code.localeCompare(b.code));
  }
  const known = GROUP_ORDER.filter((group) => map.has(group));
  const rest = [...map.keys()]
    .filter((group) => !(GROUP_ORDER as readonly string[]).includes(group))
    .sort((a, b) => a.localeCompare(b));
  return [...known, ...rest].map((group) => ({ group, items: map.get(group)! }));
}

function permissionLabel(permission: Permission): string {
  const description = permission.decription.trim();
  return description || permission.code;
}

function titleFor(mode: RoleFormMode): string {
  if (mode === "create") return "Add role";
  if (mode === "edit") return "Edit role";
  return "Role";
}

function descriptionFor(mode: RoleFormMode): string {
  if (mode === "create") return "Name the role and choose what it can do.";
  if (mode === "edit") return "Update the name and permissions for this role.";
  return "Permissions included in this role.";
}

function applyLoadedRole(
  role: Role,
  setRoleName: (value: string) => void,
  setOriginalName: (value: string) => void,
  setSelected: (value: Set<string>) => void,
  setOriginalIds: (value: Set<string>) => void,
) {
  const ids = new Set(role.permissions.map((permission) => permission.id));
  setRoleName(role.roleName);
  setOriginalName(role.roleName);
  setSelected(ids);
  setOriginalIds(ids);
}

function RoleForm({
  mode,
  roleId,
  catalog,
  onOpenChange,
  onSaved,
}: {
  mode: RoleFormMode;
  roleId: string | null;
  catalog: Permission[] | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [roleName, setRoleName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [originalName, setOriginalName] = useState("");
  const [originalIds, setOriginalIds] = useState<Set<string>>(new Set());
  const [loadingRole, setLoadingRole] = useState(mode !== "create");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const groups = useMemo(() => groupPermissions(catalog ?? []), [catalog]);
  const readOnly = mode === "view";
  const catalogReady = catalog !== null;

  useEffect(() => {
    if (mode === "create" || !roleId) return;
    let cancelled = false;
    void rolesApi
      .getManagedRole(roleId)
      .then((role) => {
        if (cancelled) return;
        applyLoadedRole(role, setRoleName, setOriginalName, setSelected, setOriginalIds);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = describeRoleError(err);
        setLoadError(message);
        toast.error(message);
      })
      .finally(() => {
        if (!cancelled) setLoadingRole(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mode, roleId]);

  function toggle(id: string, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function refetchRole(id: string) {
    try {
      const fresh = await rolesApi.getManagedRole(id);
      applyLoadedRole(fresh, setRoleName, setOriginalName, setSelected, setOriginalIds);
    } catch {
      // Keep the form as the user left it if the follow-up read fails.
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (readOnly || submitting) return;
    const trimmed = roleName.trim();
    if (!trimmed) {
      toast.error("Role name is required.");
      return;
    }
    if (!catalogReady) return;

    setSubmitting(true);
    try {
      if (mode === "create") {
        await rolesApi.createManagedRole({
          roleName: trimmed,
          permissionIds: [...selected],
        });
        toast.success("Role created");
        onOpenChange(false);
        onSaved();
        return;
      }

      if (!roleId) return;
      if (trimmed !== originalName) {
        await rolesApi.patchManagedRole(roleId, { roleName: trimmed });
      }
      for (const id of selected) {
        if (!originalIds.has(id)) {
          await rolesApi.addManagedRolePermission(roleId, id);
        }
      }
      for (const id of originalIds) {
        if (!selected.has(id)) {
          await rolesApi.removeManagedRolePermission(roleId, id);
        }
      }
      toast.success("Role updated");
      onOpenChange(false);
      onSaved();
    } catch (err) {
      if (isForbidden(err)) {
        toast.error("You don't have permission to change roles.");
      } else {
        toast.error(describeRoleError(err));
      }
      if (mode === "edit" && roleId) {
        await refetchRole(roleId);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const fieldsDisabled = readOnly || submitting || loadingRole;
  const showForm = mode === "create" || (!loadingRole && !loadError);

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{titleFor(mode)}</DialogTitle>
        <DialogDescription>{descriptionFor(mode)}</DialogDescription>
      </DialogHeader>
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        {loadingRole && <p className="text-sm text-muted-foreground">Loading role…</p>}
        {loadError && !loadingRole && <p className="text-sm text-muted-foreground">{loadError}</p>}
        {showForm && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="role-name">Name</Label>
              <Input
                id="role-name"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                disabled={fieldsDisabled}
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label>Permissions</Label>
              {!catalogReady ? (
                <p className="text-sm text-muted-foreground">Permissions could not be loaded.</p>
              ) : (
                <div className="max-h-[360px] space-y-4 overflow-y-auto pr-1">
                  {groups.map(({ group, items }) => (
                    <div key={group} className="space-y-2">
                      <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                        {group}
                      </div>
                      <ul className="space-y-2">
                        {items.map((permission) => (
                          <li key={permission.id} className="flex items-start gap-2">
                            <Checkbox
                              id={`perm-${permission.id}`}
                              checked={selected.has(permission.id)}
                              disabled={fieldsDisabled}
                              onCheckedChange={(value) => toggle(permission.id, value === true)}
                            />
                            <label htmlFor={`perm-${permission.id}`} className="min-w-0 leading-tight">
                              <div className="text-sm">{permissionLabel(permission)}</div>
                              <div className="font-mono text-xs text-muted-foreground">{permission.code}</div>
                            </label>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
        {!readOnly && (
          <DialogFooter>
            <Button
              type="submit"
              disabled={submitting || loadingRole || !catalogReady || Boolean(loadError)}
            >
              {mode === "create" ? "Create role" : "Save changes"}
            </Button>
          </DialogFooter>
        )}
      </form>
    </DialogContent>
  );
}

export function RoleFormDialog({
  open,
  onOpenChange,
  mode,
  roleId,
  catalog,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: RoleFormMode;
  roleId: string | null;
  catalog: Permission[] | null;
  onSaved: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <RoleForm
          key={`${mode}:${roleId ?? "new"}`}
          mode={mode}
          roleId={roleId}
          catalog={catalog}
          onOpenChange={onOpenChange}
          onSaved={onSaved}
        />
      ) : null}
    </Dialog>
  );
}
