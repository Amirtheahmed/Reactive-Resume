import type { Job } from "./api";
import type { StateStorage } from "zustand/middleware";
import { createJSONStorage, persist } from "zustand/middleware";
import { create } from "zustand/react";

// chrome.storage.local survives the side panel closing, and is not readable by web pages.
const chromeStorage: StateStorage = {
	getItem: async (name) => ((await chrome.storage.local.get(name))[name] as string | undefined) ?? null,
	setItem: (name, value) => chrome.storage.local.set({ [name]: value }),
	removeItem: (name) => chrome.storage.local.remove(name),
};

type SessionStore = {
	/** The Reactive Resume API key. */
	apiKey: string | null;
	/** The job posting last analysed, used to tailor documents and answers. */
	job: Job | null;
	setApiKey: (apiKey: string | null) => void;
	setJob: (job: Job | null) => void;
};

export const useSessionStore = create<SessionStore>()(
	persist(
		(set) => ({
			apiKey: null,
			job: null,
			setApiKey: (apiKey) => set({ apiKey }),
			setJob: (job) => set({ job }),
		}),
		{ name: "copilot-session", storage: createJSONStorage(() => chromeStorage) },
	),
);
