import type { InformationBank } from "@reactive-resume/schema/resume/information-bank";
import { ORPCError } from "@orpc/client";
import { produce } from "immer";
import { create } from "zustand/react";
import { client } from "@/libs/orpc/client";

// Fork feature: the Information Bank page's draft. The whole bank is saved once typing pauses, like the
// letter editor (features/letters/store.ts).

/** `conflict`: the bank changed somewhere else, so editing stops until it's reloaded. */
type BankSaveStatus = "saved" | "saving" | "error" | "conflict";

const SAVE_DELAY_MS = 800;

type BankStore = {
	bank: InformationBank | null;
	/** Whose bank this is. The store outlives the page, so a different account must never inherit it. */
	owner: string | null;
	/** The revision the server last confirmed; a save names it so newer work elsewhere is never overwritten. */
	revision: number;
	/** Whether there are edits no save has taken yet. */
	dirty: boolean;
	status: BankSaveStatus;
	/** Counts edits refused after a conflict, so the page can say why nothing is happening. */
	blocked: number;
	load: (bank: InformationBank, revision: number, owner: string) => void;
	/** Changes the bank with an immer recipe (mutate the draft, or return a whole new bank). Ignored after a conflict. */
	edit: (recipe: (draft: InformationBank) => InformationBank | void) => void;
	/** Saves everything typed so far. False on failure; the edits remain for a retry. */
	flush: () => Promise<boolean>;
	reset: () => void;
};

let timer: ReturnType<typeof setTimeout> | undefined;
let inflight: Promise<void> | null = null;
/** Raised by load and reset, so a save that answers after either is ignored. */
let visit = 0;

export const useBankStore = create<BankStore>()((set, get) => ({
	bank: null,
	owner: null,
	revision: 0,
	dirty: false,
	status: "saved",
	blocked: 0,

	load: (bank, revision, owner) => {
		clearTimeout(timer);
		visit += 1;
		set({ bank, owner, revision, dirty: false, status: "saved" });
	},

	edit: (recipe) => {
		const { bank, status } = get();
		if (!bank) return;
		if (status === "conflict") return set((state) => ({ blocked: state.blocked + 1 }));
		set({ bank: produce(bank, recipe), dirty: true, status: "saving" });
		clearTimeout(timer);
		timer = setTimeout(() => void get().flush(), SAVE_DELAY_MS);
	},

	flush: async () => {
		const started = visit;
		clearTimeout(timer);
		if (inflight) await inflight;
		if (visit !== started) return false;

		const { bank, revision, dirty, status } = get();
		if (!bank || !dirty || status === "conflict") return status === "saved";

		set({ dirty: false, status: "saving" });
		inflight = (async () => {
			try {
				const saved = await client.copilot.bank.update({ data: bank, expectedRevision: revision });
				if (visit !== started) return;
				// Anything typed while the save was on its way is still dirty and goes out next.
				set((state) => ({ revision: saved.revision, status: state.dirty ? "saving" : "saved" }));
			} catch (error) {
				if (visit !== started) return;
				const conflict = error instanceof ORPCError && error.code === "CONFLICT";
				set({ dirty: true, status: conflict ? "conflict" : "error" });
			} finally {
				inflight = null;
			}
		})();
		await inflight;

		if (visit !== started) return false;
		if (get().status === "saving" && get().dirty) return get().flush();
		return get().status === "saved";
	},

	reset: () => {
		clearTimeout(timer);
		visit += 1;
		set({ bank: null, owner: null, revision: 0, dirty: false, status: "saved" });
	},
}));
