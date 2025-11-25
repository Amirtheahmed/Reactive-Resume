// apps/extension/src/store/information.ts
import type { InformationDto } from "@reactive-resume/dto";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type InformationStore = {
  information: InformationDto | null;
  setInformation: (info: InformationDto | null) => void;
};

const storage = {
  getItem: async (name: string) => {
    const result = await chrome.storage.local.get(name);
    return result[name] ? JSON.stringify(result[name]) : null;
  },
  setItem: async (name: string, value: string) => {
    await chrome.storage.local.set({ [name]: JSON.parse(value) });
  },
  removeItem: async (name: string) => {
    await chrome.storage.local.remove(name);
  },
};

export const useInformationStore = create<InformationStore>()(
  persist(
    (set) => ({
      information: null,
      setInformation: (information) => set({ information }),
    }),
    {
      name: "information-storage",
      storage: createJSONStorage(() => storage),
    },
  ),
);
