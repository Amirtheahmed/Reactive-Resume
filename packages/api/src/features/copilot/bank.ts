import type { InformationBank } from "@reactive-resume/schema/resume/information-bank";
import { ORPCError } from "@orpc/client";
import { and, eq, sql } from "drizzle-orm";
import z from "zod";
import { db } from "@reactive-resume/db/client";
import { informationBank } from "@reactive-resume/db/schema";
import {
	emptyInformationBank,
	informationBankSchema,
	isEmptyBank,
	parseStoredBank,
	toResumeData,
} from "@reactive-resume/schema/resume/information-bank";
import { protectedProcedure } from "../../context";
import { resumeMutationRateLimit } from "../../middleware/rate-limit";

// Fork feature: the Information Bank is the user's full profile, kept in a table of its own. Tailored
// resumes, cover letters and form answers are generated from it.

/** The user's bank. Before the first save it is empty, at revision 0. */
export async function getBank(userId: string) {
	const [row] = await db.select().from(informationBank).where(eq(informationBank.userId, userId));
	if (!row) return { data: emptyInformationBank, revision: 0, updatedAt: null };
	const { bank, dropped } = parseStoredBank(row.data);
	if (dropped) console.warn(`[information-bank] ${dropped} stored entries no longer fit the schema and were left out.`);
	return { data: bank, revision: row.revision, updatedAt: row.updatedAt };
}

/** Saves the whole bank, unless it changed since the revision the caller last read. */
async function saveBank(userId: string, data: InformationBank, expectedRevision: number) {
	const saved = { revision: informationBank.revision, updatedAt: informationBank.updatedAt };
	// A row is only created by a first save (revision 0). A save that names a later revision must find that
	// row: otherwise a client still holding another account's bank could create this one from it.
	const [row] =
		expectedRevision === 0
			? await db.insert(informationBank).values({ userId, data }).onConflictDoNothing().returning(saved)
			: await db
					.update(informationBank)
					.set({ data, revision: sql`${informationBank.revision} + 1` })
					.where(and(eq(informationBank.userId, userId), eq(informationBank.revision, expectedRevision)))
					.returning(saved);
	if (!row) {
		throw new ORPCError("CONFLICT", {
			message: "The Information Bank changed elsewhere. Reload it before saving again.",
		});
	}
	return row;
}

/** The bank as resume data, which is what generation and form filling read. */
export async function getProfile(userId: string) {
	const { data } = await getBank(userId);
	if (isEmptyBank(data)) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Your Information Bank is empty. Add your details to it in Reactive Resume first.",
		});
	}
	return toResumeData(data);
}

const reserved = { tags: ["Copilot"] } as const;

export const bankRouter = {
	get: protectedProcedure
		.route({
			method: "GET",
			path: "/information-bank",
			operationId: "getInformationBank",
			summary: "Get the Information Bank",
			description:
				"Returns the user's Information Bank: contact details, a summary, every entry they could put on a resume, and free-form notes. Before the first save it is empty, at revision 0.",
			...reserved,
		})
		.input(z.object({}).optional())
		.output(z.object({ data: informationBankSchema, revision: z.number().int(), updatedAt: z.date().nullable() }))
		.handler(({ context }) => getBank(context.user.id)),

	update: protectedProcedure
		.route({
			method: "PUT",
			path: "/information-bank",
			operationId: "updateInformationBank",
			summary: "Replace the Information Bank",
			description:
				"Replaces the whole Information Bank. Send the revision you last read as expectedRevision; if the bank changed since, the save is refused with 409 and nothing is overwritten.",
			...reserved,
		})
		.input(z.object({ data: informationBankSchema, expectedRevision: z.number().int().min(0) }))
		.use(resumeMutationRateLimit)
		.output(z.object({ revision: z.number().int(), updatedAt: z.date() }))
		.errors({ CONFLICT: { message: "The Information Bank changed elsewhere.", status: 409 } })
		.handler(({ context, input }) => saveBank(context.user.id, input.data, input.expectedRevision)),
};
