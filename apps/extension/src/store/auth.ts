// apps/extension/src/store/auth.ts
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { OpenAIConfigDto } from "@reactive-resume/dto";

type AuthStore = {
  apiKey: string | null; // This is the Reactive Resume API Key
  setApiKey: (key: string | null) => void;
};

// Custom storage adapter for chrome.storage.local
const storage = {
  getItem: async (name: string): Promise<string | null> => {
    const result = await chrome.storage.local.get(name);
    const val = result[name];

    if (val === undefined) return null;
    if (typeof val === "string") return val;

    try {
      return JSON.stringify(val);
    } catch {
      return String(val);
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await chrome.storage.local.set({ [name]: value });
  },
  removeItem: async (name: string): Promise<void> => {
    await chrome.storage.local.remove(name);
  },
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      apiKey: null,
      setApiKey: (apiKey) => set({ apiKey }),
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => storage),
    },
  ),
);
