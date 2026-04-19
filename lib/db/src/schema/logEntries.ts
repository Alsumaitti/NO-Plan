import {
  pgTable,
  serial,
  text,
  timestamp,
  real,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const logEntriesTable = pgTable("log_entries", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().default(""),
  date: text("date").notNull(),
  what: text("what").notNull(),
  source: text("source").notNull(),
  category: text("category").notNull(),
  hoursRecovered: real("hours_recovered"),
  outcome: text("outcome").notNull().default("Held"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertLogEntrySchema = createInsertSchema(logEntriesTable).omit({
  id: true,
  userId: true,
  createdAt: true,
});
export type InsertLogEntry = z.infer<typeof insertLogEntrySchema>;
export type LogEntry = typeof logEntriesTable.$inferSelect;
