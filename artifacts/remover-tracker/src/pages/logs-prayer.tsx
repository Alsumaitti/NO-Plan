import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Star, Search, ListTodo, Download } from "lucide-react";
import { exportSingleLog } from "@/lib/exportWorkbook";
import { format, parseISO } from "date-fns";
import { arSA, enUS } from "date-fns/locale";
import { useApp } from "@/lib/AppContext";
import { useAuthFetch } from "@/lib/apiClient";

const PRAYERS_AR = ["الفجر", "الظهر", "العصر", "المغرب", "العشاء"];
const PRAYERS_EN = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

interface PrayerEntry {
  date: string;
  intervalLabel: string;
  tasks: string[];
  source: "local" | "server";
  serverId?: number;
  note?: string;
}

export default function LogsPrayer() {
  const { lang } = useApp();
  const authFetch = useAuthFetch();
  const locale = lang === "ar" ? arSA : enUS;
  const isRTL = lang === "ar";
  const prayerNames = isRTL ? PRAYERS_AR : PRAYERS_EN;
  const [q, setQ] = useState("");

  // Archived prayer logs from server (entries tagged with prayer source/category)
  const serverQ = useQuery<{
    id: number; date: string; what: string; note?: string | null;
    source?: string | null; category?: string | null;
  }[]>({
    queryKey: ["log-entries-prayer"],
    queryFn: () => authFetch("/api/log-entries").then(r => r.json()),
    staleTime: 60000,
  });

  const entries = useMemo<PrayerEntry[]>(() => {
    const out: PrayerEntry[] = [];
    // Local storage plans: key shape `no-prayer-plans-YYYY-MM-DD-<idx>`
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k?.startsWith("no-prayer-plans-")) continue;
      const m = k.slice("no-prayer-plans-".length).match(/^(\d{4}-\d{2}-\d{2})-(\d)$/);
      if (!m) continue;
      const [, date, idxStr] = m;
      const idx = parseInt(idxStr, 10);
      try {
        const raw = localStorage.getItem(k);
        const arr = raw ? JSON.parse(raw) : [];
        const tasks = Array.isArray(arr) ? arr.filter((t: string) => t?.trim()) : [];
        if (!tasks.length) continue;
        out.push({
          date,
          intervalLabel: `${prayerNames[idx]} → ${prayerNames[(idx + 1) % 5]}`,
          tasks,
          source: "local",
        });
      } catch { /* ignore */ }
    }
    // Server-archived prayer entries
    const server = serverQ.data ?? [];
    for (const e of server) {
      const isPrayer =
        e.source === "قانون الفرض الجاي" || e.source === "Next Prayer Law" ||
        e.category === "قانون الفرض الجاي" || e.category === "Next Prayer Law";
      if (!isPrayer) continue;
      const tasks = (e.note ?? "").split("\n").map(l => l.replace(/^\d+\.\s*/, "").trim()).filter(Boolean);
      // Try to extract interval from `what`
      const label = e.what?.replace(/^.*?:\s*/, "") ?? "";
      out.push({
        date: e.date,
        intervalLabel: label,
        tasks,
        source: "server",
        serverId: e.id,
        note: e.note ?? undefined,
      });
    }
    // Sort desc by date
    return out.sort((a, b) => b.date.localeCompare(a.date));
  }, [serverQ.data, prayerNames]);

  const filtered = q.trim()
    ? entries.filter(e =>
        e.date.includes(q) ||
        e.intervalLabel.toLowerCase().includes(q.toLowerCase()) ||
        e.tasks.some(t => t.toLowerCase().includes(q.toLowerCase())),
      )
    : entries;

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/logs">
          <Button variant="ghost" size="icon" className="h-9 w-9" aria-label={isRTL ? "رجوع" : "Back"}>
            <ArrowLeft className={`w-4 h-4 ${isRTL ? "rotate-180" : ""}`} />
          </Button>
        </Link>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Star className="w-5 h-5 text-amber-600 shrink-0" />
          <h2 className="text-2xl font-display font-bold text-ink truncate">
            {isRTL ? "سجل قانون الفرض الجاي" : "Next Prayer Law Log"}
          </h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportSingleLog("prayer", authFetch, lang)}
          className="gap-1.5 shrink-0"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">{isRTL ? "تحميل" : "Download"}</span>
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder={isRTL ? "ابحث بالتاريخ أو الفترة أو المهمة..." : "Search by date, interval, or task..."}
          className="ps-9"
        />
      </div>

      {filtered.length === 0 ? (
        <Card className="border-dashed border-parchment-2 shadow-none">
          <CardContent className="py-16 text-center">
            <Star className="w-12 h-12 text-amber-400/50 mx-auto mb-3" />
            <p className="text-muted-foreground font-serif italic">
              {isRTL ? "لا توجد خطط محفوظة بعد." : "No saved plans yet."}
            </p>
            <Link href="/prayer">
              <Button variant="outline" className="mt-4">
                {isRTL ? "اذهب لصفحة قانون الفرض الجاي" : "Go to Next Prayer Law"}
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((e, i) => (
            <Card key={`${e.date}-${e.intervalLabel}-${i}`} className="border-parchment-2 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center shrink-0">
                      <Star className="w-4 h-4 text-amber-700 dark:text-amber-300" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-ink truncate">{e.intervalLabel}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(e.date), "PPP", { locale })}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] uppercase tracking-wide font-bold px-2 py-0.5 rounded ${
                      e.source === "server"
                        ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {e.source === "server" ? (isRTL ? "مُرحَّل" : "archived") : (isRTL ? "محلي" : "local")}
                  </span>
                </div>
                <ul className="space-y-1.5 ps-1">
                  {e.tasks.map((t, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-foreground leading-relaxed">
                      <ListTodo className="w-3.5 h-3.5 mt-1 text-amber-600 shrink-0" />
                      <span className="min-w-0 break-words">{t}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
