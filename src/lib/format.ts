import type { SplitMode } from "@/types/subaccounts";

/**
 * Money is stored as kobo (NGN minor units). 1 NGN = 100 kobo.
 * formatNaira(150_000_00) → "₦150,000.00"
 */
export function formatNaira(kobo: number, opts: { compact?: boolean } = {}): string {
  const value = kobo / 100;
  if (opts.compact && value >= 1_000_000) {
    return `₦${(value / 1_000_000).toFixed(2)}M`;
  }
  if (opts.compact && value >= 1_000) {
    return `₦${(value / 1_000).toFixed(1)}K`;
  }
  return `₦${value.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Human-readable summary for a subaccount default split (merchant primary leg). */
export function formatDefaultSplitSummary(input: {
  splitMode: SplitMode;
  sharePercent: number | null;
  flatAmount: number | null;
}): string {
  if (input.splitMode === "Percentage") {
    const p = input.sharePercent ?? 0;
    return `${p}% to platform`;
  }
  if (input.splitMode === "FixedPlatformAmount") {
    const minor = input.flatAmount ?? 0;
    return `${formatNaira(minor)} fixed to platform`;
  }
  return input.splitMode;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${formatDate(iso)} · ${d.toLocaleTimeString("en-NG", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export function formatRelative(iso: string): string {
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}

export function maskKey(value: string, visibleStart = 8, visibleEnd = 4): string {
  if (value.length <= visibleStart + visibleEnd) return value;
  return `${value.slice(0, visibleStart)}${"•".repeat(20)}${value.slice(-visibleEnd)}`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}
