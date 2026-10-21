import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  success: "bg-success/10 text-success ring-success/20",
  paid: "bg-success/10 text-success ring-success/20",
  active: "bg-success/10 text-success ring-success/20",
  approved: "bg-success/10 text-success ring-success/20",

  failed: "bg-destructive/10 text-destructive ring-destructive/20",
  rejected: "bg-destructive/10 text-destructive ring-destructive/20",
  blacklisted: "bg-destructive/10 text-destructive ring-destructive/20",

  pending: "bg-warning/15 text-warning-foreground ring-warning/30",
  processing: "bg-warning/15 text-warning-foreground ring-warning/30",
  in_review: "bg-warning/15 text-warning-foreground ring-warning/30",
  invited: "bg-warning/15 text-warning-foreground ring-warning/30",

  abandoned: "bg-muted text-muted-foreground ring-border",
  inactive: "bg-muted text-muted-foreground ring-border",
};

const labels: Record<string, string> = {
  in_review: "In review",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const key = status.toLowerCase().replace(/\s+/g, "_");
  const label = labels[key] ?? status.replace(/_/g, " ");
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset capitalize",
        styles[key] ?? "bg-muted text-muted-foreground ring-border",
        className,
      )}
    >
      <span className={cn(
        "size-1.5 rounded-full",
        key === "success" || key === "paid" || key === "active" || key === "approved"
          ? "bg-success"
          : key === "failed" || key === "rejected" || key === "blacklisted"
          ? "bg-destructive"
          : key === "pending" || key === "processing" || key === "in_review" || key === "invited"
          ? "bg-warning"
          : "bg-muted-foreground/40"
      )} />
      {label}
    </span>
  );
}
