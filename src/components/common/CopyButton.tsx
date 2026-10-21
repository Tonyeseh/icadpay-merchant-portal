import { useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function CopyButton({ value, label, className, size = "icon-sm" }: {
  value: string;
  label?: string;
  className?: string;
  size?: "icon-xs" | "icon-sm" | "icon" | "xs" | "sm";
}) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="ghost"
      size={size}
      className={cn(className)}
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(value).then(() => {
          setCopied(true);
          toast.success(label ? `${label} copied` : "Copied to clipboard");
          setTimeout(() => setCopied(false), 1400);
        });
      }}
    >
      {copied ? <CheckIcon className="text-success" /> : <CopyIcon />}
      <span className="sr-only">Copy</span>
    </Button>
  );
}
