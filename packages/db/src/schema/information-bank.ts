import type { InformationBank } from "@reactive-resume/schema/resume/information-bank";
import * as pg from "drizzle-orm/pg-core";
import { user } from "./auth";

/** One Information Bank per user: the full profile that tailored documents are generated from. */
export const informationBank = pg.pgTable("information_bank", {
	userId: pg
		.text("user_id")
		.primaryKey()
		.references(() => user.id, { onDelete: "cascade" }),
	data: pg.jsonb("data").notNull().$type<InformationBank>(),
	// Raised by every save; a save that names an older revision is refused instead of overwriting newer work.
	revision: pg.integer("revision").notNull().default(1),
	updatedAt: pg
		.timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow()
		.$onUpdate(() => new Date()),
});
