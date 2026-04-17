import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const prioritiesTable = pgTable("priorities", {
  id: serial("id").primaryKey(),
  date: text("date").notNull().unique(),
  priority1: text("priority1"),
  priority2: text("priority2"),
  priority3: text("priority3"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertPrioritySchema = createInsertSchema(prioritiesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPriority = z.infer<typeof insertPrioritySchema>;
export type Priority = typeof prioritiesTable.$inferSelect;
