import { authFetch } from "@/lib/authFetch";
import { getApiUrl } from "@/lib/env";
import { parseOkJson } from "@/lib/api/json";

const BASE = "/api/v1/merchant/team";

export interface TeamMemberDto {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  roleId: string;
  roleName: string;
  status: string;
  invitedAtUtc?: string | null;
  acceptedAtUtc?: string | null;
}

export interface InviteTeamMemberRequest {
  email: string;
  roleId: string;
}

export interface InviteTeamMemberResponse {
  invitationId: string;
  merchantId: string;
  email: string;
  roleId: string;
  inviteUrl: string;
  expiresAtUtc: string;
  createdAtUtc: string;
}

export interface AcceptInviteRequest {
  token: string;
}

export interface PatchTeamMemberRoleRequest {
  roleId: string;
}

export async function listTeam(): Promise<TeamMemberDto[]> {
  const res = await authFetch(getApiUrl(BASE));
  return parseOkJson(res);
}

export async function invite(body: InviteTeamMemberRequest): Promise<InviteTeamMemberResponse> {
  const res = await authFetch(getApiUrl(`${BASE}/invite`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseOkJson(res);
}

export async function acceptInvite(body: AcceptInviteRequest): Promise<unknown> {
  const res = await authFetch(getApiUrl(`${BASE}/accept-invite`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseOkJson(res);
}

export async function patchMemberRole(memberId: string, body: PatchTeamMemberRoleRequest): Promise<TeamMemberDto> {
  const res = await authFetch(getApiUrl(`${BASE}/${encodeURIComponent(memberId)}/role`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseOkJson(res);
}

export async function removeMember(memberId: string): Promise<void> {
  const res = await authFetch(getApiUrl(`${BASE}/${encodeURIComponent(memberId)}`), {
    method: "DELETE",
  });
  // parseOkJson would throw on non-ok; 204 is fine.
  if (res.status === 204 || res.ok) return;
  await parseOkJson(res);
}

