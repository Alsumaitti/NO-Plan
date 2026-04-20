// Builds a multi-sheet XLSX workbook from server + localStorage data.
// Sheets:
//   1. Plans — combined daily bans, priorities, if-then, and archived log entries
//   2. Prayer Law — localStorage prayer plans (+ log entries tagged Prayer Law)
//   3. Weekly Review — localStorage reflections (+ log entries tagged Weekly Review)
//   4. Permanent Ban List — master rules
import * as XLSX from "xlsx";
import type { AuthFetch } from "./apiClient";

type XLSXWorkSheet = any;
type XLSXColInfo = any;

type Lang = "ar" | "en";

const L = {
  ar: {
    plans: "الخطط",
    prayer: "قانون الفرض الجاي",
    review: "المراجعة الأسبوعية",
    bans: "قائمة المنع الدائمة",
    type: "النوع",
    date: "التاريخ",
    what: "الموضوع",
    category: "الفئة",
    source: "المصدر",
    hoursRecovered: "الساعات المستردة",
    outcome: "النتيجة",
    note: "ملاحظات",
    replacement: "البديل",
    riskLevel: "مستوى الخطر",
    done: "مكتمل",
    why: "السبب",
    ifCondition: "إذا",
    thenAction: "فإني",
    priority: "الأولوية",
    rank: "الترتيب",
    value: "القيمة",
    week: "الأسبوع",
    question: "السؤال",
    answer: "الإجابة",
    interval: "الفترة",
    tasks: "المهام",
    dailyBan: "منع يومي",
    priorityT: "أولوية",
    ifThen: "إذا-فإني",
    logEntry: "سجل",
    prayerInterval: "فترة صلاة",
    Held: "صمدت",
    Partial: "جزئي",
    Caved: "تراجعت",
  },
  en: {
    plans: "Plans",
    prayer: "Next Prayer Law",
    review: "Weekly Review",
    bans: "Permanent Ban List",
    type: "Type",
    date: "Date",
    what: "Subject",
    category: "Category",
    source: "Source",
    hoursRecovered: "Hours Recovered",
    outcome: "Outcome",
    note: "Notes",
    replacement: "Replacement",
    riskLevel: "Risk Level",
    done: "Done",
    why: "Reason",
    ifCondition: "If",
    thenAction: "Then",
    priority: "Priority",
    rank: "Rank",
    value: "Value",
    week: "Week",
    question: "Question",
    answer: "Answer",
    interval: "Interval",
    tasks: "Tasks",
    dailyBan: "Daily Ban",
    priorityT: "Priority",
    ifThen: "If-Then",
    logEntry: "Log",
    prayerInterval: "Prayer Interval",
    Held: "Held",
    Partial: "Partial",
    Caved: "Caved",
  },
};

const PRAYERS_AR = ["الفجر", "الظهر", "العصر", "المغرب", "العشاء"];
const PRAYERS_EN = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

const REVIEW_PROMPTS_AR = [
  "ما الـ'لا' التي أحدثت أكبر فرق هذا الأسبوع؟",
  "متى تراجعت، وما الذي جعلني أتراجع؟",
  "ما الذي أريد أن أُضيفه لقائمة المنع الدائمة؟",
  "كيف شعرتُ حين قلتُ 'لا' بوعي؟",
  "ما الإزالة الأقوى في حياتي الآن؟",
  "ما الذي لا أزال أسمح به رغم معرفتي بضرره؟",
];
const REVIEW_PROMPTS_EN = [
  "What 'No' made the biggest difference this week?",
  "When did I cave, and what made me cave?",
  "What do I want to add to my permanent ban list?",
  "How did I feel when I said 'No' consciously?",
  "What is the most powerful removal in my life right now?",
  "What am I still allowing despite knowing it hurts me?",
];

function safeJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

function applyRtl(ws: XLSXWorkSheet, lang: Lang) {
  if (lang !== "ar") return;
  (ws as any)["!rtl"] = true;
  (ws as any)["!views"] = [{ RTL: true }];
}

function autoWidth(rows: Record<string, any>[]): XLSXColInfo[] {
  if (!rows.length) return [];
  const keys = Object.keys(rows[0]);
  return keys.map(k => {
    const max = Math.max(
      k.length,
      ...rows.map(r => String(r[k] ?? "").length),
    );
    return { wch: Math.min(Math.max(max + 2, 10), 60) };
  });
}

export async function exportWorkbook(authFetch: AuthFetch, lang: Lang) {
  const XLSXUtils = XLSX.utils;
  const xlsxWriteFile = XLSX.writeFile;
  const t = L[lang];
  const prayerNames = lang === "ar" ? PRAYERS_AR : PRAYERS_EN;
  const prompts = lang === "ar" ? REVIEW_PROMPTS_AR : REVIEW_PROMPTS_EN;

  // Fetch all server-side data in parallel
  const [logRes, dailyRes, masterRes, prioritiesRes, ifThenRes] = await Promise.all([
    authFetch("/api/log-entries").then(r => r.ok ? r.json() : []),
    authFetch("/api/daily-items/all").then(r => r.ok ? r.json() : [])
      .catch(() => []),
    authFetch("/api/master-rules").then(r => r.ok ? r.json() : []),
    authFetch("/api/priorities/all").then(r => r.ok ? r.json() : [])
      .catch(() => []),
    authFetch("/api/if-then").then(r => r.ok ? r.json() : []),
  ]);

  // Fallback: if /all endpoints don't exist, use today-only
  const todayStr = new Date().toISOString().split("T")[0];
  let dailyItems: any[] = Array.isArray(dailyRes) ? dailyRes : [];
  if (dailyItems.length === 0) {
    const todayItems = await authFetch(`/api/daily-items?date=${todayStr}`).then(r => r.ok ? r.json() : []);
    if (Array.isArray(todayItems)) dailyItems = todayItems;
  }
  let priorities: any[] = Array.isArray(prioritiesRes) ? prioritiesRes : [];
  if (priorities.length === 0 && prioritiesRes && typeof prioritiesRes === "object") {
    priorities = [prioritiesRes];
  }
  if (priorities.length === 0) {
    const todayP = await authFetch(`/api/priorities?date=${todayStr}`).then(r => r.ok ? r.json() : null);
    if (todayP) priorities = [todayP];
  }

  const logEntries: any[] = Array.isArray(logRes) ? logRes : [];
  const masterRules: any[] = Array.isArray(masterRes) ? masterRes : [];
  const ifThenPlans: any[] = Array.isArray(ifThenRes) ? ifThenRes : [];

  // ===== Sheet 1: Plans (combined) =====
  const plansRows: Record<string, any>[] = [];

  // Daily bans
  for (const item of dailyItems) {
    plansRows.push({
      [t.type]: t.dailyBan,
      [t.date]: item.date ?? "",
      [t.what]: item.what ?? "",
      [t.category]: item.category ?? "",
      [t.source]: item.source ?? "",
      [t.riskLevel]: item.riskLevel ?? "",
      [t.replacement]: item.replacement ?? "",
      [t.done]: item.done ? (lang === "ar" ? "نعم" : "Yes") : (lang === "ar" ? "لا" : "No"),
      [t.hoursRecovered]: item.hoursRecovered ?? "",
      [t.outcome]: "",
      [t.note]: "",
    });
  }

  // Priorities (flatten — one row per priority slot per date)
  for (const p of priorities) {
    const arr: string[] = Array.isArray(p?.priorities)
      ? p.priorities
      : [p?.priority1, p?.priority2, p?.priority3].filter((v: any) => typeof v === "string");
    arr.forEach((val, i) => {
      if (!val || !val.trim()) return;
      plansRows.push({
        [t.type]: `${t.priorityT} ${i + 1}`,
        [t.date]: p.date ?? "",
        [t.what]: val,
        [t.category]: "",
        [t.source]: "",
        [t.riskLevel]: "",
        [t.replacement]: "",
        [t.done]: "",
        [t.hoursRecovered]: "",
        [t.outcome]: "",
        [t.note]: "",
      });
    });
  }

  // If-then
  for (const plan of ifThenPlans) {
    plansRows.push({
      [t.type]: t.ifThen,
      [t.date]: plan.date ?? "",
      [t.what]: `${t.ifCondition}: ${plan.ifCondition ?? ""} → ${t.thenAction}: ${plan.thenAction ?? ""}`,
      [t.category]: "",
      [t.source]: "",
      [t.riskLevel]: "",
      [t.replacement]: "",
      [t.done]: "",
      [t.hoursRecovered]: "",
      [t.outcome]: "",
      [t.note]: "",
    });
  }

  // Log entries — skip prayer-law and review entries (they go to their own sheets)
  const isPrayer = (e: any) =>
    e?.category === "قانون الفرض الجاي" || e?.category === "Next Prayer Law" ||
    e?.source === "قانون الفرض الجاي" || e?.source === "Next Prayer Law";
  const isReview = (e: any) =>
    e?.category === "مراجعة أسبوعية" || e?.category === "Weekly Review" ||
    e?.source === "مراجعة أسبوعية" || e?.source === "Weekly Review";

  for (const e of logEntries) {
    if (isPrayer(e) || isReview(e)) continue;
    const outcome = e.outcome && (t as any)[e.outcome] ? (t as any)[e.outcome] : (e.outcome ?? "");
    plansRows.push({
      [t.type]: t.logEntry,
      [t.date]: e.date ?? "",
      [t.what]: e.what ?? "",
      [t.category]: e.category ?? "",
      [t.source]: e.source ?? "",
      [t.riskLevel]: "",
      [t.replacement]: "",
      [t.done]: "",
      [t.hoursRecovered]: e.hoursRecovered ?? "",
      [t.outcome]: outcome,
      [t.note]: e.note ?? "",
    });
  }

  // Sort plans by date descending
  plansRows.sort((a, b) => String(b[t.date] ?? "").localeCompare(String(a[t.date] ?? "")));

  // ===== Sheet 2: Prayer Law =====
  const prayerRows: Record<string, any>[] = [];
  // From localStorage — keys like no-prayer-plans-YYYY-MM-DD-<nextIdx>
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith("no-prayer-plans-")) continue;
    const stripped = key.replace("no-prayer-plans-", "");
    const m = stripped.match(/^(\d{4}-\d{2}-\d{2})-(\d)$/);
    if (!m) continue;
    const [, date, idxStr] = m;
    const idx = parseInt(idxStr, 10);
    const tasks = safeJson<string[]>(localStorage.getItem(key)) ?? [];
    const filled = tasks.filter(x => x && x.trim());
    if (filled.length === 0) continue;
    const intervalLabel = `${prayerNames[idx]} → ${prayerNames[(idx + 1) % 5]}`;
    filled.forEach((task, i2) => {
      prayerRows.push({
        [t.date]: date,
        [t.interval]: intervalLabel,
        [t.rank]: i2 + 1,
        [t.value]: task,
      });
    });
  }
  // Also include prayer-tagged log entries (archived from /prayer page)
  for (const e of logEntries) {
    if (!isPrayer(e)) continue;
    prayerRows.push({
      [t.date]: e.date ?? "",
      [t.interval]: e.what ?? "",
      [t.rank]: "",
      [t.value]: e.note ?? "",
    });
  }
  prayerRows.sort((a, b) => String(b[t.date] ?? "").localeCompare(String(a[t.date] ?? "")));

  // ===== Sheet 3: Weekly Review =====
  const reviewRows: Record<string, any>[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith("no-review-") || key.includes("autoarchived")) continue;
    const week = key.replace("no-review-", "");
    const answers = safeJson<string[]>(localStorage.getItem(key)) ?? [];
    answers.forEach((a, i2) => {
      if (!a || !a.trim()) return;
      reviewRows.push({
        [t.week]: week,
        [t.rank]: i2 + 1,
        [t.question]: prompts[i2] ?? `#${i2 + 1}`,
        [t.answer]: a.trim(),
      });
    });
  }
  // Also include review-tagged log entries
  for (const e of logEntries) {
    if (!isReview(e)) continue;
    reviewRows.push({
      [t.week]: e.date ?? "",
      [t.rank]: "",
      [t.question]: e.what ?? "",
      [t.answer]: e.note ?? "",
    });
  }
  reviewRows.sort((a, b) => String(b[t.week] ?? "").localeCompare(String(a[t.week] ?? "")));

  // ===== Sheet 4: Permanent Ban List =====
  const banRows: Record<string, any>[] = masterRules.map(r => ({
    [t.what]: r.what ?? "",
    [t.category]: r.category ?? "",
    [t.why]: r.why ?? "",
  }));

  // ===== Build workbook =====
  const wb = XLSXUtils.book_new();

  const mkSheet = (rows: Record<string, any>[], fallbackKeys: string[]) => {
    const data = rows.length ? rows : [fallbackKeys.reduce((acc, k) => ({ ...acc, [k]: "" }), {})];
    const ws = XLSXUtils.json_to_sheet(data);
    ws["!cols"] = autoWidth(data);
    applyRtl(ws, lang);
    return ws;
  };

  XLSXUtils.book_append_sheet(
    wb,
    mkSheet(plansRows, [t.type, t.date, t.what, t.category, t.source, t.riskLevel, t.replacement, t.done, t.hoursRecovered, t.outcome, t.note]),
    t.plans.slice(0, 31),
  );
  XLSXUtils.book_append_sheet(
    wb,
    mkSheet(prayerRows, [t.date, t.interval, t.rank, t.value]),
    t.prayer.slice(0, 31),
  );
  XLSXUtils.book_append_sheet(
    wb,
    mkSheet(reviewRows, [t.week, t.rank, t.question, t.answer]),
    t.review.slice(0, 31),
  );
  XLSXUtils.book_append_sheet(
    wb,
    mkSheet(banRows, [t.what, t.category, t.why]),
    t.bans.slice(0, 31),
  );

  if (lang === "ar") {
    (wb as any).Workbook = { Views: [{ RTL: true }] };
  }

  const dateStr = new Date().toISOString().split("T")[0];
  xlsxWriteFile(wb, `no-export-${dateStr}.xlsx`);
}
