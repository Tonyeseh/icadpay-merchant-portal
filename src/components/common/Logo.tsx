import { cn } from "@/lib/utils";

export function Logo({ className, showWord = true }: { className?: string; showWord?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <svg
        width="22"
        height="30"
        viewBox="0 0 22 30"
        fill="none"
        role="img"
        aria-label="iCadPay"
      >
        <defs>
          <linearGradient id="icadpay-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E11D48" />
            <stop offset="38%" stopColor="#B5179E" />
            <stop offset="70%" stopColor="#6D28D9" />
            <stop offset="100%" stopColor="#3050D0" />
          </linearGradient>
        </defs>
        <circle cx="11" cy="4" r="4" fill="url(#icadpay-grad)" />
        <rect x="7.5" y="11" width="7" height="18" rx="2" fill="url(#icadpay-grad)" />
      </svg>

      {showWord && (
        <span className="text-base font-semibold leading-none tracking-tight text-foreground">
          icad<span className="text-primary">pay</span>
        </span>
      )}
    </div>
  );
}
