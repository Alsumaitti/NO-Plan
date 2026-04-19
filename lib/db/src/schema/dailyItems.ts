import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  boolean,
  real,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const dailyItemsTable = pgTable("daily_items", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().default(""),
  date: text("date").notNull(),
  what: text("what").notNull(),
  source: text("source"),
  category: text("category"),
  hoursRecovered: real("hours_recovered"),
  replacement: text("replacement"),
  riskLevel: integer("risk_level").notNull().default(3),
  done: boolean("done").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertDailyItemSchema = createInsertSchema(dailyItemsTable).omit({
  id: true,
  userId: true,
  createdAt: true,
});
export type InsertDailyItem = z.infer<typeof insertDailyItemSchema>;
export type DailyItem = typeof dailyItemsTable.$inferSelect;
