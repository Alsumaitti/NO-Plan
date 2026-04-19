import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, userSettingsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

const DEFAULT_CATEGORIES_AR = [
  "العمل / اجتماعات", "رقمي / تركيز", "اجتماعي / عائلي",
  "صحّة / طعام", "ماليّ", "تعلّم / بحث", "التزام شخصي", "أخرى"
];

const DEFAULT_CATEGORIES_EN = [
  "Work / Meetings", "Digital / Focus", "Social / Family",
  "Health / Food", "Financial", "Learning / Research", "Personal Commitment", "Other"
];

// GET /settings
router.get("/settings", requireAuth, async (req, res): Promise<void> => {
  const [settings] = await db
    .select()
    .from(userSettingsTable)
    .where(eq(userSettingsTable.userId, req.userId));

  if (!settings) {
    // Return defaults without creating a row yet
    res.json({
      userId: req.userId,
      language: "ar",
      darkMode: false,
      customCategories: [],
      dashboardWidgets: ["stats", "streak", "activity", "categories", "lastLogin"],
      phone: null,
      onboardingComplete: false,
    });
    return;
  }
  res.json(settings);
});

// PUT /settings
router.put("/settings", requireAuth, async (req, res): Promise<void> => {
  const { language, darkMode, customCategories, dashboardWidgets, phone, onboardingComplete } = req.body as {
    language?: string;
    darkMode?: boolean;
    customCategories?: string[];
    dashboardWidgets?: string[];
    phone?: string;
    onboardingComplete?: boolean;
  };

  const [updated] = await db
    .insert(userSettingsTable)
    .values({
      userId: req.userId,
      ...(language !== undefined && { language }),
      ...(darkMode !== undefined && { darkMode }),
      ...(customCategories !== undefined && { customCategories }),
      ...(dashboardWidgets !== undefined && { dashboardWidgets }),
      ...(phone !== undefined && { phone }),
      ...(onboardingComplete !== undefined && { onboardingComplete }),
    })
    .onConflictDoUpdate({
      target: userSettingsTable.userId,
      set: {
        ...(language !== undefined && { language }),
        ...(darkMode !== undefined && { darkMode }),
        ...(customCategories !== undefined && { customCategories }),
        ...(dashboardWidgets !== undefined && { dashboardWidgets }),
        ...(phone !== undefined && { phone }),
        ...(onboardingComplete !== undefined && { onboardingComplete }),
      },
    })
    .returning();
  res.json(updated);
});

// GET /categories — returns user's custom categories or defaults
router.get("/categories", requireAuth, async (req, res): Promise<void> => {
  const [settings] = await db
    .select()
    .from(userSettingsTable)
    .where(eq(userSettingsTable.userId, req.userId));

  const lang = settings?.language ?? "ar";
  const custom = (settings?.customCategories as string[]) ?? [];

  if (custom.length > 0) {
    res.json(custom);
    return;
  }
  res.json(lang === "en" ? DEFAULT_CATEGORIES_EN : DEFAULT_CATEGORIES_AR);
});

// DELETE /account-data — delete all user data (not the Clerk account)
router.delete("/account-data", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId;
  // Delete all user data across all tables
  const { logEntriesTable, dailyItemsTable, masterRulesTable, prioritiesTable, ifThenPlansTable } =
    await import("@workspace/db");
  await Promise.all([
    db.delete(logEntriesTable).where(eq(logEntriesTable.userId, userId)),
    db.delete(dailyItemsTable).where(eq(dailyItemsTable.userId, userId)),
    db.delete(masterRulesTable).where(eq(masterRulesTable.userId, userId)),
    db.delete(prioritiesTable).where(eq(prioritiesTable.userId, userId)),
    db.delete(ifThenPlansTable).where(eq(ifThenPlansTable.userId, userId)),
    db.delete(userSettingsTable).where(eq(userSettingsTable.userId, userId)),
  ]);
  res.sendStatus(204);
});

export default router;
