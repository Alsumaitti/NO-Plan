import { Router, type IRouter } from "express";
import { desc } from "drizzle-orm";
import { db, logEntriesTable, dailyItemsTable, masterRulesTable, prioritiesTable, ifThenPlansTable } from "@workspace/db";
import { serializeRows } from "../lib/serialize";

const router: IRouter = Router();

// GET /export?format=json|csv
router.get("/export", async (req, res): Promise<void> => {
  const fmt = req.query.format === "csv" ? "csv" : "json";
  req.log.info({ format: fmt }, "Exporting data");

  const [logEntries, dailyItems, masterRules, priorities, ifThenPlans] = await Promise.all([
    db.select().from(logEntriesTable).orderBy(desc(logEntriesTable.date)),
    db.select().from(dailyItemsTable).orderBy(desc(dailyItemsTable.date)),
    db.select().from(masterRulesTable).orderBy(desc(masterRulesTable.createdAt)),
    db.select().from(prioritiesTable).orderBy(desc(prioritiesTable.date)),
    db.select().from(ifThenPlansTable).orderBy(desc(ifThenPlansTable.createdAt)),
  ]);

  if (fmt === "csv") {
    const csvSections: string[] = [];

    const toCsv = (rows: Record<string, unknown>[], title: string) => {
      if (rows.length === 0) return `# ${title}\n(لا يوجد بيانات)\n`;
      const headers = Object.keys(rows[0]);
      const lines = [
        `# ${title}`,
        headers.join(","),
        ...rows.map(row =>
          headers
            .map(h => {
              const val = row[h];
              if (val === null || val === undefined) return "";
              const str = String(val).replace(/"/g, '""');
              return str.includes(",") || str.includes("\n") || str.includes('"') ? `"${str}"` : str;
            })
            .join(",")
        ),
      ];
      return lines.join("\n");
    };

    csvSections.push(toCsv(serializeRows(logEntries) as Record<string, unknown>[], "سجل الإزالة"));
    csvSections.push(toCsv(serializeRows(dailyItems) as Record<string, unknown>[], "خطة اليوم"));
    csvSections.push(toCsv(serializeRows(masterRules) as Record<string, unknown>[], "قائمة المنع الدائمة"));
    csvSections.push(toCsv(serializeRows(priorities) as Record<string, unknown>[], "الأولويات"));
    csvSections.push(toCsv(serializeRows(ifThenPlans) as Record<string, unknown>[], "خطط إذا-فإني"));

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="remover-tracker-export-${new Date().toISOString().split("T")[0]}.csv"`);
    res.send("\uFEFF" + csvSections.join("\n\n"));
    return;
  }

  const payload = {
    exportedAt: new Date().toISOString(),
    data: {
      logEntries: serializeRows(logEntries),
      dailyItems: serializeRows(dailyItems),
      masterRules: serializeRows(masterRules),
      priorities: serializeRows(priorities),
      ifThenPlans: serializeRows(ifThenPlans),
    },
  };

  res.setHeader("Content-Disposition", `attachment; filename="remover-tracker-export-${new Date().toISOString().split("T")[0]}.json"`);
  res.json(payload);
});

export default router;
