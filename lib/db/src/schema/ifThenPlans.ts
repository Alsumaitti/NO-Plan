import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ifThenPlansTable = pgTable("if_then_plans", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().default(""),
  date: text("date").notNull(),
  ifCondition: text("if_condition").notNull(),
  thenAction: text("then_action").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertIfThenPlanSchema = createInsertSchema(
  ifThenPlansTable
).omit({
  id: true,
  userId: true,
  createdAt: true,
});
export type InsertIfThenPlan = z.infer<typeof insertIfThenPlanSchema>;
export type IfThenPlan = typeof ifThenPlansTable.$inferSelect;
