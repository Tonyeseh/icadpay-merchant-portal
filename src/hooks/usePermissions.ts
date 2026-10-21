import { hasAll, hasAny, hasPermission } from "@/lib/auth/permissions";
import { useAppStore } from "@/store/useAppStore";

export function usePermissions(): string[] {
  return useAppStore((s) => s.permissions);
}

export function useHasPermission(code: string): boolean {
  const permissions = usePermissions();
  return hasPermission(permissions, code);
}

export function useHasAny(codes: readonly string[]): boolean {
  const permissions = usePermissions();
  return hasAny(permissions, codes);
}

export function useHasAll(codes: readonly string[]): boolean {
  const permissions = usePermissions();
  return hasAll(permissions, codes);
}
