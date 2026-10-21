import { create } from "zustand";
import type { PaymentLink } from "@/types";
import { paymentLinks as seed } from "@/mock/paymentLinks";

interface State {
  items: PaymentLink[];
  create: (input: Omit<PaymentLink, "id" | "createdAt" | "totalCollected" | "paymentCount" | "active" | "slug"> & { slug?: string }) => PaymentLink;
  toggleActive: (id: string) => void;
  remove: (id: string) => void;
}

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
}

export const usePaymentLinksStore = create<State>((set, get) => ({
  items: seed,
  create: (input) => {
    const id = `pl_${Date.now().toString(36).toUpperCase()}`;
    const link: PaymentLink = {
      id,
      slug: input.slug ?? slugify(input.name) + "-" + Math.random().toString(36).slice(2, 6),
      name: input.name,
      description: input.description,
      amount: input.amount,
      currency: "NGN",
      redirectUrl: input.redirectUrl,
      createdAt: new Date().toISOString(),
      active: true,
      totalCollected: 0,
      paymentCount: 0,
    };
    set({ items: [link, ...get().items] });
    return link;
  },
  toggleActive: (id) =>
    set({
      items: get().items.map((l) => (l.id === id ? { ...l, active: !l.active } : l)),
    }),
  remove: (id) => set({ items: get().items.filter((l) => l.id !== id) }),
}));
