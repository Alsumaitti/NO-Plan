import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, masterRulesTable } from "@workspace/db";
import {
  CreateMasterRuleBody,
  DeleteMasterRuleParams,
  GetMasterRulesResponse,
} from "@workspace/api-zod";
import { serializeRow, serializeRows } from "../lib/serialize";

const router: IRouter = Router();

router.get("/master-rules", async (req, res): Promise<void> => {
  req.log.info("Fetching master rules");
  const rules = await db
    .select()
    .from(masterRulesTable)
    .orderBy(desc(masterRulesTable.createdAt));
  res.json(GetMasterRulesResponse.parse(serializeRows(rules)));
});

router.post("/master-rules", async (req, res): Promise<void> => {
  const parsed = CreateMasterRuleBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid master rule body");
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [rule] = await db
    .insert(masterRulesTable)
    .values(parsed.data)
    .returning();
  res.status(201).json(serializeRow(rule));
});

router.delete("/master-rules/:id", async (req, res): Promise<void> => {
  const params = DeleteMasterRuleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [rule] = await db
    .delete(masterRulesTable)
    .where(eq(masterRulesTable.id, params.data.id))
    .returning();
  if (!rule) {
    res.status(404).json({ error: "Rule not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
