import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  clearStoredAccessToken,
  getStoredAccessToken,
  setStoredAccessToken,
} from "@/lib/auth/accessToken";
import {
  mapAuthenticationResponseToUser,
  merchantsFromMemberships,
} from "@/lib/auth/mapAuthenticationResponse";
import { switchMerchant as switchMerchantRequest } from "@/lib/auth/merchantAuthApi";
import { decodeAccessTokenPermissions } from "@/lib/auth/permissions";
import { armOnboardingPrompt } from "@/lib/onboardingPrompt";
import type { AuthenticationResponse } from "@/types/auth";
import type { AppMode, Merchant, User } from "@/types";

interface AppState {
  user: User | null;
  merchants: Merchant[];
  activeMerchantId: string | null;
  mode: AppMode;
  sidebarCollapsed: boolean;
  /** In-memory only. Decoded from the access token; never persisted. */
  permissions: string[];

  applyAuthResponse: (response: AuthenticationResponse) => void;
  clearSession: () => void;
  patchUser: (partial: Partial<User>) => void;
  signOut: () => void;
  setMode: (mode: AppMode) => void;
  switchMerchantAccount: (merchantId: string) => Promise<void>;
  setActiveMerchant: (id: string) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      merchants: [],
      activeMerchantId: null,
      mode: "test",
      sidebarCollapsed: false,
      permissions: [],

      applyAuthResponse: (response) => {
        setStoredAccessToken(response.accessToken);
        const user = mapAuthenticationResponseToUser(response);
        const merchants = merchantsFromMemberships(response.myMerchant);
        const activeMerchantId =
          merchants.find((m) => m.id === response.currentMerchantId)?.id ??
          merchants[0]?.id ??
          null;
        const mode = response.accountMode === "Live" ? "live" : "test";
        set({
          user,
          merchants,
          activeMerchantId,
          mode,
          permissions: decodeAccessTokenPermissions(response.accessToken),
        });
      },

      clearSession: () => {
        clearStoredAccessToken();
        set({ user: null, merchants: [], activeMerchantId: null, permissions: [] });
      },

      patchUser: (partial) =>
        set((s) => {
          if (!s.user) return s;
          const user = { ...s.user, ...partial };
          let merchants = s.merchants;
          if (partial.businessName != null && s.activeMerchantId) {
            merchants = s.merchants.map((m) =>
              m.id === s.activeMerchantId ? { ...m, name: partial.businessName! } : m,
            );
          }
          return { user, merchants };
        }),

      signOut: () => get().clearSession(),

      setMode: (mode) => set({ mode }),

      switchMerchantAccount: async (merchantId) => {
        const token = getStoredAccessToken();
        if (!token) {
          get().clearSession();
          return;
        }
        const res = await switchMerchantRequest(token, merchantId);
        get().applyAuthResponse(res);
        armOnboardingPrompt();
      },

      setActiveMerchant: (id) => set({ activeMerchantId: id }),

      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
    }),
    {
      name: "icad-pay-ui",
      partialize: (s) => ({
        mode: s.mode,
        sidebarCollapsed: s.sidebarCollapsed,
      }),
    },
  ),
);
