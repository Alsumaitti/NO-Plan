import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, ifThenPlansTable } from "@workspace/db";
import {
  CreateIfThenPlanBody,
  DeleteIfThenPlanParams,
  GetIfThenPlansResponse,
} from "@workspace/api-zod";
import { serializeRow, serializeRows } from "../lib/serialize";

const router: IRouter = Router();

router.get("/if-then", async (req, res): Promise<void> => {
  req.log.info("Fetching if/then plans");
  const plans = await db
    .select()
    .from(ifThenPlansTable)
    .orderBy(desc(ifThenPlansTable.createdAt));
  res.json(GetIfThenPlansResponse.parse(serializeRows(plans)));
});

router.post("/if-then", async (req, res): Promise<void> => {
  const parsed = CreateIfThenPlanBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid if/then body");
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [plan] = await db
    .insert(ifThenPlansTable)
    .values(parsed.data)
    .returning();
  res.status(201).json(serializeRow(plan));
});

router.delete("/if-then/:id", async (req, res): Promise<void> => {
  const params = DeleteIfThenPlanParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [plan] = await db
    .delete(ifThenPlansTable)
    .where(eq(ifThenPlansTable.id, params.data.id))
    .returning();
  if (!plan) {
    res.status(404).json({ error: "Plan not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
