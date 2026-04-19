import { pgTable, text, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userSettingsTable = pgTable("user_settings", {
  userId: text("user_id").primaryKey(),
  language: text("language").notNull().default("ar"),
  darkMode: boolean("dark_mode").notNull().default(false),
  customCategories: jsonb("custom_categories").$type<string[]>().default([]),
  dashboardWidgets: jsonb("dashboard_widgets").$type<string[]>().default([
    "stats", "streak", "activity", "categories", "lastLogin"
  ]),
  phone: text("phone"),
  onboardingComplete: boolean("onboarding_complete").notNull().default(false),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertUserSettingsSchema = createInsertSchema(userSettingsTable).omit({
  createdAt: true,
});
export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;
export type UserSettings = typeof userSettingsTable.$inferSelect;
