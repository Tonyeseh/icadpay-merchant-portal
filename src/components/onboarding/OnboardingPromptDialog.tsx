import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PromptableOnboardingStatus } from "@/lib/onboardingPrompt";

const COPY: Record<PromptableOnboardingStatus, { title: string; body: string }> = {
  Draft: {
    title: "Finish your onboarding",
    body: "Your business profile is still a draft. Complete onboarding to finish setting up your account.",
  },
  RequiresAction: {
    title: "Changes requested",
    body: "Your onboarding needs a few changes before it can be approved.",
  },
};

export function OnboardingPromptDialog({
  open,
  onOpenChange,
  status,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: PromptableOnboardingStatus | null;
}) {
  const navigate = useNavigate();
  const copy = status ? COPY[status] : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{copy?.title}</DialogTitle>
          <DialogDescription>{copy?.body}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Do it later
          </Button>
          <Button
            type="button"
            onClick={() => {
              onOpenChange(false);
              navigate("/onboarding");
            }}
          >
            Go to onboarding
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
