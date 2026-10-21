import { LockIcon } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";

export function AccessDenied({
  title = "You don't have access",
  description = "Your role does not include permission to view this.",
  className,
}: {
  title?: string;
  description?: string;
  className?: string;
}) {
  return (
    <EmptyState
      icon={<LockIcon className="size-5" />}
      title={title}
      description={description}
      className={className}
    />
  );
}
