import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, masterRulesTable } from "@workspace/db";
import {
  CreateMasterRuleBody,
  DeleteMasterRuleParams,
  GetMasterRulesResponse,
} from "@workspace/api-zod";
import { serializeRow, serializeRows } from "../lib/serialize";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/master-rules", requireAuth, async (req, res): Promise<void> => {
  const rules = await db
    .select()
    .from(masterRulesTable)
    .where(eq(masterRulesTable.userId, req.userId))
    .orderBy(desc(masterRulesTable.createdAt));
  res.json(GetMasterRulesResponse.parse(serializeRows(rules)));
});

router.post("/master-rules", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateMasterRuleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [rule] = await db
    .insert(masterRulesTable)
    .values({ ...parsed.data, userId: req.userId })
    .returning();
  res.status(201).json(serializeRow(rule));
});

router.delete("/master-rules/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteMasterRuleParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [rule] = await db
    .delete(masterRulesTable)
    .where(and(eq(masterRulesTable.id, params.data.id), eq(masterRulesTable.userId, req.userId)))
    .returning();
  if (!rule) { res.status(404).json({ error: "Not found" }); return; }
  res.sendStatus(204);
});

router.delete("/master-rules", requireAuth, async (req, res): Promise<void> => {
  await db.delete(masterRulesTable).where(eq(masterRulesTable.userId, req.userId));
  res.sendStatus(204);
});

export default router;
