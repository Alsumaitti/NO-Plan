import { Router, type IRouter } from "express";
import { gte, and, eq, lte } from "drizzle-orm";
import { db, logEntriesTable, userSettingsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

function getDateDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

router.get("/dashboard/stats", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId;
  const today = getToday();
  const sevenDaysAgo = getDateDaysAgo(7);
  const fourteenDaysAgo = getDateDaysAgo(14);

  const allEntries = await db
    .select()
    .from(logEntriesTable)
    .where(eq(logEntriesTable.userId, userId));

  const totalNos = allEntries.length;
  const weekEntries = allEntries.filter(e => e.date >= sevenDaysAgo);
  const weekNos = weekEntries.length;
  const hoursRecovered = allEntries.reduce((acc, e) => acc + (e.hoursRecovered ?? 0), 0);
  const heldEntries = allEntries.filter(e => e.outcome === "Held" || e.outcome === "held").length;
  const commitmentRate = totalNos > 0 ? Math.round((heldEntries / totalNos) * 100) : 0;

  // Streak calculation
  let streak = 0;
  if (allEntries.length > 0) {
    const dates = [...new Set(allEntries.map(e => e.date))].sort().reverse();
    let currentDate = new Date(today);
    for (const d of dates) {
      const entryDate = new Date(d + "T12:00:00");
      const diff = Math.floor((currentDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diff <= 1) {
        streak++;
        currentDate = entryDate;
      } else {
        break;
      }
    }
  }

  // Best streak
  let bestStreak = 0;
  let currentStreak = 0;
  const allDates = [...new Set(allEntries.map(e => e.date))].sort();
  for (let i = 0; i < allDates.length; i++) {
    if (i === 0) {
      currentStreak = 1;
    } else {
      const prev = new Date(allDates[i - 1] + "T12:00:00");
      const curr = new Date(allDates[i] + "T12:00:00");
      const diff = Math.floor((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
      if (diff === 1) { currentStreak++; } else { currentStreak = 1; }
    }
    bestStreak = Math.max(bestStreak, currentStreak);
  }

  const todayNos = allEntries.filter(e => e.date === today).length;
  const thisMonth = today.slice(0, 7);
  const monthNos = allEntries.filter(e => e.date.startsWith(thisMonth)).length;

  // Recent 14-day activity
  const recentEntries = allEntries.filter(e => e.date >= fourteenDaysAgo);
  const activityMap: Record<string, { count: number; held: number; partial: number; caved: number }> = {};
  for (const e of recentEntries) {
    const d = e.date;
    if (!activityMap[d]) activityMap[d] = { count: 0, held: 0, partial: 0, caved: 0 };
    activityMap[d].count++;
    const outcome = (e.outcome ?? "").toLowerCase();
    if (outcome === "held") activityMap[d].held++;
    else if (outcome === "partial") activityMap[d].partial++;
    else if (outcome === "caved") activityMap[d].caved++;
  }
  const recentActivity = [];
  for (let i = 13; i >= 0; i--) {
    const d = getDateDaysAgo(i);
    recentActivity.push({ date: d, ...(activityMap[d] ?? { count: 0, held: 0, partial: 0, caved: 0 }) });
  }

  // Category breakdown
  const catMap: Record<string, number> = {};
  for (const e of allEntries) {
    const cat = e.category || "Other";
    catMap[cat] = (catMap[cat] ?? 0) + 1;
  }
  const categoryBreakdown = Object.entries(catMap)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  // Last login
  const [settings] = await db
    .select()
    .from(userSettingsTable)
    .where(eq(userSettingsTable.userId, userId));
  const lastLoginAt = settings?.lastSeenAt;

  // Update lastSeenAt
  await db
    .insert(userSettingsTable)
    .values({ userId, lastSeenAt: new Date() })
    .onConflictDoUpdate({ target: userSettingsTable.userId, set: { lastSeenAt: new Date() } });

  res.json({
    totalNos,
    weekNos,
    todayNos,
    monthNos,
    hoursRecovered: Math.round(hoursRecovered * 100) / 100,
    commitmentRate,
    streak,
    bestStreak,
    lastLoginAt: lastLoginAt?.toISOString() ?? null,
    recentActivity,
    categoryBreakdown,
  });
});

// Keep backward-compat routes
router.get("/dashboard/activity", requireAuth, async (req, res): Promise<void> => {
  const fourteenDaysAgo = getDateDaysAgo(14);
  const entries = await db
    .select()
    .from(logEntriesTable)
    .where(and(eq(logEntriesTable.userId, req.userId), gte(logEntriesTable.date, fourteenDaysAgo)));
  const countsByDate: Record<string, number> = {};
  for (const e of entries) { countsByDate[e.date] = (countsByDate[e.date] ?? 0) + 1; }
  const activity = [];
  for (let i = 13; i >= 0; i--) {
    const d = getDateDaysAgo(i);
    activity.push({ date: d, count: countsByDate[d] ?? 0 });
  }
  res.json(activity);
});

router.get("/dashboard/by-category", requireAuth, async (req, res): Promise<void> => {
  const entries = await db.select().from(logEntriesTable).where(eq(logEntriesTable.userId, req.userId));
  const countsByCategory: Record<string, number> = {};
  for (const e of entries) { countsByCategory[e.category] = (countsByCategory[e.category] ?? 0) + 1; }
  const result = Object.entries(countsByCategory)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
  res.json(result);
});

export default router;
