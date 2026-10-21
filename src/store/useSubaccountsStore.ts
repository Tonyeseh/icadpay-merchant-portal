import { create } from "zustand";
import type { CreateSubaccountRequest, SubaccountDto, UpdateSubaccountRequest } from "@/types/subaccounts";
import {
  createSubaccount,
  deleteSubaccount,
  listSubaccounts,
  updateSubaccount,
} from "@/lib/api/subaccountsApi";
import { isForbidden } from "@/lib/auth/permissions";

interface State {
  items: SubaccountDto[];
  loading: boolean;
  error: string | null;
  forbidden: boolean;
  hydrate: () => Promise<void>;
  create: (body: CreateSubaccountRequest) => Promise<SubaccountDto>;
  update: (id: string, body: UpdateSubaccountRequest) => Promise<SubaccountDto>;
  remove: (id: string) => Promise<void>;
}

export const useSubaccountsStore = create<State>((set, get) => ({
  items: [],
  loading: false,
  error: null,
  forbidden: false,

  hydrate: async () => {
    set({ loading: true, error: null, forbidden: false });
    try {
      const items = await listSubaccounts();
      set({ items, loading: false, forbidden: false });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : "Failed to load subaccounts",
        forbidden: isForbidden(e),
      });
    }
  },

  create: async (body) => {
    set({ loading: true, error: null, forbidden: false });
    try {
      const created = await createSubaccount(body);
      set({ items: [created, ...get().items], loading: false, forbidden: false });
      return created;
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : "Failed to create subaccount",
        forbidden: isForbidden(e),
      });
      throw e;
    }
  },

  update: async (id, body) => {
    set({ loading: true, error: null, forbidden: false });
    try {
      const updated = await updateSubaccount(id, body);
      set({
        items: get().items.map((s) => (s.id === id ? updated : s)),
        loading: false,
        forbidden: false,
      });
      return updated;
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : "Failed to update subaccount",
        forbidden: isForbidden(e),
      });
      throw e;
    }
  },

  remove: async (id) => {
    set({ loading: true, error: null, forbidden: false });
    try {
      await deleteSubaccount(id);
      set({ items: get().items.filter((s) => s.id !== id), loading: false, forbidden: false });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : "Failed to delete subaccount",
        forbidden: isForbidden(e),
      });
      throw e;
    }
  },
}));
