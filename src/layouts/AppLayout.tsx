import { useEffect, useState, useSyncExternalStore } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { OnboardingPromptDialog } from "@/components/onboarding/OnboardingPromptDialog";
import {
  consumeOnboardingPrompt,
  getOnboardingPromptGeneration,
  getOnboardingPromptServerSnapshot,
  promptableOnboardingStatus,
  subscribeOnboardingPrompt,
  type PromptableOnboardingStatus,
} from "@/lib/onboardingPrompt";
import { useAppStore } from "@/store/useAppStore";

export function AppLayout() {
  const generation = useSyncExternalStore(
    subscribeOnboardingPrompt,
    getOnboardingPromptGeneration,
    getOnboardingPromptServerSnapshot,
  );
  const [handledGeneration, setHandledGeneration] = useState(0);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<PromptableOnboardingStatus | null>(null);

  if (generation !== 0 && generation !== handledGeneration) {
    const nextStatus = promptableOnboardingStatus(
      useAppStore.getState().user?.onboardingStatus,
    );
    setHandledGeneration(generation);
    setStatus(nextStatus);
    setOpen(nextStatus != null);
  }

  useEffect(() => {
    consumeOnboardingPrompt(handledGeneration);
  }, [handledGeneration]);

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
      <OnboardingPromptDialog open={open} onOpenChange={setOpen} status={status} />
    </div>
  );
}
