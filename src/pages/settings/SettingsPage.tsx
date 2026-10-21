import { type FormEvent, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  BellIcon,
  BuildingIcon,
  CheckIcon,
  CodeIcon,
  KeyRoundIcon,
  PlusIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
  Trash2Icon,
  UserIcon,
  UsersIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/common/PageHeader";
import { BusinessLogoAvatar } from "@/components/common/BusinessLogoAvatar";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { AccessDenied } from "@/components/common/AccessDenied";
import { StatusBadge } from "@/components/common/StatusBadge";
import { DevelopersTab } from "@/components/settings/DevelopersTab";
import { SettlementAccountSection } from "@/components/settings/SettlementAccountSection";
import { RolesTab } from "@/components/settings/RolesTab";
import { useAppStore } from "@/store/useAppStore";
import { useTeamStore } from "@/store/useTeamStore";
import { formatDate, formatRelative, initials } from "@/lib/format";
import type { TeamMember } from "@/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import * as rolesApi from "@/lib/api/rolesApi";
import * as settingsApi from "@/lib/api/settingsApi";
import { AuthApiError } from "@/types/auth";
import { InviteMemberDialog } from "@/components/team/InviteMemberDialog";
import { isForbidden, PERMISSIONS } from "@/lib/auth/permissions";
import { useHasAny, useHasPermission } from "@/hooks/usePermissions";

function showError(err: unknown, fallback = "Something went wrong") {
  if (err instanceof AuthApiError) {
    toast.error(err.message);
    return;
  }
  if (err instanceof Error) {
    toast.error(err.message || fallback);
    return;
  }
  toast.error(fallback);
}

const TABS = [
  { value: "profile", label: "Profile", Icon: UserIcon },
  { value: "business", label: "Business", Icon: BuildingIcon },
  { value: "team", label: "Team", Icon: UsersIcon },
  { value: "roles", label: "Roles", Icon: KeyRoundIcon },
  { value: "security", label: "Security", Icon: ShieldCheckIcon },
  { value: "notifications", label: "Notifications", Icon: BellIcon },
  { value: "developers", label: "Developers", Icon: CodeIcon },
] as const;

export function SettingsPage() {
  const { tab } = useParams<{ tab: string }>();
  const navigate = useNavigate();
  const canViewTeam = useHasPermission(PERMISSIONS["team.view"]);
  const canViewRoles = useHasPermission(PERMISSIONS["roles.view"]);
  const canViewDevelopers = useHasAny([
    PERMISSIONS["developer.view_keys"],
    PERMISSIONS["developer.manage_callback"],
  ]);
  const active = TABS.some((t) => t.value === tab) ? tab! : "profile";
  const visibleTabs = TABS.filter((t) => {
    if (t.value === "team") return canViewTeam;
    if (t.value === "roles") return canViewRoles;
    if (t.value === "developers") return canViewDevelopers;
    return true;
  });
  const tabValue = visibleTabs.some((t) => t.value === active) ? active : visibleTabs[0]!.value;

  return (
    <div>
      <PageHeader title="Settings" description="Manage your account, business profile, team, roles, security, and developer tools." />

      <Tabs value={tabValue} onValueChange={(v) => navigate(`/settings/${v}`)}>
        <TabsList>
          {visibleTabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              <t.Icon className="size-3.5" /> {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="mt-6">
        {active === "profile" && <ProfileTab />}
        {active === "business" && <BusinessTab />}
        {active === "team" && (canViewTeam ? <TeamTab /> : <AccessDenied description="You don't have permission to view the team." />)}
        {active === "roles" && (canViewRoles ? <RolesTab /> : <AccessDenied description="You don't have permission to view roles." />)}
        {active === "security" && <SecurityTab />}
        {active === "notifications" && <NotificationsTab />}
        {active === "developers" && (canViewDevelopers ? <DevelopersTab /> : <AccessDenied description="You don't have permission to view developer settings." />)}
      </div>
    </div>
  );
}

function ProfileTab() {
  const user = useAppStore((s) => s.user)!;
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [email] = useState(user.email);
  const [phone, setPhone] = useState(user.phone);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    toast.success("Profile updated");
  }

  return (
    <div className="space-y-4">
      <Card size="sm">
        <CardHeader className="border-b"><CardTitle>Personal information</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="fn">First name</Label>
              <Input id="fn" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ln">Last name</Label>
              <Input id="ln" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} disabled />
              <p className="text-[11px] text-muted-foreground">Contact support to change your email.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <Button type="submit">Save changes</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader className="border-b"><CardTitle>Security</CardTitle></CardHeader>
        <CardContent>
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => { e.preventDefault(); toast.success("Password updated"); }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="current">Current password</Label>
              <Input id="current" type="password" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new">New password</Label>
              <Input id="new" type="password" required minLength={8} />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <Button type="submit">Update password</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

const LOGO_MAX_BYTES = 5 * 1024 * 1024;
const LOGO_CONTENT_TYPES = ["image/png", "image/jpeg", "image/webp"];

function logoClientErrorMessage(file: File): string | null {
  if (file.size === 0) return "Logo file must not be empty.";
  if (!LOGO_CONTENT_TYPES.includes(file.type.toLowerCase())) {
    return "Logo must be a PNG, JPEG, or WEBP image.";
  }
  if (file.size > LOGO_MAX_BYTES) return "Logo file must not exceed 5MB.";
  return null;
}

function orDash(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : "—";
}

function BusinessTab() {
  const canView = useHasPermission(PERMISSIONS["settings.view"]);
  const canUpdate = useHasPermission(PERMISSIONS["settings.update"]);
  const patchUser = useAppStore((s) => s.patchUser);
  const [loading, setLoading] = useState(canView);
  const [saving, setSaving] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [profile, setProfile] = useState<settingsApi.MerchantSettingsProfileDto | null>(null);
  const [inlineErrors, setInlineErrors] = useState<Record<string, string>>({});

  const [displayName, setDisplayName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [supportEmailAddress, setSupportEmailAddress] = useState("");
  const [website, setWebsite] = useState("");
  const [address, setAddress] = useState("");

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [logoClientError, setLogoClientError] = useState<string | null>(null);
  const [storedLogoPreviewUrl, setStoredLogoPreviewUrl] = useState<string | null>(null);
  const [, setStoredLogoState] = useState<"idle" | "loading" | "ready" | "missing" | "error">("idle");
  const logoObjectUrlRef = useRef<string | null>(null);
  const storedLogoObjectUrlRef = useRef<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const suppressStoredLogoEffectRef = useRef(false);
  const businessTabMountedRef = useRef(true);

  function applyEditable(p: settingsApi.MerchantSettingsProfileDto) {
    setDisplayName(p.displayName ?? "");
    setPhoneNumber(p.phoneNumber ?? "");
    setEmailAddress(p.emailAddress ?? "");
    setSupportEmailAddress(p.supportEmailAddress ?? "");
    setWebsite(p.website ?? "");
    setAddress(p.address ?? "");
  }

  function selectLogoFile(file: File | null) {
    if (logoObjectUrlRef.current) {
      URL.revokeObjectURL(logoObjectUrlRef.current);
      logoObjectUrlRef.current = null;
    }
    setLogoClientError(null);
    if (!file) {
      setLogoFile(null);
      setLogoPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    logoObjectUrlRef.current = objectUrl;
    setLogoFile(file);
    setLogoPreviewUrl(objectUrl);
  }

  function clearChosenLogo() {
    selectLogoFile(null);
    if (logoInputRef.current) logoInputRef.current.value = "";
  }

  function clearInline(key: string) {
    setInlineErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function replaceStoredLogo(blob: Blob | null) {
    if (storedLogoObjectUrlRef.current) {
      URL.revokeObjectURL(storedLogoObjectUrlRef.current);
      storedLogoObjectUrlRef.current = null;
    }
    if (!blob) {
      setStoredLogoPreviewUrl(null);
      setStoredLogoState("missing");
      return;
    }
    const objectUrl = URL.createObjectURL(blob);
    storedLogoObjectUrlRef.current = objectUrl;
    setStoredLogoPreviewUrl(objectUrl);
    setStoredLogoState("ready");
  }

  useEffect(() => {
    businessTabMountedRef.current = true;
    return () => {
      businessTabMountedRef.current = false;
      if (logoObjectUrlRef.current) {
        URL.revokeObjectURL(logoObjectUrlRef.current);
        logoObjectUrlRef.current = null;
      }
      if (storedLogoObjectUrlRef.current) {
        URL.revokeObjectURL(storedLogoObjectUrlRef.current);
        storedLogoObjectUrlRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!canView) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setForbidden(false);
      try {
        const p = await settingsApi.getProfile();
        if (cancelled) return;
        setProfile(p);
        applyEditable(p);
      } catch (e) {
        if (cancelled) return;
        if (isForbidden(e)) {
          setForbidden(true);
          return;
        }
        showError(e, "Could not load business profile");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canView]);

  useEffect(() => {
    if (logoFile || suppressStoredLogoEffectRef.current) return;
    const key = profile?.logoUrl?.trim() ?? "";
    if (!key) {
      // A first upload can be on the server while profile.logoUrl is still empty.
      // Keep that blob; revoking it here hides the logo again.
      if (storedLogoObjectUrlRef.current) return;
      setStoredLogoPreviewUrl(null);
      setStoredLogoState("idle");
      return;
    }

    let cancelled = false;
    setStoredLogoState("loading");
    (async () => {
      try {
        const blob = await settingsApi.getLogo();
        if (cancelled || !businessTabMountedRef.current) return;
        replaceStoredLogo(blob);
      } catch (e) {
        if (cancelled) return;
        if (isForbidden(e)) {
          setForbidden(true);
          return;
        }
        setStoredLogoState("error");
        showError(e, "Could not load logo");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [profile?.logoUrl, logoFile]);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!profile || !canUpdate) return;

    if (logoFile) {
      const message = logoClientErrorMessage(logoFile);
      if (message) {
        setLogoClientError(message);
        toast.error(message);
        return;
      }
    }
    setLogoClientError(null);

    const trimmedDisplayName = displayName.trim();
    const trimmedPhone = phoneNumber.trim();
    const trimmedEmail = emailAddress.trim();
    const trimmedSupport = supportEmailAddress.trim();
    const trimmedWebsite = website.trim();
    const trimmedAddress = address.trim();

    const nextErrors: Record<string, string> = {};
    if (!trimmedDisplayName) nextErrors.displayName = "Business name cannot be empty.";
    if (!trimmedPhone) nextErrors.phoneNumber = "Phone number cannot be empty.";

    const optionalFields: { key: string; value: string; original: string | null; message: string }[] = [
      { key: "emailAddress", value: trimmedEmail, original: profile.emailAddress, message: "Email address cannot be empty." },
      {
        key: "supportEmailAddress",
        value: trimmedSupport,
        original: profile.supportEmailAddress,
        message: "Support email address cannot be empty.",
      },
      { key: "website", value: trimmedWebsite, original: profile.website, message: "Website cannot be empty." },
      { key: "address", value: trimmedAddress, original: profile.address, message: "Address cannot be empty." },
    ];
    for (const field of optionalFields) {
      if (field.value) continue;
      const hadValue = (field.original ?? "").trim() !== "";
      if (hadValue) nextErrors[field.key] = field.message;
    }
    if (Object.keys(nextErrors).length > 0) {
      setInlineErrors(nextErrors);
      return;
    }
    setInlineErrors({});

    const body: settingsApi.PatchMerchantSettingsProfileRequest = {
      displayName: trimmedDisplayName,
      phoneNumber: trimmedPhone,
    };
    if (trimmedEmail) body.emailAddress = trimmedEmail;
    if (trimmedSupport) body.supportEmailAddress = trimmedSupport;
    if (trimmedWebsite) body.website = trimmedWebsite;
    if (trimmedAddress) body.address = trimmedAddress;

    setSaving(true);
    try {
      const updated = await settingsApi.patchProfile(body);
      setProfile(updated);
      applyEditable(updated);
      patchUser({ businessName: updated.displayName });

      if (logoFile) {
        try {
          await settingsApi.uploadLogo(logoFile);
        } catch (err) {
          if (isForbidden(err)) {
            setForbidden(true);
            return;
          }
          if (err instanceof AuthApiError && err.fieldErrors) {
            const key = Object.keys(err.fieldErrors).find((k) => k.toLowerCase() === "logo");
            const message = key ? err.fieldErrors[key]?.[0] : undefined;
            if (message) setLogoClientError(message);
          }
          showError(err, "Could not upload logo");
          toast.error("Your profile was updated, but the logo was not.");
          return;
        }
        suppressStoredLogoEffectRef.current = true;
        clearChosenLogo();
        try {
          try {
            const refreshed = await settingsApi.getProfile();
            setProfile(refreshed);
            applyEditable(refreshed);
          } catch (refreshErr) {
            if (isForbidden(refreshErr)) {
              setForbidden(true);
              return;
            }
            showError(refreshErr, "Could not refresh business profile");
          }
          try {
            const blob = await settingsApi.getLogo();
            if (!businessTabMountedRef.current) return;
            replaceStoredLogo(blob);
          } catch (logoErr) {
            if (isForbidden(logoErr)) {
              setForbidden(true);
              return;
            }
            setStoredLogoState("error");
            showError(logoErr, "Could not load logo");
          }
        } finally {
          suppressStoredLogoEffectRef.current = false;
        }
      }

      toast.success("Business profile updated");
    } catch (err) {
      if (isForbidden(err)) {
        setForbidden(true);
        return;
      }
      showError(err, "Could not update business profile");
    } finally {
      setSaving(false);
    }
  }

  const logoImageSrc = logoPreviewUrl ?? storedLogoPreviewUrl;
  const inputsDisabled = saving || !canUpdate;

  return (
    <div className="space-y-4">
      {!canView || forbidden ? (
        <AccessDenied description="You don't have permission to view business settings." />
      ) : (
    <Card size="sm">
      <CardHeader className="flex-row items-center justify-between border-b">
        <CardTitle>Business profile</CardTitle>
        <StatusBadge status={String(profile?.onboardingStatus ?? "—").replaceAll("_", " ")} />
      </CardHeader>
      <CardContent>
        {loading || !profile ? (
          <div className="h-[240px] rounded-none bg-muted/20" />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Status" value={orDash(profile.status)} />
              <Field label="Business type" value={orDash(profile.businessType)} />
              <Field label="Onboarding status" value={orDash(profile.onboardingStatus)} />
              <Field label="Industry" value={orDash(profile.industryType)} />
              <Field label="Company type" value={orDash(profile.companyType)} />
              <Field label="Trading name" value={orDash(profile.tradingName)} />
              <Field label="Registered address" value={orDash(profile.registeredAddress)} />
              <Field label="Created" value={formatDate(profile.createdAtUtc)} />
              {profile.updatedAtUtc ? <Field label="Updated" value={formatDate(profile.updatedAtUtc)} /> : null}
            </div>

            <form onSubmit={(e) => void save(e)} className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="min-w-0 space-y-1.5 sm:col-span-2">
                <Label>Logo</Label>
                <div className="flex items-start gap-4">
                  <BusinessLogoAvatar src={logoImageSrc} name={displayName} />
                  {canUpdate ? (
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <p className="text-xs text-muted-foreground">Optional. PNG, JPEG, or WEBP. Maximum 5 MB.</p>
                      <Input
                        ref={logoInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        disabled={inputsDisabled}
                        onChange={(e) => selectLogoFile(e.target.files?.[0] ?? null)}
                      />
                      {logoFile ? (
                        <Button type="button" variant="outline" size="sm" onClick={clearChosenLogo} disabled={saving}>
                          Remove
                        </Button>
                      ) : null}
                      {logoClientError ? <p className="text-xs text-destructive">{logoClientError}</p> : null}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label>Display name</Label>
                <Input
                  value={displayName}
                  onChange={(e) => {
                    setDisplayName(e.target.value);
                    clearInline("displayName");
                  }}
                  disabled={inputsDisabled}
                />
                {inlineErrors.displayName ? <p className="text-xs text-destructive">{inlineErrors.displayName}</p> : null}
              </div>
              <div className="space-y-1.5">
                <Label>Phone number</Label>
                <Input
                  value={phoneNumber}
                  onChange={(e) => {
                    setPhoneNumber(e.target.value);
                    clearInline("phoneNumber");
                  }}
                  disabled={inputsDisabled}
                />
                {inlineErrors.phoneNumber ? <p className="text-xs text-destructive">{inlineErrors.phoneNumber}</p> : null}
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={emailAddress}
                  onChange={(e) => {
                    setEmailAddress(e.target.value);
                    clearInline("emailAddress");
                  }}
                  disabled={inputsDisabled}
                />
                {inlineErrors.emailAddress ? <p className="text-xs text-destructive">{inlineErrors.emailAddress}</p> : null}
              </div>
              <div className="space-y-1.5">
                <Label>Support email</Label>
                <Input
                  type="email"
                  value={supportEmailAddress}
                  onChange={(e) => {
                    setSupportEmailAddress(e.target.value);
                    clearInline("supportEmailAddress");
                  }}
                  disabled={inputsDisabled}
                />
                {inlineErrors.supportEmailAddress ? (
                  <p className="text-xs text-destructive">{inlineErrors.supportEmailAddress}</p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label>Website</Label>
                <Input
                  value={website}
                  onChange={(e) => {
                    setWebsite(e.target.value);
                    clearInline("website");
                  }}
                  disabled={inputsDisabled}
                />
                {inlineErrors.website ? <p className="text-xs text-destructive">{inlineErrors.website}</p> : null}
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Address</Label>
                <Textarea
                  rows={2}
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    clearInline("address");
                  }}
                  disabled={inputsDisabled}
                />
                {inlineErrors.address ? <p className="text-xs text-destructive">{inlineErrors.address}</p> : null}
              </div>

              <div className="sm:col-span-2 flex justify-end">
                <Button type="submit" disabled={inputsDisabled}>{saving ? "Saving..." : "Save changes"}</Button>
              </div>
            </form>
          </>
        )}
      </CardContent>
    </Card>
      )}
      <SettlementAccountSection />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}

function TeamTab() {
  const canInvite = useHasPermission(PERMISSIONS["team.invite"]);
  const canRemove = useHasPermission(PERMISSIONS["team.remove"]);
  const canManageRoles = useHasPermission(PERMISSIONS["team.manage_roles"]);
  const canViewRoles = useHasPermission(PERMISSIONS["roles.view"]);
  const team = useTeamStore((s) => s.items);
  const loading = useTeamStore((s) => s.loading);
  const forbidden = useTeamStore((s) => s.forbidden);
  const refresh = useTeamStore((s) => s.refresh);
  const remove = useTeamStore((s) => s.remove);
  const setRole = useTeamStore((s) => s.setRole);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<{ id: string; name: string; mapped: TeamMember["role"] }[]>(
    [],
  );
  const [confirmRemove, setConfirmRemove] = useState<TeamMember | null>(null);
  const [confirmRoleChange, setConfirmRoleChange] = useState<{ member: TeamMember; newRoleId: string; newRoleName: string } | null>(null);
  const [rolesForbidden, setRolesForbidden] = useState(false);

  useEffect(() => {
    void refresh().catch((e) => {
      if (!isForbidden(e)) showError(e, "Could not load team");
    });
  }, [refresh]);

  useEffect(() => {
    if (!canViewRoles) return;
    let cancelled = false;
    (async () => {
      try {
        const roles = await rolesApi.listRoles();
        if (cancelled) return;
        const mapped = roles
          .map((r) => {
            const n = r.name.toLowerCase();
            const m: TeamMember["role"] =
              n.includes("admin") ? "admin" : n.includes("support") ? "support" : n.includes("owner") ? "owner" : "developer";
            return { id: r.id, name: r.name, mapped: m };
          })
          .filter((r) => r.mapped !== "owner");
        setAvailableRoles(mapped);
      } catch (e) {
        if (cancelled) return;
        if (isForbidden(e)) {
          setRolesForbidden(true);
          return;
        }
        showError(e, "Could not load roles");
        setAvailableRoles([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canViewRoles]);

  if (forbidden || rolesForbidden) {
    return <AccessDenied description="You don't have permission to view the team." />;
  }

  return (
    <Card size="sm">
      <CardHeader className="flex-row items-center justify-between border-b">
        <CardTitle>Team members</CardTitle>
        {canInvite && (
          <Button size="xs" variant="outline" onClick={() => setInviteOpen(true)}>
            <PlusIcon /> Invite member
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="h-[180px] bg-muted/20" />
        ) : (
          <ul className="divide-y">
            {team.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-3 px-6 py-4">
                <Avatar className="size-9 rounded-none">
                  <AvatarFallback className="rounded-none bg-secondary text-[11px] font-semibold uppercase">
                    {initials(m.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{m.name}</span>
                    {m.status === "invited" && <StatusBadge status="invited" />}
                  </div>
                  <div className="text-xs text-muted-foreground">{m.email}</div>
                  <div className="text-[10px] text-muted-foreground">
                    Invited {formatRelative(m.invitedAt)}
                  </div>
                </div>
                <Select
                  value={m.roleId ?? ""}
                  onValueChange={(roleId) => {
                    const roleName = availableRoles.find((r) => r.id === roleId)?.name ?? "role";
                    if (roleId && roleId !== m.roleId) setConfirmRoleChange({ member: m, newRoleId: roleId, newRoleName: roleName });
                  }}
                  disabled={!canManageRoles || !m.roleId || m.role === "owner"}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={m.roleName ?? "Select role"} />
                  </SelectTrigger>
                  <SelectContent>
                    {m.role === "owner" && m.roleId && <SelectItem value={m.roleId}>Owner</SelectItem>}
                    {availableRoles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {canRemove && m.role !== "owner" && (
                  <Button variant="ghost" size="icon-sm" onClick={() => setConfirmRemove(m)} aria-label="Remove member">
                    <Trash2Icon />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <ConfirmDialog
        open={confirmRemove !== null}
        onOpenChange={(o) => !o && setConfirmRemove(null)}
        title="Remove team member?"
        description={`${confirmRemove?.name} (${confirmRemove?.email}) will lose access to ICAD Pay immediately.`}
        confirmLabel="Remove member"
        variant="destructive"
        onConfirm={() => {
          if (confirmRemove) {
            void remove(confirmRemove.id)
              .then(() => toast.success("Member removed"))
              .catch((err) => {
                if (!isForbidden(err)) showError(err, "Could not remove member");
              });
          }
        }}
      />

      <ConfirmDialog
        open={confirmRoleChange !== null}
        onOpenChange={(o) => !o && setConfirmRoleChange(null)}
        title={`Change role to ${confirmRoleChange?.newRoleName}?`}
        description={`${confirmRoleChange?.member.name}'s permissions will change immediately.`}
        confirmLabel="Change role"
        onConfirm={() => {
          if (confirmRoleChange) {
            setRole(confirmRoleChange.member.id, confirmRoleChange.newRoleId)
              .then(() => toast.success("Role updated"))
              .catch((err) => {
                if (!isForbidden(err)) showError(err, "Could not update role");
              });
          }
        }}
      />

      {canInvite && (
        <InviteMemberDialog
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          roles={availableRoles.map(({ id, name }) => ({ id, name }))}
        />
      )}
    </Card>
  );
}

function SecurityTab() {
  const user = useAppStore((s) => s.user)!;
  const patchUser = useAppStore((s) => s.patchUser);
  const [twoFA, setTwoFA] = useState(user.twoFAEnabled);
  const [confirmDisable2FA, setConfirmDisable2FA] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);

  function handle2FA(next: boolean) {
    if (!next && twoFA) {
      setConfirmDisable2FA(true);
      return;
    }
    setTwoFA(next);
    patchUser({ twoFAEnabled: next });
    toast.success(next ? "Two-factor authentication enabled" : "");
  }

  const sessions = [
    {
      id: "s1",
      browser: "Chrome on macOS",
      location: "Lagos, NG",
      current: true,
      lastActive: "2026-05-11T10:00:00.000Z",
    },
    {
      id: "s2",
      browser: "Safari on iPhone",
      location: "Lagos, NG",
      current: false,
      lastActive: "2026-05-10T22:00:00.000Z",
    },
    {
      id: "s3",
      browser: "Firefox on Windows",
      location: "Abuja, NG",
      current: false,
      lastActive: "2026-05-05T08:00:00.000Z",
    },
  ];

  return (
    <div className="space-y-4">
      <Card size="sm">
        <CardHeader className="border-b"><CardTitle>Two-factor authentication</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <SmartphoneIcon className="size-4" /> Authenticator app
                {twoFA && <CheckIcon className="size-4 text-success" />}
              </div>
              <p className="mt-1 text-xs text-muted-foreground max-w-md">
                Use Google Authenticator or 1Password to generate one-time codes when signing in. Strongly recommended for accounts handling live transactions.
              </p>
            </div>
            <Switch checked={twoFA} onCheckedChange={handle2FA} />
          </div>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader className="border-b"><CardTitle>Active sessions</CardTitle></CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y">
            {sessions.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-4 px-6 py-4">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    {s.browser}
                    {s.current && (
                      <span className="rounded-none border border-success/30 bg-success/10 px-1.5 py-0.5 text-[10px] font-semibold text-success">
                        This device
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">{s.location} · last active {formatRelative(s.lastActive)}</div>
                </div>
                {!s.current && (
                  <Button variant="ghost" size="sm" onClick={() => setConfirmRevoke(s.id)}>
                    Revoke
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmDisable2FA}
        onOpenChange={setConfirmDisable2FA}
        title="Disable two-factor authentication?"
        description="Without 2FA, your account will be more vulnerable to compromise. We strongly recommend leaving this enabled, especially in Live mode."
        confirmLabel="Disable 2FA"
        variant="destructive"
        onConfirm={() => {
          setTwoFA(false);
          patchUser({ twoFAEnabled: false });
          toast.success("Two-factor authentication disabled");
        }}
      />

      <ConfirmDialog
        open={confirmRevoke !== null}
        onOpenChange={(o) => !o && setConfirmRevoke(null)}
        title="Revoke session?"
        description="That device will be signed out immediately."
        confirmLabel="Revoke session"
        variant="destructive"
        onConfirm={() => { toast.success("Session revoked"); }}
      />
    </div>
  );
}

function NotificationsTab() {
  const [prefs, setPrefs] = useState({
    successfulPayments: true,
    failedPayments: true,
    payoutSettled: true,
    webhookFailures: true,
    productUpdates: false,
    securityAlerts: true,
  });
  function setPref(key: keyof typeof prefs, value: boolean) {
    setPrefs((p) => ({ ...p, [key]: value }));
    toast.success(value ? "Notification enabled" : "Notification disabled", {
      description: prefLabels[key],
    });
  }
  const prefLabels: Record<keyof typeof prefs, string> = {
    successfulPayments: "Successful payments",
    failedPayments: "Failed payments",
    payoutSettled: "Payout settled",
    webhookFailures: "Webhook delivery failures",
    productUpdates: "Product updates and tips",
    securityAlerts: "Security alerts (always on)",
  };

  return (
    <Card size="sm">
      <CardHeader className="border-b"><CardTitle>Email notifications</CardTitle></CardHeader>
      <CardContent className="divide-y p-0">
        {(Object.keys(prefs) as (keyof typeof prefs)[]).map((key) => (
          <div key={key} className="flex items-center justify-between px-6 py-4">
            <div>
              <div className="text-sm font-semibold">{prefLabels[key]}</div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {key === "successfulPayments" && "Get notified for every successful charge."}
                {key === "failedPayments" && "Notified when a payment fails."}
                {key === "payoutSettled" && "Email confirmation when a payout reaches your bank."}
                {key === "webhookFailures" && "Get pinged if any webhook endpoint returns 4xx/5xx."}
                {key === "productUpdates" && "Occasional tips and new feature announcements."}
                {key === "securityAlerts" && "Login attempts, key rotations, and other sensitive events."}
              </p>
            </div>
            <Switch
              checked={prefs[key]}
              onCheckedChange={(v) => setPref(key, v)}
              disabled={key === "securityAlerts"}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
