import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
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

const router: IRouter = Router();

router.get("/log-entries", async (req, res): Promise<void> => {
  req.log.info("Fetching log entries");
  const entries = await db
    .select()
    .from(logEntriesTable)
    .orderBy(desc(logEntriesTable.createdAt));
  res.json(GetLogEntriesResponse.parse(serializeRows(entries)));
});

router.post("/log-entries", async (req, res): Promise<void> => {
  const parsed = CreateLogEntryBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid log entry body");
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [entry] = await db
    .insert(logEntriesTable)
    .values(parsed.data)
    .returning();
  res.status(201).json(serializeRow(entry));
});

router.patch("/log-entries/:id", async (req, res): Promise<void> => {
  const params = UpdateLogEntryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateLogEntryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [entry] = await db
    .update(logEntriesTable)
    .set(parsed.data)
    .where(eq(logEntriesTable.id, params.data.id))
    .returning();
  if (!entry) {
    res.status(404).json({ error: "Entry not found" });
    return;
  }
  res.json(UpdateLogEntryResponse.parse(serializeRow(entry)));
});

router.delete("/log-entries/:id", async (req, res): Promise<void> => {
  const params = DeleteLogEntryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [entry] = await db
    .delete(logEntriesTable)
    .where(eq(logEntriesTable.id, params.data.id))
    .returning();
  if (!entry) {
    res.status(404).json({ error: "Entry not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
