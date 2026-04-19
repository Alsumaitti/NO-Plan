import { Router, type IRouter } from "express";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import { db, logEntriesTable } from "@workspace/db";
import {
  CreateLogEntryBody,
  UpdateLogEntryParams,
  UpdateLogEntryBody,
  DeleteLogEntryParams,
  GetLogEntriesResponse,
  UpdateLogEntryResponse,
} from "@workspace/api-zod";
import { serializeRow, serializeRows } from "../lib/serialize";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/log-entries", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId;
  const { from, to, category, outcome } = req.query as Record<string, string>;

  const conditions = [eq(logEntriesTable.userId, userId)];
  if (from) conditions.push(gte(logEntriesTable.date, from));
  if (to) conditions.push(lte(logEntriesTable.date, to));
  if (category) conditions.push(eq(logEntriesTable.category, category));
  if (outcome) conditions.push(eq(logEntriesTable.outcome, outcome));

  const entries = await db
    .select()
    .from(logEntriesTable)
    .where(and(...conditions))
    .orderBy(desc(logEntriesTable.date), desc(logEntriesTable.createdAt));
  res.json(GetLogEntriesResponse.parse(serializeRows(entries)));
});

router.post("/log-entries", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateLogEntryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [entry] = await db
    .insert(logEntriesTable)
    .values({ ...parsed.data, userId: req.userId })
    .returning();
  res.status(201).json(serializeRow(entry));
});

router.patch("/log-entries/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateLogEntryParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateLogEntryBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [entry] = await db
    .update(logEntriesTable)
    .set(parsed.data)
    .where(and(eq(logEntriesTable.id, params.data.id), eq(logEntriesTable.userId, req.userId)))
    .returning();
  if (!entry) { res.status(404).json({ error: "Not found" }); return; }
  res.json(UpdateLogEntryResponse.parse(serializeRow(entry)));
});

router.delete("/log-entries/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteLogEntryParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [entry] = await db
    .delete(logEntriesTable)
    .where(and(eq(logEntriesTable.id, params.data.id), eq(logEntriesTable.userId, req.userId)))
    .returning();
  if (!entry) { res.status(404).json({ error: "Not found" }); return; }
  res.sendStatus(204);
});

// DELETE ALL for this user
router.delete("/log-entries", requireAuth, async (req, res): Promise<void> => {
  await db.delete(logEntriesTable).where(eq(logEntriesTable.userId, req.userId));
  res.sendStatus(204);
});

export default router;
