import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, prioritiesTable } from "@workspace/db";
import {
  SavePrioritiesBody,
  GetPrioritiesResponse,
  SavePrioritiesResponse,
} from "@workspace/api-zod";
import { serializeRow } from "../lib/serialize";

const router: IRouter = Router();

router.get("/priorities", async (req, res): Promise<void> => {
  req.log.info("Fetching today's priorities");
  const today = new Date().toISOString().split("T")[0];
  const [row] = await db
    .select()
    .from(prioritiesTable)
    .where(eq(prioritiesTable.date, today));
  const priorities = row
    ? serializeRow(row)
    : { date: today, priority1: null, priority2: null, priority3: null };
  res.json(GetPrioritiesResponse.parse(priorities));
});

router.put("/priorities", async (req, res): Promise<void> => {
  const parsed = SavePrioritiesBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid priorities body");
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = parsed.data;
  const [existing] = await db
    .select()
    .from(prioritiesTable)
    .where(eq(prioritiesTable.date, data.date));
  let result;
  if (existing) {
    [result] = await db
      .update(prioritiesTable)
      .set({
        priority1: data.priority1 ?? null,
        priority2: data.priority2 ?? null,
        priority3: data.priority3 ?? null,
      })
      .where(eq(prioritiesTable.date, data.date))
      .returning();
  } else {
    [result] = await db
      .insert(prioritiesTable)
      .values({
        date: data.date,
        priority1: data.priority1 ?? null,
        priority2: data.priority2 ?? null,
        priority3: data.priority3 ?? null,
      })
      .returning();
  }
  res.json(SavePrioritiesResponse.parse(serializeRow(result!)));
});

export default router;
