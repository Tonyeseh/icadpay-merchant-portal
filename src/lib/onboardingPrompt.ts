export type PromptableOnboardingStatus = "Draft" | "RequiresAction";

type Listener = () => void;

let generation = 0;
let consumedGeneration = 0;
const listeners = new Set<Listener>();

function notify(): void {
  for (const listener of [...listeners]) {
    listener();
  }
}

export function armOnboardingPrompt(): void {
  generation += 1;
  notify();
}

export function subscribeOnboardingPrompt(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Current generation while it is still unconsumed; otherwise 0. */
export function getOnboardingPromptGeneration(): number {
  return generation === consumedGeneration ? 0 : generation;
}

export function getOnboardingPromptServerSnapshot(): number {
  return 0;
}

export function consumeOnboardingPrompt(requested: number): void {
  if (requested === 0) return;
  if (requested !== generation) return;
  if (consumedGeneration === generation) return;
  consumedGeneration = generation;
  notify();
}

export function promptableOnboardingStatus(
  status: string | null | undefined,
): PromptableOnboardingStatus | null {
  const normalized = status?.trim().toLowerCase();
  if (normalized === "draft") return "Draft";
  if (normalized === "requiresaction") return "RequiresAction";
  return null;
}

export function isOnboardingDestination(to: string): boolean {
  const path = to.split(/[?#]/, 1)[0] ?? "";
  const normalized = path.replace(/\/+$/, "");
  return normalized === "/onboarding";
}
