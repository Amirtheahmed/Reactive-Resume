import { beforeEach, expect, it, vi } from "vitest";
import { ORPCError } from "@orpc/client";
import { emptyInformationBank } from "@reactive-resume/schema/resume/information-bank";

const mocks = vi.hoisted(() => ({ update: vi.fn() }));
vi.mock("@/libs/orpc/client", () => ({ client: { copilot: { bank: { update: mocks.update } } } }));

const { useBankStore } = await import("./bank-store");

const store = () => useBankStore.getState();
const rename = (name: string) =>
	store().edit((draft) => {
		draft.basics.name = name;
	});

beforeEach(() => {
	mocks.update.mockReset();
	store().load(emptyInformationBank, 3, "user");
});

it("sends what was typed during a save next, against the revision that save returned", async () => {
	let finish: (value: { revision: number }) => void = () => {};
	mocks.update.mockReturnValueOnce(new Promise((resolve) => (finish = resolve)));
	mocks.update.mockResolvedValueOnce({ revision: 5 });

	rename("First");
	const saving = store().flush();
	await Promise.resolve();
	rename("Second");
	finish({ revision: 4 });

	expect(await saving).toBe(true);
	expect(mocks.update).toHaveBeenCalledTimes(2);
	expect(mocks.update.mock.calls[0]?.[0]).toMatchObject({ expectedRevision: 3, data: { basics: { name: "First" } } });
	expect(mocks.update.mock.calls[1]?.[0]).toMatchObject({ expectedRevision: 4, data: { basics: { name: "Second" } } });
	expect(store()).toMatchObject({ revision: 5, status: "saved", dirty: false });
});

it("drops a bank, unsaved edits and all, once someone else is signed in", async () => {
	rename("Theirs");
	store().claim("someone-else");

	expect(store()).toMatchObject({ bank: null, owner: null, dirty: false });
	expect(await store().flush()).toBe(true);
	expect(mocks.update).not.toHaveBeenCalled();
});

it("stops editing and saving after a conflict, keeping what was typed", async () => {
	mocks.update.mockRejectedValueOnce(new ORPCError("CONFLICT"));

	rename("Mine");
	expect(await store().flush()).toBe(false);
	rename("Later");

	expect(store()).toMatchObject({ status: "conflict", dirty: true, revision: 3 });
	expect(store().bank?.basics.name).toBe("Mine");
	expect(await store().flush()).toBe(false);
	expect(mocks.update).toHaveBeenCalledTimes(1);
});
