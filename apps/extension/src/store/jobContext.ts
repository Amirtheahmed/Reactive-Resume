import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type JobContext = {
  title: string;
  company: string;
  description: string;
  url: string;
};

type JobContextStore = {
  jobContext: JobContext | null;
  setJobContext: (context: JobContext | null) => void;
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

export const useJobContextStore = create<JobContextStore>()(
  persist(
    (set) => ({
      jobContext: null,
      setJobContext: (jobContext) => set({ jobContext }),
    }),
    {
      name: "job-context-storage",
      storage: createJSONStorage(() => storage),
    },
  ),
);
