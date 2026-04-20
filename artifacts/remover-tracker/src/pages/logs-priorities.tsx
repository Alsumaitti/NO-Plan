import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Target, Search, Download } from "lucide-react";
import { exportSingleLog } from "@/lib/exportWorkbook";
import { format, parseISO } from "date-fns";
import { arSA, enUS } from "date-fns/locale";
import { useApp } from "@/lib/AppContext";
import { useAuthFetch } from "@/lib/apiClient";

interface PriorityDay {
  date: string;
  priorities: string[];
}

export default function LogsPriorities() {
  const { lang } = useApp();
  const authFetch = useAuthFetch();
  const locale = lang === "ar" ? arSA : enUS;
  const isRTL = lang === "ar";
  const [q, setQ] = useState("");

  const pQ = useQuery<PriorityDay[]>({
    queryKey: ["priorities-all"],
    queryFn: () => authFetch("/api/priorities/all").then(r => r.ok ? r.json() : []).catch(() => []),
    staleTime: 60000,
  });

  const filtered = useMemo(() => {
    const data = pQ.data ?? [];
    const out = q.trim()
      ? data.filter(d =>
          d.date.includes(q) ||
          d.priorities.some(p => p.toLowerCase().includes(q.toLowerCase())),
        )
      : data;
    return [...out].sort((a, b) => b.date.localeCompare(a.date));
  }, [pQ.data, q]);

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/logs">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <ArrowLeft className={`w-4 h-4 ${isRTL ? "rotate-180" : ""}`} />
          </Button>
        </Link>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Target className="w-5 h-5 text-teal shrink-0" />
          <h2 className="text-2xl font-display font-bold text-ink truncate">
            {isRTL ? "سجل الأولويات اليومية" : "Daily Priorities Log"}
          </h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportSingleLog("priorities", authFetch, lang)}
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
          placeholder={isRTL ? "ابحث بالتاريخ أو الأولوية..." : "Search by date or priority..."}
          className="ps-9"
        />
      </div>

      {filtered.length === 0 ? (
        <Card className="border-dashed border-parchment-2 shadow-none">
          <CardContent className="py-16 text-center">
            <Target className="w-12 h-12 text-teal/40 mx-auto mb-3" />
            <p className="text-muted-foreground font-serif italic">
              {isRTL ? "لم تسجّل أولويات بعد." : "No priorities recorded yet."}
            </p>
            <Link href="/daily">
              <Button variant="outline" className="mt-4">
                {isRTL ? "اذهب لخطة اليوم" : "Go to Daily Plan"}
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(day => (
            <Card key={day.date} className="border-parchment-2 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-teal/15 flex items-center justify-center">
                    <Target className="w-4 h-4 text-teal" />
                  </div>
                  <p className="font-semibold text-ink">
                    {format(parseISO(day.date), "PPP", { locale })}
                  </p>
                </div>
                <ol className="space-y-2 ps-1">
                  {day.priorities.map((p, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="w-5 h-5 rounded-full bg-teal/20 text-teal text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span className="text-foreground leading-relaxed min-w-0 break-words">{p}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
