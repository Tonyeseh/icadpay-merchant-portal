import { type FormEvent, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CopyButton } from "@/components/common/CopyButton";
import { useTeamStore } from "@/store/useTeamStore";
import { AuthApiError } from "@/types/auth";
import { isForbidden } from "@/lib/auth/permissions";
import { toast } from "sonner";

function showError(err: unknown, fallback = "Something went wrong") {
  if (err instanceof AuthApiError) {
    toast.error(err.message);
    return;
  }
  if (err instanceof Error) {
    toast.error(err.message || fallback);
    return;
  }
  toast.error(fallback);
}

export function InviteMemberDialog({
  open,
  onOpenChange,
  roles,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roles: { id: string; name: string }[];
}) {
  const invite = useTeamStore((s) => s.invite);
  const [email, setEmail] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const resolvedRoleId = roles.some((r) => r.id === selectedRoleId) ? selectedRoleId : (roles[0]?.id ?? "");
  if (open && resolvedRoleId !== selectedRoleId) {
    setSelectedRoleId(resolvedRoleId);
  }

  function close() {
    setEmail("");
    setSelectedRoleId(roles[0]?.id ?? "");
    setSubmitting(false);
    onOpenChange(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!resolvedRoleId) {
      toast.error("Select a role before sending an invite");
      return;
    }
    setSubmitting(true);
    try {
      const res = await invite(email, resolvedRoleId);
      toast.success("Invitation created", { description: `${email} can join using the invite link.` });
      toast.message("Invite link", {
        description: (
          <span className="inline-flex items-center gap-2">
            <span className="truncate">{res.inviteUrl}</span>
            <CopyButton value={res.inviteUrl} label="Invite link" size="icon-xs" />
          </span>
        ),
      });
      close();
    } catch (err) {
      if (isForbidden(err)) return;
      showError(err, "Could not invite member");
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Invite member</DialogTitle>
          <DialogDescription>
            They join this merchant with the selected role via an invite link.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="invite-role">Role</Label>
            <Select value={resolvedRoleId} onValueChange={setSelectedRoleId}>
              <SelectTrigger id="invite-role">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" disabled={!resolvedRoleId || submitting}>
              {submitting ? "Sending..." : "Send invite"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
