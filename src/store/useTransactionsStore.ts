import { create } from "zustand";
import type { AppMode, Channel, Transaction, TxStatus } from "@/types";
import { listTransactions } from "@/lib/api/transactionsApi";
import { isForbidden } from "@/lib/auth/permissions";

type UiMode = AppMode;

function toApiMode(mode: UiMode): "Test" | "Live" {
  return mode === "live" ? "Live" : "Test";
}

function toApiStatus(status: TxStatus): string {
  // Best-effort mapping to the backend's stored status strings (see docs example: "Completed")
  switch (status) {
    case "success":
      return "Completed";
    case "failed":
      return "Failed";
    case "pending":
      return "Pending";
    case "abandoned":
      return "Abandoned";
  }
}

function toApiChannel(channel: Channel): number | null {
  // Docs: 1=Card, 2=Ussd, 3=BankTransfer
  switch (channel) {
    case "card":
      return 1;
    case "ussd":
      return 2;
    case "transfer":
    case "bank":
      return 3;
    case "qr":
      return null;
  }
}

function fromApiChannel(channel: number): Channel {
  if (channel === 1) return "card";
  if (channel === 2) return "ussd";
  if (channel === 3) return "transfer";
  return "transfer";
}

function fromApiStatus(status: string): TxStatus {
  const s = status.toLowerCase();
  if (s.includes("complete") || s.includes("success") || s.includes("paid")) return "success";
  if (s.includes("fail") || s.includes("error")) return "failed";
  if (s.includes("abandon") || s.includes("cancel")) return "abandoned";
  return "pending";
}

function fromApiMode(mode: string): UiMode {
  return mode.toLowerCase() === "live" ? "live" : "test";
}

interface Filters {
  query: string;
  status: TxStatus | "all";
  channel: Channel | "all";
  page: number;
  pageSize: number;
}

interface State {
  items: Transaction[];
  totalCount: number;
  loading: boolean;
  error: string | null;
  forbidden: boolean;
  filters: Filters;
  fetch: (mode: UiMode) => Promise<void>;
  setFilters: (patch: Partial<Filters>) => void;
}

export const useTransactionsStore = create<State>((set, get) => ({
  items: [],
  totalCount: 0,
  loading: false,
  error: null,
  forbidden: false,
  filters: { query: "", status: "all", channel: "all", page: 1, pageSize: 20 },

  setFilters: (patch) => set({ filters: { ...get().filters, ...patch } }),

  fetch: async (mode) => {
    const { query, status, channel, page, pageSize } = get().filters;
    set({ loading: true, error: null, forbidden: false });
    try {
      const apiChannel = channel === "all" ? null : toApiChannel(channel);
      const apiStatus = status === "all" ? null : toApiStatus(status);

      const res = await listTransactions({
        page,
        pageSize,
        mode: toApiMode(mode),
        channel: apiChannel ?? undefined,
        status: apiStatus ?? undefined,
        search: query || undefined,
      });

      const items: Transaction[] = res.items.map((t) => ({
        id: t.id,
        reference: t.reference,
        amount: t.amountMinor,
        fee: 0,
        currency: "NGN",
        status: fromApiStatus(t.status),
        channel: fromApiChannel(t.channel),
        customerId: "",
        customerEmail: t.customerEmail ?? "",
        customerName: (t.customerEmail ?? "").split("@")[0] || "Customer",
        createdAt: t.createdAtUtc,
        mode: fromApiMode(t.mode),
        description: t.providerCode ?? undefined,
      }));

      set({
        items,
        totalCount: res.totalCount,
        loading: false,
        forbidden: false,
      });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : "Failed to load transactions",
        forbidden: isForbidden(e),
      });
    }
  },
}));

