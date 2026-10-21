import { create } from "zustand";
import type { BankAccount } from "@/types";
import type { BankAccountDto } from "@/lib/api/bankAccountsApi";
import {
  createBankAccount,
  deleteBankAccount,
  listBankAccounts,
  setBankAccountPrimary,
} from "@/lib/api/bankAccountsApi";

interface State {
  items: BankAccount[];
  loading: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  add: (bankCode: string, bankName: string, accountNumber: string) => Promise<BankAccount>;
  remove: (id: string) => Promise<void>;
  setPrimary: (id: string) => Promise<void>;
}

function mapDto(dto: BankAccountDto): BankAccount {
  return {
    id: dto.id,
    bankName: dto.bankName,
    bankCode: dto.bankCode,
    accountNumber: dto.accountNumber,
    accountName: dto.accountName,
    isPrimary: dto.isPrimary,
    addedAt: dto.createdAtUtc,
  };
}

export const useBankAccountsStore = create<State>((set, get) => ({
  items: [],
  loading: false,
  error: null,

  hydrate: async () => {
    set({ loading: true, error: null });
    try {
      const dtos = await listBankAccounts();
      set({ items: dtos.map(mapDto), loading: false });
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : "Failed to load bank accounts" });
    }
  },

  add: async (bankCode, bankName, accountNumber) => {
    set({ loading: true, error: null });
    try {
      const dto = await createBankAccount({ bankCode, bankName, accountNumber });
      const item = mapDto(dto);
      set({ items: [item, ...get().items], loading: false });
      return item;
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : "Failed to add bank account" });
      throw e;
    }
  },

  remove: async (id) => {
    set({ loading: true, error: null });
    try {
      await deleteBankAccount(id);
      set({ items: get().items.filter((b) => b.id !== id), loading: false });
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : "Failed to remove bank account" });
      throw e;
    }
  },

  setPrimary: async (id) => {
    set({ loading: true, error: null });
    try {
      const dto = await setBankAccountPrimary(id);
      const updated = mapDto(dto);
      set({
        items: get().items.map((b) => ({ ...b, isPrimary: b.id === updated.id ? true : false })),
        loading: false,
      });
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : "Failed to set primary account" });
      throw e;
    }
  },
}));
