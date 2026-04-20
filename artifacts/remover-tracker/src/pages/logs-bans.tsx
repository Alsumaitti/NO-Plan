import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ShieldBan, Search, Download } from "lucide-react";
import { exportSingleLog } from "@/lib/exportWorkbook";
import { format, parseISO } from "date-fns";
import { arSA, enUS } from "date-fns/locale";
import { useApp } from "@/lib/AppContext";
import { useAuthFetch } from "@/lib/apiClient";

interface MasterRule {
  id: number;
  what: string;
  category?: string | null;
  why?: string | null;
  createdAt?: string;
}

export default function LogsBans() {
  const { lang } = useApp();
  const authFetch = useAuthFetch();
  const locale = lang === "ar" ? arSA : enUS;
  const isRTL = lang === "ar";
  const [q, setQ] = useState("");

  const rulesQ = useQuery<MasterRule[]>({
    queryKey: ["master-rules"],
    queryFn: () => authFetch("/api/master-rules").then(r => r.json()),
    staleTime: 60000,
  });

  const filtered = useMemo(() => {
    const data = rulesQ.data ?? [];
    const out = q.trim()
      ? data.filter(r =>
          r.what.toLowerCase().includes(q.toLowerCase()) ||
          (r.why ?? "").toLowerCase().includes(q.toLowerCase()) ||
          (r.category ?? "").toLowerCase().includes(q.toLowerCase()),
        )
      : data;
    return [...out].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  }, [rulesQ.data, q]);

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/logs">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <ArrowLeft className={`w-4 h-4 ${isRTL ? "rotate-180" : ""}`} />
          </Button>
        </Link>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <ShieldBan className="w-5 h-5 text-red-600 shrink-0" />
          <h2 className="text-2xl font-display font-bold text-ink truncate">
            {isRTL ? "قائمة المنع الدائمة" : "Permanent Ban List"}
          </h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportSingleLog("bans", authFetch, lang)}
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
          placeholder={isRTL ? "ابحث في القواعد..." : "Search rules..."}
          className="ps-9"
        />
      </div>

      {filtered.length === 0 ? (
        <Card className="border-dashed border-parchment-2 shadow-none">
          <CardContent className="py-16 text-center">
            <ShieldBan className="w-12 h-12 text-red-400/50 mx-auto mb-3" />
            <p className="text-muted-foreground font-serif italic">
              {isRTL ? "لا توجد قواعد منع بعد." : "No ban rules yet."}
            </p>
            <Link href="/master">
              <Button variant="outline" className="mt-4">
                {isRTL ? "أضف قاعدة منع" : "Add a Rule"}
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((r, i) => (
            <Card key={r.id} className="border-parchment-2 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-red-700 dark:text-red-300">{i + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="font-semibold text-ink leading-relaxed break-words">{r.what}</p>
                    {r.category && (
                      <p className="text-[11px] text-muted-foreground/90">
                        {isRTL ? "الفئة: " : "Category: "}{r.category}
                      </p>
                    )}
                    {r.why && (
                      <p className="text-sm text-muted-foreground leading-relaxed italic break-words">
                        {isRTL ? "السبب: " : "Reason: "}{r.why}
                      </p>
                    )}
                    {r.createdAt && (
                      <p className="text-[11px] text-muted-foreground/80">
                        {format(parseISO(r.createdAt), "PPP", { locale })}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
