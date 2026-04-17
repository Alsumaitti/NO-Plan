import { Router, type IRouter } from "express";
import { eq, desc, lt, and, ne } from "drizzle-orm";
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

const router: IRouter = Router();

// GET /daily-items?date=yyyy-MM-dd  (defaults to today)
router.get("/daily-items", async (req, res): Promise<void> => {
  const date = typeof req.query.date === "string" ? req.query.date : new Date().toISOString().split("T")[0];
  req.log.info({ date }, "Fetching daily items");
  const items = await db
    .select()
    .from(dailyItemsTable)
    .where(eq(dailyItemsTable.date, date))
    .orderBy(desc(dailyItemsTable.createdAt));
  res.json(GetDailyItemsResponse.parse(serializeRows(items)));
});

// POST /daily-items
router.post("/daily-items", async (req, res): Promise<void> => {
  const parsed = CreateDailyItemBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid daily item body");
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [item] = await db
    .insert(dailyItemsTable)
    .values(parsed.data)
    .returning();
  res.status(201).json(serializeRow(item));
});

// PATCH /daily-items/:id
router.patch("/daily-items/:id", async (req, res): Promise<void> => {
  const params = UpdateDailyItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateDailyItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [item] = await db
    .update(dailyItemsTable)
    .set(parsed.data)
    .where(eq(dailyItemsTable.id, params.data.id))
    .returning();
  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }
  res.json(UpdateDailyItemResponse.parse(serializeRow(item)));
});

// DELETE /daily-items/:id
router.delete("/daily-items/:id", async (req, res): Promise<void> => {
  const params = DeleteDailyItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [item] = await db
    .delete(dailyItemsTable)
    .where(eq(dailyItemsTable.id, params.data.id))
    .returning();
  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }
  res.sendStatus(204);
});

// POST /daily-items/archive
// Moves items from a given date (before today) into log_entries, then deletes them.
// Body: { date: "yyyy-MM-dd", defaultCategory?: string, defaultOutcome?: "Held"|"Partial"|"Caved" }
router.post("/daily-items/archive", async (req, res): Promise<void> => {
  const today = new Date().toISOString().split("T")[0];
  const { date, defaultCategory = "أخرى", defaultOutcome = "Held" } = req.body as {
    date?: string;
    defaultCategory?: string;
    defaultOutcome?: "Held" | "Partial" | "Caved";
  };

  const targetDate = date ?? today;

  // Fetch all items for the target date
  const items = await db
    .select()
    .from(dailyItemsTable)
    .where(eq(dailyItemsTable.date, targetDate));

  if (items.length === 0) {
    res.json({ archived: 0, message: "لا يوجد بنود للترحيل" });
    return;
  }

  // Insert each item as a log entry
  const logRows = items.map(item => ({
    date: item.date,
    what: item.what,
    source: "خطة اليوم",
    category: defaultCategory,
    hoursRecovered: null as number | null,
    outcome: item.done ? (defaultOutcome as "Held" | "Partial" | "Caved") : ("Caved" as "Held" | "Partial" | "Caved"),
    note: item.replacement ? `البديل المقترح: ${item.replacement}` : null,
  }));

  await db.insert(logEntriesTable).values(logRows);

  // Delete archived items
  await db
    .delete(dailyItemsTable)
    .where(eq(dailyItemsTable.date, targetDate));

  req.log.info({ date: targetDate, count: items.length }, "Archived daily items to log");
  res.json({ archived: items.length, date: targetDate });
});

// GET /daily-items/past-dates
// Returns distinct dates that have items older than today
router.get("/daily-items/past-dates", async (req, res): Promise<void> => {
  const today = new Date().toISOString().split("T")[0];
  const rows = await db
    .selectDistinct({ date: dailyItemsTable.date })
    .from(dailyItemsTable)
    .where(lt(dailyItemsTable.date, today));
  res.json(rows.map(r => r.date));
});

export default router;
