import { Router, type IRouter } from "express";
import { gte, and, sql, count, sum, eq } from "drizzle-orm";
import { db, logEntriesTable, dailyItemsTable } from "@workspace/db";
import {
  GetDashboardStatsResponse,
  GetDashboardActivityResponse,
  GetDashboardByCategoryResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function getDateDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

router.get("/dashboard/stats", async (req, res): Promise<void> => {
  req.log.info("Fetching dashboard stats");

  const today = getToday();
  const sevenDaysAgo = getDateDaysAgo(7);

  const allEntries = await db.select().from(logEntriesTable);

  const totalNos = allEntries.length;

  const weekEntries = allEntries.filter((e) => e.date >= sevenDaysAgo);
  const weekNos = weekEntries.length;

  const hoursRecovered = allEntries.reduce(
    (acc, e) => acc + (e.hoursRecovered ?? 0),
    0
  );

  const heldEntries = allEntries.filter((e) => e.outcome === "Held").length;
  const commitmentRate =
    totalNos > 0 ? Math.round((heldEntries / totalNos) * 100) : 0;

  let streak = 0;
  if (allEntries.length > 0) {
    const dates = [...new Set(allEntries.map((e) => e.date))].sort().reverse();
    let currentDate = new Date(today);
    for (const d of dates) {
      const entryDate = new Date(d);
      const diff = Math.floor(
        (currentDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diff <= 1) {
        streak++;
        currentDate = entryDate;
      } else {
        break;
      }
    }
  }

  const stats = {
    totalNos,
    weekNos,
    hoursRecovered: Math.round(hoursRecovered * 100) / 100,
    commitmentRate,
    streak,
  };

  res.json(GetDashboardStatsResponse.parse(stats));
});

router.get("/dashboard/activity", async (req, res): Promise<void> => {
  req.log.info("Fetching dashboard activity");

  const fourteenDaysAgo = getDateDaysAgo(14);
  const entries = await db
    .select()
    .from(logEntriesTable)
    .where(gte(logEntriesTable.date, fourteenDaysAgo));

  const countsByDate: Record<string, number> = {};
  for (const e of entries) {
    countsByDate[e.date] = (countsByDate[e.date] ?? 0) + 1;
  }

  const activity: { date: string; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = getDateDaysAgo(i);
    activity.push({ date: d, count: countsByDate[d] ?? 0 });
  }

  res.json(GetDashboardActivityResponse.parse(activity));
});

router.get("/dashboard/by-category", async (req, res): Promise<void> => {
  req.log.info("Fetching category breakdown");

  const entries = await db.select().from(logEntriesTable);

  const countsByCategory: Record<string, number> = {};
  for (const e of entries) {
    countsByCategory[e.category] = (countsByCategory[e.category] ?? 0) + 1;
  }

  const result = Object.entries(countsByCategory)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  res.json(GetDashboardByCategoryResponse.parse(result));
});

export default router;
