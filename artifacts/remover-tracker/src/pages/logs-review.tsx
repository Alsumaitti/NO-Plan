import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, RefreshCcw, Search, Download } from "lucide-react";
import { exportSingleLog } from "@/lib/exportWorkbook";
import { format, parseISO } from "date-fns";
import { arSA, enUS } from "date-fns/locale";
import { useApp } from "@/lib/AppContext";
import { useAuthFetch } from "@/lib/apiClient";

interface ReviewEntry {
  date: string;
  body: string;
  source: "local" | "server";
  serverId?: number;
}

export default function LogsReview() {
  const { lang } = useApp();
  const authFetch = useAuthFetch();
  const locale = lang === "ar" ? arSA : enUS;
  const isRTL = lang === "ar";
  const [q, setQ] = useState("");

  const serverQ = useQuery<{
    id: number; date: string; what: string; note?: string | null;
    source?: string | null; category?: string | null;
  }[]>({
    queryKey: ["log-entries-review"],
    queryFn: () => authFetch("/api/log-entries").then(r => r.json()),
    staleTime: 60000,
  });

  const entries = useMemo<ReviewEntry[]>(() => {
    const out: ReviewEntry[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k?.startsWith("no-review-") || k.includes("autoarchived")) continue;
      const m = k.slice("no-review-".length).match(/^(\d{4}-\d{2}-\d{2})/);
      if (!m) continue;
      try {
        const raw = localStorage.getItem(k);
        if (!raw?.trim()) continue;
        out.push({ date: m[1], body: raw, source: "local" });
      } catch { /* ignore */ }
    }
    const server = serverQ.data ?? [];
    for (const e of server) {
      const isReview =
        e.source === "مراجعة أسبوعية" || e.source === "Weekly Review" ||
        e.category === "مراجعة أسبوعية" || e.category === "Weekly Review";
      if (!isReview) continue;
      out.push({
        date: e.date,
        body: e.note ?? e.what ?? "",
        source: "server",
        serverId: e.id,
      });
    }
    return out.sort((a, b) => b.date.localeCompare(a.date));
  }, [serverQ.data]);

  const filtered = q.trim()
    ? entries.filter(e =>
        e.date.includes(q) || e.body.toLowerCase().includes(q.toLowerCase()),
      )
    : entries;

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/logs">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <ArrowLeft className={`w-4 h-4 ${isRTL ? "rotate-180" : ""}`} />
          </Button>
        </Link>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <RefreshCcw className="w-5 h-5 text-purple-600 shrink-0" />
          <h2 className="text-2xl font-display font-bold text-ink truncate">
            {isRTL ? "سجل المراجعات الأسبوعية" : "Weekly Reviews Log"}
          </h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportSingleLog("review", authFetch, lang)}
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
          placeholder={isRTL ? "ابحث في المراجعات..." : "Search reviews..."}
          className="ps-9"
        />
      </div>

      {filtered.length === 0 ? (
        <Card className="border-dashed border-parchment-2 shadow-none">
          <CardContent className="py-16 text-center">
            <RefreshCcw className="w-12 h-12 text-purple-400/50 mx-auto mb-3" />
            <p className="text-muted-foreground font-serif italic">
              {isRTL ? "لا توجد مراجعات بعد." : "No reviews yet."}
            </p>
            <Link href="/review">
              <Button variant="outline" className="mt-4">
                {isRTL ? "اكتب مراجعة جديدة" : "Write a Review"}
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((e, i) => (
            <Card key={`${e.date}-${e.source}-${i}`} className="border-parchment-2 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-950/40 flex items-center justify-center shrink-0">
                      <RefreshCcw className="w-4 h-4 text-purple-700 dark:text-purple-300" />
                    </div>
                    <p className="font-semibold text-ink">
                      {format(parseISO(e.date), "PPP", { locale })}
                    </p>
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
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap break-words">
                  {e.body}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
