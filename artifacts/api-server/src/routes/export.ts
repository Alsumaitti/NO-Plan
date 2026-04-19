import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import {
  db,
  logEntriesTable,
  dailyItemsTable,
  masterRulesTable,
  prioritiesTable,
  ifThenPlansTable,
} from "@workspace/db";
import { serializeRows } from "../lib/serialize";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

const LABELS: Record<string, Record<string, string>> = {
  ar: {
    logEntries: "سجل الإزالة",
    dailyItems: "خطة اليوم",
    masterRules: "قائمة المنع الدائمة",
    priorities: "الأولويات",
    ifThenPlans: "خطط إذا-فإني",
    exportedAt: "تاريخ التصدير",
    id: "المعرف",
    date: "التاريخ",
    what: "الموضوع",
    source: "المصدر",
    category: "الفئة",
    hoursRecovered: "الساعات المستردة",
    outcome: "النتيجة",
    note: "ملاحظات",
    riskLevel: "مستوى الخطر",
    replacement: "البديل",
    done: "مكتمل",
    why: "السبب",
    ifCondition: "إذا",
    thenAction: "فإني",
    priority1: "الأولوية الأولى",
    priority2: "الأولوية الثانية",
    priority3: "الأولوية الثالثة",
    Held: "صمدت",
    Partial: "جزئي",
    Caved: "تراجعت",
  },
  en: {
    logEntries: "Removal Log",
    dailyItems: "Daily Plan",
    masterRules: "Permanent Ban List",
    priorities: "Priorities",
    ifThenPlans: "If-Then Plans",
    exportedAt: "Exported At",
    id: "ID",
    date: "Date",
    what: "Subject",
    source: "Source",
    category: "Category",
    hoursRecovered: "Hours Recovered",
    outcome: "Outcome",
    note: "Notes",
    riskLevel: "Risk Level",
    replacement: "Replacement",
    done: "Done",
    why: "Reason",
    ifCondition: "If",
    thenAction: "Then",
    priority1: "Priority 1",
    priority2: "Priority 2",
    priority3: "Priority 3",
    Held: "Held",
    Partial: "Partial",
    Caved: "Caved",
  },
};

function toCsvSection(rows: Record<string, unknown>[], title: string, lang: string): string {
  const L = LABELS[lang] ?? LABELS.ar;
  if (rows.length === 0) return `# ${title}\n(${lang === "ar" ? "لا يوجد بيانات" : "No data"})\n`;

  // Translate header keys
  const rawHeaders = Object.keys(rows[0]).filter(h => !["userId", "createdAt", "updatedAt"].includes(h));
  const headers = rawHeaders.map(h => L[h] ?? h);

  const lines = [
    `# ${title}`,
    headers.join(","),
    ...rows.map(row =>
      rawHeaders
        .map(h => {
          const val = row[h];
          if (val === null || val === undefined) return "";
          // Translate outcome values
          let str = String(val);
          if (L[str]) str = L[str];
          str = str.replace(/"/g, '""');
          return str.includes(",") || str.includes("\n") || str.includes('"') ? `"${str}"` : str;
        })
        .join(",")
    ),
  ];
  return lines.join("\n");
}

router.get("/export", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId;
  const fmt = req.query.format === "csv" ? "csv" : "json";
  const lang = (req.query.lang as string) === "en" ? "en" : "ar";
  const L = LABELS[lang];

  const [logEntries, dailyItems, masterRules, priorities, ifThenPlans] = await Promise.all([
    db.select().from(logEntriesTable).where(eq(logEntriesTable.userId, userId)).orderBy(desc(logEntriesTable.date)),
    db.select().from(dailyItemsTable).where(eq(dailyItemsTable.userId, userId)).orderBy(desc(dailyItemsTable.date)),
    db.select().from(masterRulesTable).where(eq(masterRulesTable.userId, userId)).orderBy(desc(masterRulesTable.createdAt)),
    db.select().from(prioritiesTable).where(eq(prioritiesTable.userId, userId)).orderBy(desc(prioritiesTable.date)),
    db.select().from(ifThenPlansTable).where(eq(ifThenPlansTable.userId, userId)).orderBy(desc(ifThenPlansTable.createdAt)),
  ]);

  const cleanRows = (rows: any[]) =>
    (serializeRows(rows) as any[]).map(r => {
      const { userId: _u, createdAt: _c, updatedAt: _u2, ...rest } = r;
      return rest;
    });

  const dateStr = new Date().toISOString().split("T")[0];

  if (fmt === "csv") {
    const sections = [
      toCsvSection(cleanRows(logEntries) as Record<string, unknown>[], L.logEntries, lang),
      toCsvSection(cleanRows(dailyItems) as Record<string, unknown>[], L.dailyItems, lang),
      toCsvSection(cleanRows(masterRules) as Record<string, unknown>[], L.masterRules, lang),
      toCsvSection(cleanRows(priorities) as Record<string, unknown>[], L.priorities, lang),
      toCsvSection(cleanRows(ifThenPlans) as Record<string, unknown>[], L.ifThenPlans, lang),
    ];
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="remover-tracker-${dateStr}.csv"`);
    res.send("\uFEFF" + sections.join("\n\n"));
    return;
  }

  const payload: Record<string, unknown> = {
    [L.exportedAt]: new Date().toISOString(),
    [L.logEntries]: cleanRows(logEntries),
    [L.dailyItems]: cleanRows(dailyItems),
    [L.masterRules]: cleanRows(masterRules),
    [L.priorities]: cleanRows(priorities),
    [L.ifThenPlans]: cleanRows(ifThenPlans),
  };

  res.setHeader("Content-Disposition", `attachment; filename="remover-tracker-${dateStr}.json"`);
  res.json(payload);
});

export default router;
