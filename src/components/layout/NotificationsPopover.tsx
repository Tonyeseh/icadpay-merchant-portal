import { BellIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatRelative } from "@/lib/format";

const notifications = [
  {
    id: "n1",
    title: "Payout settled",
    body: "â‚¦1,240,500.00 paid to GTBank Â·Â·Â·Â·6789.",
    time: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    unread: true,
  },
  {
    id: "n2",
    title: "New high-value transaction",
    body: "Adebayo Lawal paid â‚¦185,000.00 via card.",
    time: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
    unread: true,
  },
  {
    id: "n3",
    title: "Webhook failure",
    body: "https://staging.lagosthreadworks.ng returned 502.",
    time: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    unread: false,
  },
  {
    id: "n4",
    title: "KYC re-verification reminder",
    body: "Director ID upload expires in 14 days.",
    time: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    unread: false,
  },
];

export function NotificationsPopover() {
  const unread = notifications.filter((n) => n.unread).length;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Notifications" className="relative">
          <BellIcon />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 grid size-3.5 place-items-center rounded-full bg-destructive text-[8px] font-bold text-destructive-foreground">
              {unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="text-sm font-semibold">
            Notifications
          </span>
          <span className="text-[10px] text-muted-foreground">
            {unread} unread
          </span>
        </div>
        <ul className="max-h-80 overflow-y-auto">
          {notifications.map((n) => (
            <li key={n.id} className="border-b px-4 py-3 last:border-b-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {n.unread && <span className="size-1.5 rounded-full bg-primary" />}
                    <span className="text-sm font-semibold">{n.title}</span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{n.body}</p>
                </div>
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {formatRelative(n.time)}
                </span>
              </div>
            </li>
          ))}
        </ul>
        <div className="border-t p-2">
          <Button variant="ghost" size="sm" className="w-full">
            View all activity
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
