import { CreditCardIcon, ArrowRightLeftIcon, SmartphoneIcon, QrCodeIcon, BuildingIcon } from "lucide-react";
import type { Channel } from "@/types";
import { cn } from "@/lib/utils";

const map: Record<Channel, { Icon: typeof CreditCardIcon; label: string }> = {
  card: { Icon: CreditCardIcon, label: "Card" },
  transfer: { Icon: ArrowRightLeftIcon, label: "Transfer" },
  ussd: { Icon: SmartphoneIcon, label: "USSD" },
  qr: { Icon: QrCodeIcon, label: "QR" },
  bank: { Icon: BuildingIcon, label: "Bank" },
};

export function ChannelIcon({ channel, className, withLabel = true }: { channel: Channel; className?: string; withLabel?: boolean }) {
  const { Icon, label } = map[channel];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm", className)}>
      <Icon className="size-3.5 text-muted-foreground" />
      {withLabel && <span>{label}</span>}
    </span>
  );
}
