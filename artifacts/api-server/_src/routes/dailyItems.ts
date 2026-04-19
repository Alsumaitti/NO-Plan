import { Router, type IRouter } from "express";
import { eq, desc, lt, and } from "drizzle-orm";
import { db, dailyItemsTable, logEntriesTable } from "@workspace/db";
import {
  CreateDailyItemBody,
  UpdateDailyItemParams,
  UpdateDailyItemBody,
  DeleteDailyItemParams,
  GetDailyItemsResponse,
  UpdateDailyItemResponse,
} from "@workspace/api-zod";
import { serializeRow, serializeRows } from "../lib/serialize";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

// GET /daily-items?date=yyyy-MM-dd
router.get("/daily-items", requireAuth, async (req, res): Promise<void> => {
  const date = typeof req.query.date === "string" ? req.query.date : new Date().toISOString().split("T")[0];
  const items = await db
    .select()
    .from(dailyItemsTable)
    .where(and(eq(dailyItemsTable.userId, req.userId), eq(dailyItemsTable.date, date)))
    .orderBy(desc(dailyItemsTable.createdAt));
  res.json(GetDailyItemsResponse.parse(serializeRows(items)));
});

router.post("/daily-items", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateDailyItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [item] = await db
    .insert(dailyItemsTable)
    .values({ ...parsed.data, userId: req.userId })
    .returning();
  res.status(201).json(serializeRow(item));
});

router.patch("/daily-items/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateDailyItemParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateDailyItemBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [item] = await db
    .update(dailyItemsTable)
    .set(parsed.data)
    .where(and(eq(dailyItemsTable.id, params.data.id), eq(dailyItemsTable.userId, req.userId)))
    .returning();
  if (!item) { res.status(404).json({ error: "Not found" }); return; }
  res.json(UpdateDailyItemResponse.parse(serializeRow(item)));
});

router.delete("/daily-items/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteDailyItemParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [item] = await db
    .delete(dailyItemsTable)
    .where(and(eq(dailyItemsTable.id, params.data.id), eq(dailyItemsTable.userId, req.userId)))
    .returning();
  if (!item) { res.status(404).json({ error: "Not found" }); return; }
  res.sendStatus(204);
});

// GET /daily-items/past-dates
router.get("/daily-items/past-dates", requireAuth, async (req, res): Promise<void> => {
  const today = new Date().toISOString().split("T")[0];
  const rows = await db
    .selectDistinct({ date: dailyItemsTable.date })
    .from(dailyItemsTable)
    .where(and(eq(dailyItemsTable.userId, req.userId), lt(dailyItemsTable.date, today)));
  res.json(rows.map(r => r.date));
});

// POST /daily-items/archive
router.post("/daily-items/archive", requireAuth, async (req, res): Promise<void> => {
  const today = new Date().toISOString().split("T")[0];
  const { date, defaultCategory = "أخرى", defaultOutcome = "Held" } = req.body as {
    date?: string;
    defaultCategory?: string;
    defaultOutcome?: "Held" | "Partial" | "Caved";
  };
  const targetDate = date ?? today;
  const items = await db
    .select()
    .from(dailyItemsTable)
    .where(and(eq(dailyItemsTable.userId, req.userId), eq(dailyItemsTable.date, targetDate)));

  if (items.length === 0) {
    res.json({ archived: 0 });
    return;
  }

  const logRows = items.map(item => ({
    userId: req.userId,
    date: item.date,
    what: item.what,
    source: item.source ?? "خطة اليوم",
    category: item.category ?? defaultCategory,
    hoursRecovered: item.hoursRecovered ?? null,
    outcome: (item.done ? defaultOutcome : "Caved") as "Held" | "Partial" | "Caved",
    note: item.replacement ? `البديل المقترح: ${item.replacement}` : null,
  }));

  await db.insert(logEntriesTable).values(logRows);
  await db.delete(dailyItemsTable).where(and(eq(dailyItemsTable.userId, req.userId), eq(dailyItemsTable.date, targetDate)));

  res.json({ archived: items.length, date: targetDate });
});

export default router;
