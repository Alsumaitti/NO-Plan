import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, prioritiesTable } from "@workspace/db";
import { serializeRow } from "../lib/serialize";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/priorities", requireAuth, async (req, res): Promise<void> => {
  const today = new Date().toISOString().split("T")[0];
  const [row] = await db
    .select()
    .from(prioritiesTable)
    .where(and(eq(prioritiesTable.userId, req.userId), eq(prioritiesTable.date, today)));
  res.json(row ? serializeRow(row) : { date: today, priority1: null, priority2: null, priority3: null });
});

router.put("/priorities", requireAuth, async (req, res): Promise<void> => {
  const today = new Date().toISOString().split("T")[0];
  const { priority1, priority2, priority3 } = req.body as {
    priority1?: string; priority2?: string; priority3?: string;
  };
  const [row] = await db
    .insert(prioritiesTable)
    .values({ userId: req.userId, date: today, priority1, priority2, priority3 })
    .onConflictDoUpdate({
      target: [prioritiesTable.userId, prioritiesTable.date],
      set: { priority1, priority2, priority3 },
    })
    .returning();
  res.json(serializeRow(row));
});

export default router;
