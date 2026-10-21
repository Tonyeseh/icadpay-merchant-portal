import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/format";

export function BusinessLogoAvatar({ src, name }: { src: string | null; name: string }) {
  return (
    <Avatar className="size-16 rounded-none">
      {src ? <AvatarImage src={src} alt="Business logo" className="rounded-none" /> : null}
      <AvatarFallback className="rounded-none bg-primary text-base font-semibold uppercase text-primary-foreground">
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
