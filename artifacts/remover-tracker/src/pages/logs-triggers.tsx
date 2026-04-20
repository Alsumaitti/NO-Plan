import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Zap, Search } from "lucide-react";
import { format, parseISO } from "date-fns";
import { arSA, enUS } from "date-fns/locale";
import { useApp } from "@/lib/AppContext";
import { useAuthFetch } from "@/lib/apiClient";

interface IfThenPlan {
  id: number;
  trigger: string;
  response: string;
  category?: string | null;
  createdAt?: string;
  date?: string;
}

export default function LogsTriggers() {
  const { lang } = useApp();
  const authFetch = useAuthFetch();
  const locale = lang === "ar" ? arSA : enUS;
  const isRTL = lang === "ar";
  const [q, setQ] = useState("");

  const plansQ = useQuery<IfThenPlan[]>({
    queryKey: ["if-then-plans"],
    queryFn: () => authFetch("/api/if-then").then(r => r.json()),
    staleTime: 60000,
  });

  const grouped = useMemo(() => {
    const data = plansQ.data ?? [];
    const filtered = q.trim()
      ? data.filter(p =>
          p.trigger.toLowerCase().includes(q.toLowerCase()) ||
          p.response.toLowerCase().includes(q.toLowerCase()) ||
          (p.category ?? "").toLowerCase().includes(q.toLowerCase()),
        )
      : data;
    const byDate = new Map<string, IfThenPlan[]>();
    for (const p of filtered) {
      const d = (p.date ?? p.createdAt ?? "").slice(0, 10) || "—";
      if (!byDate.has(d)) byDate.set(d, []);
      byDate.get(d)!.push(p);
    }
    return Array.from(byDate.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [plansQ.data, q]);

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/logs">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <ArrowLeft className={`w-4 h-4 ${isRTL ? "rotate-180" : ""}`} />
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-sky-600" />
          <h2 className="text-2xl font-display font-bold text-ink">
            {isRTL ? "سجل المحفزات (إذا-فإنني)" : "If-Then Triggers Log"}
          </h2>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder={isRTL ? "ابحث عن محفز أو استجابة..." : "Search trigger or response..."}
          className="ps-9"
        />
      </div>

      {grouped.length === 0 ? (
        <Card className="border-dashed border-parchment-2 shadow-none">
          <CardContent className="py-16 text-center">
            <Zap className="w-12 h-12 text-sky-400/50 mx-auto mb-3" />
            <p className="text-muted-foreground font-serif italic">
              {isRTL ? "لا توجد خطط محفّز بعد." : "No if-then plans yet."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {grouped.map(([date, plans]) => (
            <div key={date} className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground px-1">
                {date !== "—" ? format(parseISO(date), "PPP", { locale }) : "—"}
                <span className="ms-2 text-[10px] text-muted-foreground/70">({plans.length})</span>
              </h3>
              <div className="space-y-2">
                {plans.map(p => (
                  <Card key={p.id} className="border-parchment-2 shadow-sm">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="text-[10px] font-bold text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-950/40 px-2 py-0.5 rounded shrink-0 mt-0.5">
                          {isRTL ? "إذا" : "IF"}
                        </span>
                        <p className="text-sm text-foreground leading-relaxed">{p.trigger}</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-[10px] font-bold text-teal-700 dark:text-teal-300 bg-teal-100 dark:bg-teal-950/40 px-2 py-0.5 rounded shrink-0 mt-0.5">
                          {isRTL ? "فإنني" : "THEN"}
                        </span>
                        <p className="text-sm text-foreground leading-relaxed">{p.response}</p>
                      </div>
                      {p.category && (
                        <p className="text-[11px] text-muted-foreground pt-1">
                          {isRTL ? "الفئة:" : "Category:"} {p.category}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
