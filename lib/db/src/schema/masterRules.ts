import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const masterRulesTable = pgTable("master_rules", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().default(""),
  category: text("category").notNull(),
  what: text("what").notNull(),
  why: text("why"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertMasterRuleSchema = createInsertSchema(
  masterRulesTable
).omit({
  id: true,
  userId: true,
  createdAt: true,
});
export type InsertMasterRule = z.infer<typeof insertMasterRuleSchema>;
export type MasterRule = typeof masterRulesTable.$inferSelect;
