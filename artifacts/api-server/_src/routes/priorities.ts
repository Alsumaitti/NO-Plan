import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, prioritiesTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

// GET /priorities?date=yyyy-MM-dd  → { priorities: string[] }
router.get("/priorities", requireAuth, async (req, res): Promise<void> => {
  const date = typeof req.query.date === "string" ? req.query.date : new Date().toISOString().split("T")[0];
  const [row] = await db
    .select()
    .from(prioritiesTable)
    .where(and(eq(prioritiesTable.userId, req.userId), eq(prioritiesTable.date, date)));
  const priorities = row
    ? [row.priority1, row.priority2, row.priority3].filter((p): p is string => !!p)
    : [];
  res.json({ date, priorities });
});

// POST /priorities { date, priorities: string[] }
router.post("/priorities", requireAuth, async (req, res): Promise<void> => {
  const today = new Date().toISOString().split("T")[0];
  const body = req.body as { date?: string; priorities?: string[] };
  const date = body.date ?? today;
  const list = Array.isArray(body.priorities) ? body.priorities.map(p => p?.trim() ?? "").filter(Boolean) : [];
  const [p1, p2, p3] = [list[0] ?? null, list[1] ?? null, list[2] ?? null];
  const [row] = await db
    .insert(prioritiesTable)
    .values({ userId: req.userId, date, priority1: p1, priority2: p2, priority3: p3 })
    .onConflictDoUpdate({
      target: [prioritiesTable.userId, prioritiesTable.date],
      set: { priority1: p1, priority2: p2, priority3: p3 },
    })
    .returning();
  res.json({
    date: row.date,
    priorities: [row.priority1, row.priority2, row.priority3].filter((p): p is string => !!p),
  });
});

// Keep PUT for backwards compat
router.put("/priorities", requireAuth, async (req, res): Promise<void> => {
  const today = new Date().toISOString().split("T")[0];
  const body = req.body as { date?: string; priorities?: string[]; priority1?: string; priority2?: string; priority3?: string };
  const date = body.date ?? today;
  let p1: string | null = body.priority1 ?? null;
  let p2: string | null = body.priority2 ?? null;
  let p3: string | null = body.priority3 ?? null;
  if (Array.isArray(body.priorities)) {
    const list = body.priorities.map(p => p?.trim() ?? "").filter(Boolean);
    p1 = list[0] ?? null;
    p2 = list[1] ?? null;
    p3 = list[2] ?? null;
  }
  const [row] = await db
    .insert(prioritiesTable)
    .values({ userId: req.userId, date, priority1: p1, priority2: p2, priority3: p3 })
    .onConflictDoUpdate({
      target: [prioritiesTable.userId, prioritiesTable.date],
      set: { priority1: p1, priority2: p2, priority3: p3 },
    })
    .returning();
  res.json({
    date: row.date,
    priorities: [row.priority1, row.priority2, row.priority3].filter((p): p is string => !!p),
  });
});

export default router;
