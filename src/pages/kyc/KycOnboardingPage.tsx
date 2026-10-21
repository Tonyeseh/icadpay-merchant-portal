import { type FormEvent, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BuildingIcon,
  CheckCircle2Icon,
  FileTextIcon,
  ShieldCheckIcon,
  UserIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { AccessDenied } from "@/components/common/AccessDenied";
import { BusinessLogoAvatar } from "@/components/common/BusinessLogoAvatar";
import { StatusBadge } from "@/components/common/StatusBadge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { banks } from "@/mock/banks";
import { cn } from "@/lib/utils";
import { getStoredAccessToken } from "@/lib/auth/accessToken";
import { refresh } from "@/lib/auth/merchantAuthApi";
import * as bankVerificationApi from "@/lib/api/bankVerificationApi";
import * as onboardingApi from "@/lib/api/onboardingApi";
import {
  firstValidationMessage,
  ONBOARDING_ERROR_CODES,
  submitErrorWizardTab,
} from "@/lib/onboardingErrors";
import { useAppStore } from "@/store/useAppStore";
import { toast } from "sonner";
import { AuthApiError } from "@/types/auth";
import { isForbidden, PERMISSIONS } from "@/lib/auth/permissions";
import { useHasPermission } from "@/hooks/usePermissions";
import type {
  AddOwnerRequest,
  BusinessType,
  DocumentTypeLookupItemDto,
  OnboardingDocumentDto,
  OnboardingOwnerDto,
  OnboardingSettlementAccountDto,
  RequiredDocumentDto,
  UpdateOnboardingProfileRequest,
  UpdateOwnerRequest,
} from "@/types/onboarding";

const BUSINESS_TYPES: { value: BusinessType; label: string }[] = [
  { value: "Non-Registered Business", label: "Non-registered business" },
  { value: "Registered Business", label: "Registered business" },
  { value: "Government Agency", label: "Government agency" },
];

/**
 * Backend stores `StaffSize` as a free-text string (max 50 chars, no fixed enum) — these bands
 * are a frontend convention, not a backend contract. Adjust freely if product wants different cuts.
 */
const STAFF_SIZE_OPTIONS = ["1-5", "6-10", "11-50", "51-200", "201-500", "500+"];

/** Fixed wizard order — the backend has no server-driven section/progress model. */
const SECTIONS: { code: string; title: string }[] = [
  { code: "profile", title: "Profile" },
  { code: "documents", title: "Documents" },
  { code: "owners", title: "Owners" },
  { code: "settlement_account", title: "Settlement account" },
  { code: "review", title: "Review & submit" },
];

function isEditableStatus(status: string): boolean {
  return status === "Draft" || status === "RequiresAction";
}

function normalizeOnboardingStatus(status: string | undefined): string {
  return String(status || "Draft").trim();
}

function isApprovedOnboardingStatus(status: string): boolean {
  return status.toLowerCase() === "approved";
}

function isRejectedOnboardingStatus(status: string): boolean {
  return status.toLowerCase() === "rejected";
}

/** Case-insensitive lookup into an ASP.NET ValidationProblem `errors` dictionary keyed by C# property name. */
function fieldError(fieldErrors: Record<string, string[]> | undefined, propertyName: string): string | undefined {
  if (!fieldErrors) return undefined;
  const key = Object.keys(fieldErrors).find((k) => k.toLowerCase() === propertyName.toLowerCase());
  return key ? fieldErrors[key]?.[0] : undefined;
}

const onboardingForbiddenListeners = new Set<() => void>();

function showError(err: unknown, fallback = "Something went wrong") {
  if (isForbidden(err)) {
    onboardingForbiddenListeners.forEach((notify) => notify());
    return;
  }
  if (err instanceof AuthApiError) {
    if (err.code === ONBOARDING_ERROR_CODES.ONBOARDING_NOT_EDITABLE) {
      toast.error(
        "Changes are not allowed while your application is in this status. If something looks wrong, contact support.",
      );
      return;
    }
    if (err.code === ONBOARDING_ERROR_CODES.MERCHANT_NOT_FOUND) {
      toast.error("Your merchant context could not be found. Try signing in again or switching merchants.");
      return;
    }
    toast.error(err.message);
    return;
  }
  if (err instanceof Error) {
    toast.error(err.message || fallback);
    return;
  }
  toast.error(fallback);
}

function ReadOnlyOnboardingBanner({ status }: { status: string }) {
  const st = normalizeOnboardingStatus(status);
  if (st === "Draft" || st === "RequiresAction") return null;

  if (st === "Submitted") {
    return (
      <div className="mt-4 rounded-none border border-border bg-muted/30 px-4 py-3 text-sm">
        <span className="font-semibold">Application received.</span> Your details are locked while we review them. We
        will email you if we need anything else.
      </div>
    );
  }

  if (st === "UnderReview") {
    return (
      <div className="mt-4 rounded-none border border-border bg-muted/30 px-4 py-3 text-sm">
        <span className="font-semibold">Under review.</span> Our team is reviewing your application. You cannot make
        changes until we update your status.
      </div>
    );
  }

  if (isRejectedOnboardingStatus(st)) {
    return (
      <div className="mt-4 space-y-3 rounded-none border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
        <p>
          <span className="font-semibold">Application not approved.</span> This decision is final and your profile
          cannot be edited here.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-none border border-border bg-muted/30 px-4 py-3 text-sm">
      Your onboarding is currently <span className="font-semibold">{st}</span>. Editing is disabled.
    </div>
  );
}

function ApprovedOnboardingCompletion() {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Onboarding complete</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your business verification is approved. You can use the dashboard and the rest of the portal.
        </p>
      </div>
      <Card size="sm">
        <CardHeader className="border-b">
          <CardTitle className="text-base">You are verified</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Button type="button" onClick={() => navigate("/dashboard", { replace: true })}>
            Go to dashboard
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link to="/settings/profile">Account settings</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export function KycOnboardingPage() {
  const [active, setActive] = useState<string>("profile");
  const [forbidden, setForbidden] = useState(false);
  const user = useAppStore((s) => s.user);
  const applyAuthResponse = useAppStore((s) => s.applyAuthResponse);
  const canView = useHasPermission(PERMISSIONS["onboarding.view"]);
  const canEdit = useHasPermission(PERMISSIONS["onboarding.edit"]);
  const canViewDocuments = useHasPermission(PERMISSIONS["documents.view"]);

  useEffect(() => {
    const mark = () => setForbidden(true);
    onboardingForbiddenListeners.add(mark);
    return () => {
      onboardingForbiddenListeners.delete(mark);
    };
  }, []);

  const onboardingStatus = normalizeOnboardingStatus(user?.onboardingStatus);
  const statusEditable = isEditableStatus(onboardingStatus);
  const canMutate = statusEditable && canEdit;

  const activeSectionIndex = SECTIONS.findIndex((s) => s.code === active);
  const canGoPrevious = activeSectionIndex > 0;

  function goToPreviousSection() {
    if (activeSectionIndex <= 0) return;
    setActive(SECTIONS[activeSectionIndex - 1]!.code);
  }

  function onCompleteStep(opts?: { navigateNext?: boolean }) {
    if (opts?.navigateNext && activeSectionIndex >= 0 && activeSectionIndex < SECTIONS.length - 1) {
      setActive(SECTIONS[activeSectionIndex + 1]!.code);
    }
  }

  async function syncOnboardingSession() {
    const token = getStoredAccessToken();
    if (!token) return;
    try {
      const session = await refresh(token);
      applyAuthResponse(session);
    } catch {
      /* best-effort */
    }
  }

  if (!canView || forbidden) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-semibold tracking-tight">Onboarding</h1>
        <AccessDenied description="You don't have permission to view onboarding." />
      </div>
    );
  }

  if (isApprovedOnboardingStatus(onboardingStatus)) {
    return <ApprovedOnboardingCompletion />;
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Onboarding</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Complete the checklist below to activate your merchant account.
            </p>
          </div>
          <StatusBadge status={onboardingStatus} />
        </div>
        <ReadOnlyOnboardingBanner status={onboardingStatus} />
        {statusEditable && !canEdit && (
          <div className="mt-4 rounded-none border border-border bg-muted/30 px-4 py-3 text-sm">
            You can view this application, but your role cannot save changes, upload documents, or submit it.
          </div>
        )}
      </div>

      <div className="grid items-stretch gap-4 lg:grid-cols-[280px_1fr]">
        <Card size="sm" className="h-full">
          <CardHeader className="border-b">
            <CardTitle className="text-base">Sections</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y">
              {SECTIONS.map((s) => {
                const isActive = s.code === active;
                return (
                  <li key={s.code}>
                    <button
                      type="button"
                      onClick={() => setActive(s.code)}
                      className={cn(
                        "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                        isActive ? "bg-muted/40" : "hover:bg-muted/30",
                      )}
                    >
                      <span className="grid size-9 place-items-center rounded-none border text-primary">
                        {s.code === "profile" && <BuildingIcon className="size-4" />}
                        {s.code === "documents" && <FileTextIcon className="size-4" />}
                        {s.code === "owners" && <UserIcon className="size-4" />}
                        {s.code === "settlement_account" && <BuildingIcon className="size-4" />}
                        {s.code === "review" && <ShieldCheckIcon className="size-4" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{s.title}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        <div className="flex h-full flex-col space-y-4">
          {active === "profile" && (
            <ProfileSection
              editable={canMutate}
              canGoPrevious={canGoPrevious}
              onPrevious={goToPreviousSection}
              onCompleteStep={onCompleteStep}
            />
          )}
          {active === "documents" &&
            (canViewDocuments ? (
              <DocumentsSection
                editable={canMutate}
                canGoPrevious={canGoPrevious}
                onPrevious={goToPreviousSection}
                onCompleteStep={onCompleteStep}
              />
            ) : (
              <AccessDenied description="You don't have permission to view onboarding documents." />
            ))}
          {active === "owners" && (
            <OwnersSection
              editable={canMutate}
              canGoPrevious={canGoPrevious}
              onPrevious={goToPreviousSection}
              onCompleteStep={onCompleteStep}
            />
          )}
          {active === "settlement_account" && (
            <SettlementSection
              editable={canMutate}
              canGoPrevious={canGoPrevious}
              onPrevious={goToPreviousSection}
              onCompleteStep={onCompleteStep}
            />
          )}
          {active === "review" && (
            <ReviewSection
              editable={canMutate}
              canGoPrevious={canGoPrevious}
              onPrevious={goToPreviousSection}
              onSubmitted={syncOnboardingSession}
              onNavigateToSection={(tab) => setActive(tab)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

type StepNavProps = {
  canGoPrevious: boolean;
  onPrevious: () => void;
  onCompleteStep: (opts?: { navigateNext?: boolean }) => void;
};

const LOGO_MAX_BYTES = 5 * 1024 * 1024;
const LOGO_CONTENT_TYPES = ["image/png", "image/jpeg", "image/webp"];

function hasStoredLogo(logoUrl: string | null): boolean {
  return logoUrl != null && logoUrl.trim() !== "";
}

function logoClientErrorMessage(file: File): string | null {
  if (file.size === 0) return "Logo file must not be empty.";
  if (!LOGO_CONTENT_TYPES.includes(file.type.toLowerCase())) {
    return "Logo must be a PNG, JPEG, or WEBP image.";
  }
  if (file.size > LOGO_MAX_BYTES) return "Logo file must not exceed 5MB.";
  return null;
}

function ProfileSection({ editable, canGoPrevious, onPrevious, onCompleteStep }: StepNavProps & { editable: boolean }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [industryTypes, setIndustryTypes] = useState<{ id: string; name: string }[]>([]);
  const [companyTypes, setCompanyTypes] = useState<{ id: string; name: string }[]>([]);

  const [displayName, setDisplayName] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [logoClientError, setLogoClientError] = useState<string | null>(null);
  const [storedLogoPreviewUrl, setStoredLogoPreviewUrl] = useState<string | null>(null);
  const [, setStoredLogoState] = useState<"idle" | "loading" | "ready" | "missing" | "error">("idle");
  const logoObjectUrlRef = useRef<string | null>(null);
  const storedLogoObjectUrlRef = useRef<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [businessType, setBusinessType] = useState<string>(BUSINESS_TYPES[0]!.value);
  const [industryTypeId, setIndustryTypeId] = useState("");
  const [companyTypeId, setCompanyTypeId] = useState("");
  const [tradingName, setTradingName] = useState("");
  const [staffSize, setStaffSize] = useState("");
  const [website, setWebsite] = useState("");
  const [registeredAddress, setRegisteredAddress] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [supportEmailAddress, setSupportEmailAddress] = useState("");

  useEffect(() => {
    return () => {
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

  useEffect(() => {
    if (logoFile) return;
    if (!hasStoredLogo(logoUrl)) {
      if (storedLogoObjectUrlRef.current) {
        URL.revokeObjectURL(storedLogoObjectUrlRef.current);
        storedLogoObjectUrlRef.current = null;
      }
      setStoredLogoPreviewUrl(null);
      setStoredLogoState("idle");
      return;
    }

    let cancelled = false;
    setStoredLogoState("loading");
    (async () => {
      try {
        const blob = await onboardingApi.getLogo();
        if (cancelled) return;
        if (!blob) {
          if (storedLogoObjectUrlRef.current) {
            URL.revokeObjectURL(storedLogoObjectUrlRef.current);
            storedLogoObjectUrlRef.current = null;
          }
          setStoredLogoPreviewUrl(null);
          setStoredLogoState("missing");
          return;
        }
        const objectUrl = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        if (storedLogoObjectUrlRef.current) {
          URL.revokeObjectURL(storedLogoObjectUrlRef.current);
        }
        storedLogoObjectUrlRef.current = objectUrl;
        setStoredLogoPreviewUrl(objectUrl);
        setStoredLogoState("ready");
      } catch (e) {
        if (cancelled) return;
        setStoredLogoState("error");
        showError(e, "Could not load logo");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [logoUrl, logoFile]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [p, industries] = await Promise.all([onboardingApi.getProfile(), onboardingApi.getIndustryTypes()]);
        if (cancelled) return;
        const initialBusinessType = String(p.businessType) || BUSINESS_TYPES[0]!.value;
        const companies = await onboardingApi.getCompanyTypes(initialBusinessType);
        if (cancelled) return;
        setDisplayName(p.displayName ?? "");
        setLogoUrl(p.logoUrl ?? null);
        setBusinessType(initialBusinessType);
        setIndustryTypes(industries);
        setCompanyTypes(companies);
        setIndustryTypeId(p.industryTypeId ?? "");
        setCompanyTypeId(p.companyTypeId ?? "");
        setTradingName(p.tradingName ?? "");
        setStaffSize(p.staffSize ?? "");
        setWebsite(p.website ?? "");
        setRegisteredAddress(p.registeredAddress ?? "");
        setEmailAddress(p.emailAddress ?? "");
        setPhoneNumber(p.phoneNumber ?? "");
        setAddress(p.address ?? "");
        setSupportEmailAddress(p.supportEmailAddress ?? "");
      } catch (e) {
        showError(e, "Could not load profile");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleBusinessTypeChange(value: string) {
    setBusinessType(value);
    try {
      const companies = await onboardingApi.getCompanyTypes(value);
      setCompanyTypes(companies);
      // The previously selected company type may not belong to the new business type.
      setCompanyTypeId((prev) => (companies.some((c) => c.id === prev) ? prev : ""));
    } catch (e) {
      showError(e, "Could not load company types");
    }
  }

  async function saveAndContinue(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editable) return;

    if (logoFile) {
      const message = logoClientErrorMessage(logoFile);
      if (message) {
        setLogoClientError(message);
        toast.error(message);
        return;
      }
    }
    setLogoClientError(null);

    setSaving(true);
    try {
      const body: UpdateOnboardingProfileRequest = {
        displayName,
        businessType,
        industryTypeId,
        companyTypeId,
        emailAddress,
        tradingName,
        staffSize,
        registeredAddress,
        phoneNumber,
        address,
        supportEmailAddress,
        website,
      };
      await onboardingApi.updateProfile(body);
      setFieldErrors({});
      if (logoFile) {
        try {
          const storageKey = await onboardingApi.updateLogo(logoFile);
          setLogoUrl(storageKey);
          clearChosenLogo();
        } catch (err) {
          if (err instanceof AuthApiError && err.kind === "validation" && err.fieldErrors) {
            setFieldErrors(err.fieldErrors);
          }
          if (isForbidden(err)) {
            showError(err, "Could not upload logo");
            return;
          }
          showError(err, "Could not upload logo");
          toast.error("Your profile was saved, but the logo was not.");
          return;
        }
      }
      setFieldErrors({});
      toast.success("Profile saved");
      onCompleteStep({ navigateNext: true });
    } catch (err) {
      if (err instanceof AuthApiError && err.kind === "validation" && err.fieldErrors) {
        setFieldErrors(err.fieldErrors);
        toast.error("Fix the highlighted fields.");
        return;
      }
      showError(err, "Could not save profile");
    } finally {
      setSaving(false);
    }
  }

  const logoImageSrc = logoPreviewUrl ?? storedLogoPreviewUrl;

  return (
    <Card size="sm" className="flex h-full flex-col">
      <CardHeader className="border-b">
        <CardTitle className="text-base">Profile</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        {loading ? (
          <div className="h-[220px] rounded-none bg-muted/20" />
        ) : (
          <form onSubmit={(e) => void saveAndContinue(e)} className="grid gap-4 sm:grid-cols-2">
            <div className="min-w-0 space-y-1.5 sm:col-span-2">
              <Label>Business name</Label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={!editable || saving}
                placeholder="e.g. Acme Retail Ltd"
              />
              {fieldError(fieldErrors, "DisplayName") && (
                <p className="text-xs text-destructive">{fieldError(fieldErrors, "DisplayName")}</p>
              )}
            </div>

            <div className="min-w-0 space-y-1.5 sm:col-span-2">
              <Label>Logo</Label>
              <div className="flex items-start gap-4">
                <BusinessLogoAvatar src={logoImageSrc} name={displayName} />
                {editable ? (
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <p className="text-xs text-muted-foreground">Optional. PNG, JPEG, or WEBP. Maximum 5 MB.</p>
                    <Input
                      ref={logoInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      disabled={!editable || saving}
                      onChange={(e) => selectLogoFile(e.target.files?.[0] ?? null)}
                    />
                    {logoFile ? (
                      <Button type="button" variant="outline" size="sm" onClick={clearChosenLogo} disabled={saving}>
                        Remove
                      </Button>
                    ) : null}
                    {(logoClientError || fieldError(fieldErrors, "Logo")) && (
                      <p className="text-xs text-destructive">{logoClientError ?? fieldError(fieldErrors, "Logo")}</p>
                    )}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="min-w-0 space-y-1.5 sm:col-span-2">
              <Label>Business type</Label>
              <Select
                value={businessType}
                onValueChange={(v) => void handleBusinessTypeChange(v)}
                disabled={!editable || saving}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BUSINESS_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-0 space-y-1.5">
              <Label>Industry</Label>
              <Select value={industryTypeId} onValueChange={setIndustryTypeId} disabled={!editable || saving}>
                <SelectTrigger className="w-full">
                  <SelectValue className="truncate" placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  {industryTypes.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldError(fieldErrors, "IndustryTypeId") && (
                <p className="text-xs text-destructive">{fieldError(fieldErrors, "IndustryTypeId")}</p>
              )}
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label>Company type</Label>
              <Select value={companyTypeId} onValueChange={setCompanyTypeId} disabled={!editable || saving}>
                <SelectTrigger className="w-full">
                  <SelectValue className="truncate" placeholder="Select company type" />
                </SelectTrigger>
                <SelectContent>
                  {companyTypes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldError(fieldErrors, "CompanyTypeId") && (
                <p className="text-xs text-destructive">{fieldError(fieldErrors, "CompanyTypeId")}</p>
              )}
            </div>

            <div className="min-w-0 space-y-1.5 sm:col-span-2">
              <Label>Trading name</Label>
              <Input
                value={tradingName}
                onChange={(e) => setTradingName(e.target.value)}
                disabled={!editable || saving}
                placeholder="e.g. Acme Store"
              />
              {fieldError(fieldErrors, "TradingName") && (
                <p className="text-xs text-destructive">{fieldError(fieldErrors, "TradingName")}</p>
              )}
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label>Staff size</Label>
              <Select value={staffSize} onValueChange={setStaffSize} disabled={!editable || saving}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select staff size" />
                </SelectTrigger>
                <SelectContent>
                  {STAFF_SIZE_OPTIONS.map((range) => (
                    <SelectItem key={range} value={range}>
                      {range}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldError(fieldErrors, "StaffSize") && (
                <p className="text-xs text-destructive">{fieldError(fieldErrors, "StaffSize")}</p>
              )}
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label>Website</Label>
              <Input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                disabled={!editable || saving}
                placeholder="https://example.com"
              />
              {fieldError(fieldErrors, "Website") && (
                <p className="text-xs text-destructive">{fieldError(fieldErrors, "Website")}</p>
              )}
            </div>
            <div className="min-w-0 space-y-1.5 sm:col-span-2">
              <Label>Registered address</Label>
              <Textarea
                rows={2}
                value={registeredAddress}
                onChange={(e) => setRegisteredAddress(e.target.value)}
                disabled={!editable || saving}
                placeholder="e.g. 12 Admiralty Way, Lekki Phase 1, Lagos"
              />
              {fieldError(fieldErrors, "RegisteredAddress") && (
                <p className="text-xs text-destructive">{fieldError(fieldErrors, "RegisteredAddress")}</p>
              )}
            </div>

            <div className="min-w-0 space-y-1.5">
              <Label>Contact email</Label>
              <Input
                type="email"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                disabled={!editable || saving}
                placeholder="you@example.com"
              />
              {fieldError(fieldErrors, "EmailAddress") && (
                <p className="text-xs text-destructive">{fieldError(fieldErrors, "EmailAddress")}</p>
              )}
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label>Contact phone</Label>
              <Input
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={!editable || saving}
                placeholder="e.g. 08012345678"
              />
              {fieldError(fieldErrors, "PhoneNumber") && (
                <p className="text-xs text-destructive">{fieldError(fieldErrors, "PhoneNumber")}</p>
              )}
            </div>
            <div className="min-w-0 space-y-1.5 sm:col-span-2">
              <Label>Business address</Label>
              <Textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                disabled={!editable || saving}
                placeholder="e.g. 12 Admiralty Way, Lekki Phase 1, Lagos"
              />
              {fieldError(fieldErrors, "Address") && (
                <p className="text-xs text-destructive">{fieldError(fieldErrors, "Address")}</p>
              )}
            </div>
            <div className="min-w-0 space-y-1.5 sm:col-span-2">
              <Label>Support email</Label>
              <Input
                type="email"
                value={supportEmailAddress}
                onChange={(e) => setSupportEmailAddress(e.target.value)}
                disabled={!editable || saving}
                placeholder="support@example.com"
              />
              {fieldError(fieldErrors, "SupportEmailAddress") && (
                <p className="text-xs text-destructive">{fieldError(fieldErrors, "SupportEmailAddress")}</p>
              )}
            </div>

            <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3">
              <Button type="button" variant="outline" onClick={onPrevious} disabled={!editable || saving || !canGoPrevious}>
                <ArrowLeftIcon data-icon="inline-start" /> Previous
              </Button>
              <Button type="submit" disabled={!editable || saving}>
                {saving ? "Saving..." : "Save and continue"}
                <ArrowRightIcon data-icon="inline-end" />
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

function DocumentsSection({
  editable,
  canGoPrevious,
  onPrevious,
  onCompleteStep,
}: {
  editable: boolean;
} & StepNavProps) {
  const [loading, setLoading] = useState(true);
  const [busyDocumentTypeId, setBusyDocumentTypeId] = useState<string | null>(null);
  const [requiredDocuments, setRequiredDocuments] = useState<RequiredDocumentDto[]>([]);
  const [documents, setDocuments] = useState<OnboardingDocumentDto[]>([]);
  const [selectedFile, setSelectedFile] = useState<Record<string, File | null>>({});

  async function refresh() {
    setLoading(true);
    try {
      const [reqs, docs] = await Promise.all([onboardingApi.getRequirements(), onboardingApi.getDocuments()]);
      setRequiredDocuments(reqs.requiredDocuments);
      setDocuments(docs);
    } catch (err) {
      showError(err, "Could not load requirements");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [reqs, docs] = await Promise.all([onboardingApi.getRequirements(), onboardingApi.getDocuments()]);
        if (cancelled) return;
        setRequiredDocuments(reqs.requiredDocuments);
        setDocuments(docs);
      } catch (err) {
        if (cancelled) return;
        showError(err, "Could not load requirements");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function uploadedDocumentFor(documentTypeId: string): OnboardingDocumentDto | null {
    return documents.find((d) => d.documentTypeId === documentTypeId) ?? null;
  }

  async function upload(documentTypeId: string) {
    const file = selectedFile[documentTypeId];
    if (!file) {
      toast.error("Choose a file");
      return;
    }
    setBusyDocumentTypeId(documentTypeId);
    try {
      await onboardingApi.uploadDocument({ documentTypeId, file });
      toast.success("Uploaded");
      setSelectedFile((p) => ({ ...p, [documentTypeId]: null }));
      await refresh();
      onCompleteStep();
    } catch (err) {
      showError(err, "Upload failed");
    } finally {
      setBusyDocumentTypeId(null);
    }
  }

  const busy = busyDocumentTypeId !== null;

  return (
    <Card size="sm" className="flex h-full flex-col">
      <CardHeader className="border-b">
        <CardTitle className="text-base">Documents</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        {loading ? (
          <div className="h-[220px] rounded-none bg-muted/20" />
        ) : (
          <>
            {requiredDocuments.map((r) => {
              const uploaded = uploadedDocumentFor(r.documentTypeId);
              const rowBusy = busyDocumentTypeId === r.documentTypeId;
              return (
                <div key={r.documentTypeId} className="rounded-none border border-border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">{r.name}</div>
                      {r.category ? <div className="mt-0.5 text-xs text-muted-foreground">{r.category}</div> : null}
                    </div>
                    <div
                      className={cn(
                        "rounded-none border px-2 py-0.5 text-[10px] font-semibold",
                        uploaded
                          ? "border-success/40 bg-success/10 text-success"
                          : "border-border bg-muted text-muted-foreground",
                      )}
                    >
                      {uploaded ? "Uploaded" : "Missing"}
                    </div>
                  </div>

                  {uploaded ? (
                    <div className="mt-3 text-xs text-muted-foreground">
                      {uploaded.documentName} · uploaded {new Date(uploaded.uploadedAt).toLocaleString()}
                    </div>
                  ) : null}

                  <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                    <Input
                      type="file"
                      disabled={!editable || busy}
                      onChange={(e) => {
                        const f = e.target.files?.[0] ?? null;
                        setSelectedFile((p) => ({ ...p, [r.documentTypeId]: f }));
                      }}
                    />

                    <Button type="button" onClick={() => void upload(r.documentTypeId)} disabled={!editable || busy}>
                      {rowBusy ? "Uploading..." : uploaded ? "Replace" : "Upload"}
                    </Button>
                  </div>
                </div>
              );
            })}

            {documents.length > 0 && (
              <div className="rounded-none border border-border">
                <div className="border-b px-4 py-3 text-sm font-semibold">Recent uploads</div>
                <ul className="divide-y">
                  {documents.slice(0, 10).map((d) => (
                    <li key={d.id} className="px-4 py-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{d.documentName}</div>
                          <div className="truncate text-xs text-muted-foreground">{d.contentType}</div>
                        </div>
                        <div className="text-right text-[11px] text-muted-foreground">
                          {new Date(d.uploadedAt).toLocaleString()}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <Button type="button" variant="outline" onClick={onPrevious} disabled={!editable || busy || loading || !canGoPrevious}>
                <ArrowLeftIcon data-icon="inline-start" /> Previous
              </Button>
              <Button
                type="button"
                onClick={() => onCompleteStep({ navigateNext: true })}
                disabled={!editable || busy || loading}
              >
                Continue
                <ArrowRightIcon data-icon="inline-end" />
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

const EMPTY_OWNER_FORM = {
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  nationality: "",
  idType: "",
  idNumber: "",
  address: "",
  bvn: "",
  idDocumentTypeId: "",
};

function OwnersSection({ editable, canGoPrevious, onPrevious, onCompleteStep }: StepNavProps & { editable: boolean }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<OnboardingOwnerDto[]>([]);
  const [idDocumentTypes, setIdDocumentTypes] = useState<DocumentTypeLookupItemDto[]>([]);
  const [minimumOwnerCount, setMinimumOwnerCount] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<OnboardingOwnerDto | null>(null);
  const [form, setForm] = useState(EMPTY_OWNER_FORM);
  const [idDocument, setIdDocument] = useState<File | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [owners, docTypes, requirements] = await Promise.all([
          onboardingApi.getOwners(),
          onboardingApi.getDocumentTypes("ID"),
          onboardingApi.getRequirements(),
        ]);
        if (cancelled) return;
        setItems(owners);
        setIdDocumentTypes(docTypes);
        setMinimumOwnerCount(requirements.minimumOwnerCount);
      } catch (e) {
        showError(e, "Could not load owners");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function startEdit(owner?: OnboardingOwnerDto) {
    setEditingId(owner?.id ?? null);
    setIdDocument(null);
    setForm(
      owner
        ? {
            firstName: owner.firstName,
            lastName: owner.lastName,
            dateOfBirth: owner.dateOfBirth,
            nationality: owner.nationality,
            idType: owner.idType,
            idNumber: owner.idNumber,
            address: owner.address,
            bvn: owner.bvn,
            idDocumentTypeId: "",
          }
        : EMPTY_OWNER_FORM,
    );
  }

  async function saveOwner(navigateNext: boolean) {
    if (!editable) return;
    setSaving(true);
    try {
      let saved: OnboardingOwnerDto;
      if (editingId) {
        const body: UpdateOwnerRequest = {
          ...form,
          idDocumentTypeId: idDocument ? form.idDocumentTypeId : null,
          idDocument,
        };
        saved = await onboardingApi.updateOwner(editingId, body);
      } else {
        if (!idDocument) {
          toast.error("Upload an ID document");
          setSaving(false);
          return;
        }
        const body: AddOwnerRequest = { ...form, idDocument };
        saved = await onboardingApi.addOwner(body);
      }
      setItems((prev) => {
        const idx = prev.findIndex((p) => p.id === saved.id);
        if (idx === -1) return [saved, ...prev];
        return prev.map((p) => (p.id === saved.id ? saved : p));
      });
      toast.success("Owner saved");
      startEdit(undefined);
      if (navigateNext) onCompleteStep({ navigateNext: true });
    } catch (err) {
      showError(err, "Could not save owner");
    } finally {
      setSaving(false);
    }
  }

  async function saveOnly(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editable) return;
    await saveOwner(false);
  }

  async function onDeleteConfirmed() {
    const owner = confirmDelete;
    if (!owner) return;
    setSaving(true);
    try {
      await onboardingApi.deleteOwner(owner.id);
      setItems((prev) => prev.filter((p) => p.id !== owner.id));
      toast.success("Owner removed");
    } catch (err) {
      showError(err, "Could not delete owner");
    } finally {
      setSaving(false);
      setConfirmDelete(null);
    }
  }

  const ownerForm = (
    <form onSubmit={(e) => void saveOnly(e)} className="grid gap-4 sm:grid-cols-2">
      <div className="min-w-0 space-y-1.5">
        <Label>First name</Label>
        <Input
          value={form.firstName}
          onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
          disabled={!editable || saving}
          placeholder="e.g. Ada"
          required
        />
      </div>
      <div className="min-w-0 space-y-1.5">
        <Label>Last name</Label>
        <Input
          value={form.lastName}
          onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
          disabled={!editable || saving}
          placeholder="e.g. Okafor"
          required
        />
      </div>
      <div className="min-w-0 space-y-1.5">
        <Label>Date of birth</Label>
        <Input
          type="date"
          value={form.dateOfBirth}
          onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
          disabled={!editable || saving}
          required
        />
      </div>
      <div className="min-w-0 space-y-1.5">
        <Label>Nationality</Label>
        <Input
          value={form.nationality}
          onChange={(e) => setForm((f) => ({ ...f, nationality: e.target.value }))}
          disabled={!editable || saving}
          placeholder="NG"
          required
        />
      </div>
      <div className="min-w-0 space-y-1.5">
        <Label>Identity type</Label>
        <Select
          value={form.idType}
          onValueChange={(v) => setForm((f) => ({ ...f, idType: v }))}
          disabled={!editable || saving}
        >
          <SelectTrigger className="w-full">
            <SelectValue className="truncate" placeholder="Select identity type" />
          </SelectTrigger>
          <SelectContent>
            {idDocumentTypes.map((t) => (
              <SelectItem key={t.id} value={t.name}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="min-w-0 space-y-1.5">
        <Label>Identity number</Label>
        <Input
          value={form.idNumber}
          onChange={(e) => setForm((f) => ({ ...f, idNumber: e.target.value }))}
          disabled={!editable || saving}
          placeholder="e.g. 12345678901"
          required
        />
      </div>
      <div className="min-w-0 space-y-1.5">
        <Label>BVN</Label>
        <Input
          value={form.bvn}
          onChange={(e) => setForm((f) => ({ ...f, bvn: e.target.value.replace(/\D/g, "").slice(0, 11) }))}
          disabled={!editable || saving}
          placeholder="11-digit BVN"
          required
        />
      </div>
      <div className="min-w-0 space-y-1.5 sm:col-span-2">
        <Label>Address</Label>
        <Textarea
          rows={2}
          value={form.address}
          onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
          disabled={!editable || saving}
          placeholder="e.g. 12 Admiralty Way, Lekki Phase 1, Lagos"
          required
        />
      </div>

      <div className="min-w-0 space-y-1.5">
        <Label>ID document type</Label>
        <Select
          value={form.idDocumentTypeId}
          onValueChange={(v) => setForm((f) => ({ ...f, idDocumentTypeId: v }))}
          disabled={!editable || saving}
        >
          <SelectTrigger className="w-full">
            <SelectValue className="truncate" placeholder="Select document type" />
          </SelectTrigger>
          <SelectContent>
            {idDocumentTypes.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="min-w-0 space-y-1.5">
        <Label>{editingId ? "Replace ID document" : "ID document"}</Label>
        <Input
          type="file"
          disabled={!editable || saving}
          onChange={(e) => setIdDocument(e.target.files?.[0] ?? null)}
        />
      </div>

      <div className="sm:col-span-2 flex flex-wrap items-center justify-end gap-2">
        {editingId ? (
          <Button type="button" variant="outline" onClick={() => startEdit(undefined)} disabled={saving}>
            Add new instead
          </Button>
        ) : null}
        <Button type="submit" disabled={!editable || saving}>
          {saving ? "Saving…" : editingId ? "Save changes" : "Add owner"}
        </Button>
      </div>
    </form>
  );

  return (
    <>
      <Card size="sm" className="flex h-full flex-col">
        <CardHeader className="border-b">
          <CardTitle className="text-base">Owners</CardTitle>
          {minimumOwnerCount > 0 ? (
            <CardDescription>
              At least {minimumOwnerCount} owner{minimumOwnerCount === 1 ? "" : "s"} must be on file.
            </CardDescription>
          ) : null}
        </CardHeader>
        <CardContent className="flex-1 space-y-4">
          {loading ? (
            <div className="h-[220px] rounded-none bg-muted/20" />
          ) : (
            <>
              {items.length > 0 && (
                <ul className="divide-y rounded-none border border-border">
                  {items.map((o) => (
                    <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                      <div>
                        <div className="font-semibold">
                          {o.firstName} {o.lastName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {o.idType} · {o.idNumber}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="xs" variant="outline" onClick={() => startEdit(o)} disabled={!editable || saving}>
                          Edit
                        </Button>
                        <Button
                          size="xs"
                          variant="destructive"
                          onClick={() => setConfirmDelete(o)}
                          disabled={!editable || saving}
                        >
                          Remove
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <div className="rounded-none border border-border">
                <div className="border-b px-4 py-3 text-sm font-semibold">
                  {editingId ? "Edit owner" : "Add owner"}
                </div>
                <div className="p-4">{ownerForm}</div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                <Button type="button" variant="outline" onClick={onPrevious} disabled={!editable || saving || !canGoPrevious}>
                  <ArrowLeftIcon data-icon="inline-start" /> Previous
                </Button>
                <Button
                  type="button"
                  onClick={() => onCompleteStep({ navigateNext: true })}
                  disabled={!editable || saving || items.length === 0}
                >
                  Continue
                  <ArrowRightIcon data-icon="inline-end" />
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(v) => !v && setConfirmDelete(null)}
        title="Remove owner?"
        description="This action cannot be undone."
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={() => void onDeleteConfirmed()}
      />
    </>
  );
}

function pairKey(bank: string, acct: string) {
  return `${bank}|${acct}`;
}

function isEligible(bank: string, acct: string) {
  return bank !== "" && /^\d{10}$/.test(acct) && banks.some((b) => b.code === bank);
}

function SettlementSection({ editable, canGoPrevious, onPrevious, onCompleteStep }: StepNavProps & { editable: boolean }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settlement, setSettlement] = useState<OnboardingSettlementAccountDto | null>(null);

  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifiedKey, setVerifiedKey] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const verifySeq = useRef(0);

  const canSave =
    editable && !saving && !verifying && !!accountName && verifiedKey === pairKey(bankCode, accountNumber);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const s = await onboardingApi.getSettlementAccount();
        if (cancelled) return;
        setSettlement(s);
      } catch (e) {
        showError(e, "Could not load settlement account");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      verifySeq.current += 1;
    };
  }, []);

  useEffect(() => {
    if (editable) return;
    verifySeq.current += 1;
    const timer = window.setTimeout(() => {
      setVerifying(false);
      setAccountName("");
      setVerifiedKey(null);
      setVerifyError(null);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [editable]);

  async function runVerify(bank: string, acct: string) {
    const seq = ++verifySeq.current;
    setVerifying(true);
    try {
      const result = await bankVerificationApi.verifyBankAccount({ bankCode: bank, accountNumber: acct });
      if (seq !== verifySeq.current) return;
      const name = typeof result?.accountName === "string" ? result.accountName.trim() : "";
      if (!name) {
        setAccountName("");
        setVerifiedKey(null);
        setVerifyError("Could not verify account name");
        return;
      }
      setAccountName(name);
      setVerifiedKey(pairKey(bank, acct));
      setVerifyError(null);
    } catch (err) {
      if (seq !== verifySeq.current) return;
      setAccountName("");
      setVerifiedKey(null);
      setVerifyError(err instanceof Error ? err.message : "Could not verify account");
      showError(err, "Could not verify account");
    } finally {
      if (seq === verifySeq.current) setVerifying(false);
    }
  }

  function applyPair(nextBank: string, nextAcct: string) {
    if (nextBank === bankCode && nextAcct === accountNumber) return;
    verifySeq.current += 1;
    setAccountName("");
    setVerifiedKey(null);
    setVerifyError(null);
    setVerifying(false);
    setBankCode(nextBank);
    setAccountNumber(nextAcct);
    if (!editable || saving || !isEligible(nextBank, nextAcct)) return;
    void runVerify(nextBank, nextAcct);
  }

  async function saveAndContinue(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editable) return;
    const bank = banks.find((b) => b.code === bankCode);
    if (!bank) {
      toast.error("Select a bank");
      return;
    }
    if (!canSave) return;
    if (verifiedKey !== pairKey(bankCode, accountNumber)) return;
    setSaving(true);
    try {
      const created = await onboardingApi.addSettlementAccount({
        bankCode: bank.code,
        bankName: bank.name,
        accountNumber,
        accountName,
      });
      setSettlement(created);
      toast.success("Settlement account saved");
      onCompleteStep({ navigateNext: true });
    } catch (err) {
      showError(err, "Could not save settlement account");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card size="sm" className="flex h-full flex-col">
      <CardHeader className="border-b">
        <CardTitle className="text-base">Settlement account</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        {loading ? (
          <div className="h-[220px] rounded-none bg-muted/20" />
        ) : settlement ? (
          <div className="flex h-full flex-col justify-between gap-4">
            <div className="space-y-4">
              <div className="rounded-none border border-border bg-muted/25 px-4 py-4">
                <div className="text-sm font-semibold">{settlement.accountName}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {settlement.bankName} · {settlement.accountNumber}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                A settlement account is already on file. Contact support if it needs to change.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <Button type="button" variant="outline" onClick={onPrevious} disabled={!canGoPrevious}>
                <ArrowLeftIcon data-icon="inline-start" /> Previous
              </Button>
              <Button type="button" onClick={() => onCompleteStep({ navigateNext: true })}>
                Continue
                <ArrowRightIcon data-icon="inline-end" />
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={(e) => void saveAndContinue(e)} className="flex h-full flex-col justify-between gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="min-w-0 space-y-1.5">
                <Label>Bank</Label>
                <Select value={bankCode} onValueChange={(value) => applyPair(value, accountNumber)} disabled={!editable || saving}>
                  <SelectTrigger className="w-full">
                    <SelectValue className="truncate" placeholder="Select bank" />
                  </SelectTrigger>
                  <SelectContent>
                    {banks.map((b) => (
                      <SelectItem key={b.code} value={b.code}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-0 space-y-1.5">
                <Label>Account number</Label>
                <Input
                  inputMode="numeric"
                  value={accountNumber}
                  onChange={(e) => applyPair(bankCode, e.target.value.replace(/\D/g, "").slice(0, 10))}
                  disabled={!editable || saving}
                  placeholder="10-digit account number"
                />
              </div>
              <div className="min-w-0 space-y-1.5 sm:col-span-2">
                <Label>Account name</Label>
                <div className="relative">
                  <Input
                    value={accountName}
                    readOnly
                    disabled={!editable || saving}
                    placeholder={
                      verifying
                        ? "Verifying account…"
                        : "Filled automatically once you enter your 10-digit account number"
                    }
                    className={cn("bg-muted/40 dark:bg-muted/40", verifying && "pr-8")}
                  />
                  {verifying ? (
                    <Spinner className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground" />
                  ) : null}
                </div>
                <div aria-live="polite" className="text-xs">
                  {verifyError ? (
                    <p className="text-destructive">
                      {verifyError}
                      {verifyError.endsWith(".") ? " " : ". "}
                      Change the bank or account number to try again.
                    </p>
                  ) : accountName && verifiedKey === pairKey(bankCode, accountNumber) ? (
                    <p className="text-muted-foreground">Verified</p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button type="button" variant="outline" onClick={onPrevious} disabled={!editable || saving || !canGoPrevious}>
                <ArrowLeftIcon data-icon="inline-start" /> Previous
              </Button>
              <Button type="submit" disabled={!canSave}>
                {saving ? "Saving..." : "Save and continue"}
                <ArrowRightIcon data-icon="inline-end" />
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

function ReviewSection({
  editable,
  canGoPrevious,
  onPrevious,
  onSubmitted,
  onNavigateToSection,
}: {
  editable: boolean;
  onSubmitted: () => void | Promise<void>;
  onNavigateToSection?: (tab: string) => void;
} & Pick<StepNavProps, "canGoPrevious" | "onPrevious">) {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  /** When true, closing the success dialog should send the user to the dashboard. */
  const pendingDashboardRedirect = useRef(false);

  function goToDashboard() {
    pendingDashboardRedirect.current = false;
    setSuccessOpen(false);
    navigate("/dashboard", { replace: true });
  }

  async function submit() {
    if (!editable) return;
    setSubmitting(true);
    try {
      await onboardingApi.submitOnboarding();
      await onSubmitted();
      pendingDashboardRedirect.current = true;
      setSuccessOpen(true);
    } catch (err) {
      if (isForbidden(err)) {
        showError(err, "Could not submit onboarding");
        return;
      }
      if (err instanceof AuthApiError) {
        const tab = submitErrorWizardTab(err);
        const message =
          (err.kind === "validation" ? firstValidationMessage(err.fieldErrors, Object.keys(err.fieldErrors ?? {})[0] ?? "") : undefined) ??
          err.message;
        toast.error(message);
        if (tab) onNavigateToSection?.(tab);
        return;
      }
      showError(err, "Could not submit onboarding");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Card size="sm" className="flex h-full flex-col">
        <CardHeader className="border-b">
          <CardTitle className="text-base">Review & submit</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Make sure your profile, documents, owners, and settlement account are all filled in before submitting.
          </p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button type="button" variant="outline" onClick={onPrevious} disabled={!canGoPrevious}>
              <ArrowLeftIcon data-icon="inline-start" /> Previous
            </Button>
            <Button onClick={() => void submit()} disabled={!editable || submitting}>
              {submitting ? "Submitting..." : "Submit for review"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={successOpen}
        onOpenChange={(open) => {
          setSuccessOpen(open);
          if (!open && pendingDashboardRedirect.current) {
            pendingDashboardRedirect.current = false;
            navigate("/dashboard", { replace: true });
          }
        }}
      >
        <DialogContent showCloseButton className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <div className="mx-auto mb-2 grid size-12 place-items-center rounded-full border border-success/40 bg-success/10 text-success">
              <CheckCircle2Icon className="size-7" aria-hidden />
            </div>
            <DialogTitle className="text-center">Application submitted</DialogTitle>
            <DialogDescription className="text-center">
              We have received your application. Our team will review it and may move it into formal review. We will
              notify you by email if we need more information or when there is an update. You can go to your dashboard
              anytime.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button className="w-full sm:w-auto" onClick={goToDashboard}>
              Go to dashboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
