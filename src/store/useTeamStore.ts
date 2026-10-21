import { create } from "zustand";
import type { TeamMember } from "@/types";
import * as teamApi from "@/lib/api/teamApi";
import { isForbidden } from "@/lib/auth/permissions";

interface State {
  items: TeamMember[];
  loading: boolean;
  forbidden: boolean;
  lastInviteUrl: string | null;
  refresh: () => Promise<void>;
  invite: (email: string, roleId: string) => Promise<teamApi.InviteTeamMemberResponse>;
  remove: (id: string) => Promise<void>;
  setRole: (id: string, roleId: string) => Promise<void>;
}

const WELL_KNOWN_OWNER_ROLE_ID = "merchant_role_owner";

function mapRoleNameToRole(roleName: string): TeamMember["role"] {
  const r = roleName.toLowerCase();
  if (r.includes("owner")) return "owner";
  if (r.includes("admin")) return "admin";
  if (r.includes("support")) return "support";
  if (r.includes("developer")) return "developer";
  return "developer";
}

function classifyMemberRole(roleName: string | null | undefined, roleId: string | null | undefined): TeamMember["role"] {
  const name = roleName?.trim() ?? "";
  if (name) return mapRoleNameToRole(name);
  if (roleId === WELL_KNOWN_OWNER_ROLE_ID) return "owner";
  return "developer";
}

function mapDto(m: teamApi.TeamMemberDto): TeamMember {
  const name = `${m.firstName ?? ""} ${m.lastName ?? ""}`.trim() || m.email;
  return {
    id: m.userId,
    name,
    email: m.email,
    roleId: m.roleId,
    roleName: m.roleName,
    role: classifyMemberRole(m.roleName, m.roleId),
    status: String(m.status).toLowerCase() === "active" ? "active" : "invited",
    invitedAt: m.invitedAtUtc ?? m.acceptedAtUtc ?? new Date().toISOString(),
  };
}

export const useTeamStore = create<State>((set, get) => ({
  items: [],
  loading: false,
  forbidden: false,
  lastInviteUrl: null,

  refresh: async () => {
    set({ loading: true, forbidden: false });
    try {
      const items = await teamApi.listTeam();
      set({ items: items.map(mapDto), forbidden: false });
    } catch (e) {
      set({ forbidden: isForbidden(e) });
      if (!isForbidden(e)) throw e;
    } finally {
      set({ loading: false });
    }
  },

  invite: async (email, roleId) => {
    try {
      const res = await teamApi.invite({ email, roleId });
      set({ lastInviteUrl: res.inviteUrl, forbidden: false });
      // optimistic refresh; ignore errors to avoid hiding inviteUrl toast
      void get().refresh().catch(() => {});
      return res;
    } catch (e) {
      if (isForbidden(e)) set({ forbidden: true });
      throw e;
    }
  },

  remove: async (id) => {
    try {
      await teamApi.removeMember(id);
      set({ items: get().items.filter((m) => m.id !== id), forbidden: false });
    } catch (e) {
      if (isForbidden(e)) set({ forbidden: true });
      throw e;
    }
  },

  setRole: async (id, roleId) => {
    try {
      const updated = await teamApi.patchMemberRole(id, { roleId });
      const mapped = mapDto(updated);
      set({
        items: get().items.map((m) =>
          m.id === id
            ? { ...m, role: mapped.role, roleId: mapped.roleId, roleName: mapped.roleName }
            : m,
        ),
        forbidden: false,
      });
    } catch (e) {
      if (isForbidden(e)) set({ forbidden: true });
      throw e;
    }
  },
}));
