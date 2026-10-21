import type { SplitMode, SubaccountDto, UpdateSubaccountRequest } from "@/types/subaccounts";

export interface SubaccountEditForm {
  businessName: string;
  isActive: boolean;
  splitMode: SplitMode;
  /** When mode is Percentage */
  sharePercent: number;
  /** When mode is FixedPlatformAmount, minor units */
  flatAmount: number;
}

/** Builds a PATCH body with only changed fields; handles split mode switches per API rules. */
export function buildSubaccountUpdatePatch(
  initial: SubaccountDto,
  next: SubaccountEditForm,
): UpdateSubaccountRequest {
  const patch: UpdateSubaccountRequest = {};

  if (next.businessName.trim() !== initial.businessName) {
    patch.businessName = next.businessName.trim();
  }
  if (next.isActive !== initial.isActive) {
    patch.isActive = next.isActive;
  }

  const modeChanged = next.splitMode !== initial.splitMode;
  const nextShare = Math.trunc(next.sharePercent);
  const nextFlat = Math.trunc(next.flatAmount);

  if (modeChanged) {
    patch.splitMode = next.splitMode;
    if (next.splitMode === "Percentage") {
      patch.sharePercent = nextShare;
    } else {
      patch.flatAmount = nextFlat;
    }
    return patch;
  }

  if (next.splitMode === "Percentage") {
    if (nextShare !== initial.sharePercent) {
      patch.sharePercent = nextShare;
    }
  } else if (next.splitMode === "FixedPlatformAmount") {
    if (nextFlat !== initial.flatAmount) {
      patch.flatAmount = nextFlat;
    }
  }

  return patch;
}

/** Returns true if the patch object has any keys to send. */
export function isNonEmptyPatch(p: UpdateSubaccountRequest): boolean {
  return Object.keys(p).length > 0;
}
