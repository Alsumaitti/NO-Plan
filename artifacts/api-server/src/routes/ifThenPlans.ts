import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, ifThenPlansTable } from "@workspace/db";
import {
  CreateIfThenPlanBody,
  DeleteIfThenPlanParams,
  GetIfThenPlansResponse,
} from "@workspace/api-zod";
import { serializeRow, serializeRows } from "../lib/serialize";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/if-then", requireAuth, async (req, res): Promise<void> => {
  const plans = await db
    .select()
    .from(ifThenPlansTable)
    .where(eq(ifThenPlansTable.userId, req.userId))
    .orderBy(desc(ifThenPlansTable.createdAt));
  res.json(GetIfThenPlansResponse.parse(serializeRows(plans)));
});

router.post("/if-then", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateIfThenPlanBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [plan] = await db
    .insert(ifThenPlansTable)
    .values({ ...parsed.data, userId: req.userId })
    .returning();
  res.status(201).json(serializeRow(plan));
});

router.delete("/if-then/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteIfThenPlanParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [plan] = await db
    .delete(ifThenPlansTable)
    .where(and(eq(ifThenPlansTable.id, params.data.id), eq(ifThenPlansTable.userId, req.userId)))
    .returning();
  if (!plan) { res.status(404).json({ error: "Not found" }); return; }
  res.sendStatus(204);
});

export default router;
