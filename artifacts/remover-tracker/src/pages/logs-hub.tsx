import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import {
  ShieldBan, Star, Zap, Target, RefreshCcw, ScrollText, ArrowRight, ListTodo,
} from "lucide-react";
import { useApp } from "@/lib/AppContext";
import { useAuthFetch } from "@/lib/apiClient";

interface LogCardProps {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  count?: number | null;
  countLabel?: string;
  color: string; // tailwind color utility suffix e.g. "gold", "teal"
  isRTL: boolean;
}

function LogCard({ href, icon: Icon, title, subtitle, count, countLabel, color, isRTL }: LogCardProps) {
  return (
    <Link href={href}>
      <Card className="border-parchment-2 shadow-sm hover:shadow-md hover:border-gold/40 transition-all cursor-pointer group h-full">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${color} shadow-sm`}
            >
              <Icon className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display font-bold text-ink leading-tight">{title}</h3>
                <ArrowRight
                  className={`w-4 h-4 text-muted-foreground group-hover:text-gold transition-colors shrink-0 ${isRTL ? "rotate-180" : ""}`}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{subtitle}</p>
              {count !== null && count !== undefined && (
                <div className="mt-3 flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold tabular text-ink font-display">{count}</span>
                  <span className="text-[11px] text-muted-foreground">{countLabel}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function LogsHub() {
  const { lang } = useApp();
  const authFetch = useAuthFetch();
  const isRTL = lang === "ar";

  // Pull counts for each log type
  const logsQ = useQuery<{ id: number; source?: string; category?: string }[]>({
    queryKey: ["log-entries-counts"],
    queryFn: () => authFetch("/api/log-entries").then(r => r.json()),
    staleTime: 60000,
  });

  const ifThenQ = useQuery<{ id: number }[]>({
    queryKey: ["if-then-plans"],
    queryFn: () => authFetch("/api/if-then").then(r => r.json()),
    staleTime: 60000,
  });

  const prioritiesQ = useQuery<{ date: string; priorities: string[] }[]>({
    queryKey: ["priorities-all"],
    queryFn: () => authFetch("/api/priorities/all").then(r => r.ok ? r.json() : []).catch(() => []),
    staleTime: 60000,
  });

  const masterQ = useQuery<{ id: number }[]>({
    queryKey: ["master-rules"],
    queryFn: () => authFetch("/api/master-rules").then(r => r.json()),
    staleTime: 60000,
  });

  // Counts derived from local storage for prayer plans + reviews
  const prayerCount = (() => {
    let n = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith("no-prayer-plans-")) n++;
    }
    return n;
  })();

  const reviewCount = (() => {
    let n = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith("no-review-") && !k.includes("autoarchived")) n++;
    }
    return n;
  })();

  const logs = logsQ.data ?? [];
  // Removals = log entries that are NOT prayer / review / trigger entries
  const isPrayerEntry = (e: any) =>
    e?.source === "قانون الفرض الجاي" || e?.source === "Next Prayer Law" ||
    e?.category === "قانون الفرض الجاي" || e?.category === "Next Prayer Law";
  const isReviewEntry = (e: any) =>
    e?.source === "مراجعة أسبوعية" || e?.source === "Weekly Review" ||
    e?.category === "مراجعة أسبوعية" || e?.category === "Weekly Review";
  const removalsCount = logs.filter(e => !isPrayerEntry(e) && !isReviewEntry(e)).length;
  const prayerLogCount = logs.filter(isPrayerEntry).length + prayerCount;
  const reviewLogCount = logs.filter(isReviewEntry).length + reviewCount;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
            <ScrollText className="w-5 h-5 text-gold" />
          </div>
          <h2 className="text-3xl font-display font-bold text-ink">
            {isRTL ? "السجلات" : "Logs"}
          </h2>
        </div>
        <p className="text-muted-foreground text-sm max-w-2xl leading-relaxed">
          {isRTL
            ? "كل نوع من القرارات له سجله الخاص. اختر السجل الذي تريد استعراضه."
            : "Each type of decision has its own dedicated log. Pick one to explore."}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <LogCard
          href="/logs/removals"
          icon={ListTodo}
          title={isRTL ? "سجل الإزالة" : "Removals Log"}
          subtitle={isRTL ? "قراراتك في الامتناع عن عادات الهدم." : "Your no-decisions on harmful habits."}
          count={removalsCount}
          countLabel={isRTL ? "قرار" : "entries"}
          color="bg-gold/15 text-gold-deep dark:bg-gold/25 dark:text-gold"
          isRTL={isRTL}
        />
        <LogCard
          href="/logs/prayer"
          icon={Star}
          title={isRTL ? "سجل قانون الفرض الجاي" : "Next Prayer Law Log"}
          subtitle={isRTL ? "خطط ما بعد كل صلاة، مرتبة بالتاريخ." : "Post-prayer plans, ordered by date."}
          count={prayerLogCount}
          countLabel={isRTL ? "خطة محفوظة" : "saved plans"}
          color="bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
          isRTL={isRTL}
        />
        <LogCard
          href="/logs/triggers"
          icon={Zap}
          title={isRTL ? "سجل المحفزات" : "If-Then Log"}
          subtitle={isRTL ? "جميع خطط 'إذا… فإنني…' التي أنشأتها." : "All if-then plans you've created."}
          count={ifThenQ.data?.length ?? 0}
          countLabel={isRTL ? "خطة محفّز" : "trigger plans"}
          color="bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300"
          isRTL={isRTL}
        />
        <LogCard
          href="/logs/priorities"
          icon={Target}
          title={isRTL ? "سجل الأولويات" : "Priorities Log"}
          subtitle={isRTL ? "أولوياتك اليومية حسب التاريخ." : "Your daily priorities by date."}
          count={prioritiesQ.data?.length ?? 0}
          countLabel={isRTL ? "يوم" : "days"}
          color="bg-teal/15 text-teal dark:bg-teal/25 dark:text-teal"
          isRTL={isRTL}
        />
        <LogCard
          href="/logs/bans"
          icon={ShieldBan}
          title={isRTL ? "قائمة المنع الدائمة" : "Permanent Ban List"}
          subtitle={isRTL ? "قواعد لا تُفاوَض عليها." : "Non-negotiable rules."}
          count={masterQ.data?.length ?? 0}
          countLabel={isRTL ? "قاعدة" : "rules"}
          color="bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"
          isRTL={isRTL}
        />
        <LogCard
          href="/logs/review"
          icon={RefreshCcw}
          title={isRTL ? "سجل المراجعات" : "Reviews Log"}
          subtitle={isRTL ? "كل مراجعة أسبوعية كتبتها." : "Every weekly review you've written."}
          count={reviewLogCount}
          countLabel={isRTL ? "مراجعة" : "reviews"}
          color="bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300"
          isRTL={isRTL}
        />
      </div>
    </div>
  );
}
