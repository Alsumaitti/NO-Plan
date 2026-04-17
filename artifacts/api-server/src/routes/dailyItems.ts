import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, dailyItemsTable } from "@workspace/db";
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

router.get("/daily-items", async (req, res): Promise<void> => {
  req.log.info("Fetching daily items");
  const items = await db
    .select()
    .from(dailyItemsTable)
    .orderBy(desc(dailyItemsTable.createdAt));
  res.json(GetDailyItemsResponse.parse(serializeRows(items)));
});

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

export default router;
