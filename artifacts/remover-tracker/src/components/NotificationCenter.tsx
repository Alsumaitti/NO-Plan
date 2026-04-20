import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Bell, AlertCircle, Target, Zap, CheckCircle2, ShieldBan, Flame,
  Clock, TrendingUp, Trophy, Lightbulb, Sunrise, Moon, CalendarClock,
  Activity, Sparkles, AlertTriangle, Star,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/lib/AppContext";
import { useAuthFetch } from "@/lib/apiClient";
import { Button } from "./ui/button";

type Tone = "warn" | "info" | "success" | "danger" | "celebrate";

interface Notif {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  href: string;
  tone: Tone;
  priority: number; // lower = higher priority, for sort
}

const today = () => new Date().toISOString().split("T")[0];
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
};

const PRAYERS = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"] as const;
const PRAYERS_AR = ["الفجر", "الظهر", "العصر", "المغرب", "العشاء"];

function toMins(s: string): number {
  const [h, m] = s.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function fmtMins(n: number, isRTL: boolean): string {
  if (n < 60) return isRTL ? `${n} دقيقة` : `${n} min`;
  const h = Math.floor(n / 60), m = n % 60;
  if (isRTL) return m ? `${h} س ${m} د` : `${h} ساعة`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function NotificationCenter() {
  const { lang } = useApp();
  const authFetch = useAuthFetch();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const isRTL = lang === "ar";

  // Force re-evaluation every minute when open (for time-of-day and prayer windows)
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(id);
  }, [open]);

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const d = today();

  // ===== Data =====
  const itemsQ = useQuery<{ id: number; what: string; done: boolean; riskLevel?: string | null; category?: string | null }[]>({
    queryKey: ["daily-items", d],
    queryFn: () => authFetch(`/api/daily-items?date=${d}`).then(r => r.json()),
    staleTime: 30000,
  });

  const prioritiesQ = useQuery<{ priorities: string[] }>({
    queryKey: ["priorities", d],
    queryFn: () => authFetch(`/api/priorities?date=${d}`).then(r => r.json()),
    staleTime: 30000,
  });

  const ifThenQ = useQuery<{ id: number; date: string }[]>({
    queryKey: ["if-then-plans"],
    queryFn: () => authFetch("/api/if-then").then(r => r.json()),
    staleTime: 60000,
  });

  const masterQ = useQuery<{ id: number; what: string; category?: string | null }[]>({
    queryKey: ["master-rules"],
    queryFn: () => authFetch("/api/master-rules").then(r => r.json()),
    staleTime: 120000,
  });

  // Recent log entries (last 14 days) — for pattern detection
  const logQ = useQuery<{
    id: number; date: string; what: string; outcome: string;
    hoursRecovered?: number | null; category?: string | null; source?: string | null;
  }[]>({
    queryKey: ["log-entries-recent"],
    queryFn: () => authFetch(`/api/log-entries?from=${daysAgo(14)}&to=${d}`).then(r => r.json()),
    staleTime: 60000,
  });

  const statsQ = useQuery<{ streak?: number; hoursRecovered?: number; held?: number; caved?: number }>({
    queryKey: ["dashboard-stats"],
    queryFn: () => authFetch("/api/dashboard/stats").then(r => r.json()),
    staleTime: 60000,
  });

  // ===== Prayer times from localStorage (cached from /prayer page) =====
  const prayerCache = useMemo(() => {
    try {
      const loc = JSON.parse(localStorage.getItem("no-prayer-location") ?? "null");
      const timings = JSON.parse(localStorage.getItem(`no-prayer-timings-${d}`) ?? "null");
      return { loc, timings };
    } catch { return { loc: null, timings: null }; }
  }, [d]);

  // ===== Build notifications =====
  const notifs = useMemo<Notif[]>(() => {
    const list: Notif[] = [];
    const items = itemsQ.data ?? [];
    const unfinished = items.filter(i => !i.done);
    const highRiskPending = unfinished.filter(i => (i.riskLevel ?? "").toLowerCase() === "high");
    const priorities = (prioritiesQ.data?.priorities ?? []).filter(p => p.trim());
    const ifThenToday = (ifThenQ.data ?? []).filter(p => p.date === d);
    const masterRules = masterQ.data ?? [];
    const logs = logQ.data ?? [];
    const stats = statsQ.data ?? {};

    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay(); // 0=Sun, 5=Fri, 6=Sat
    const nowMins = hour * 60 + now.getMinutes();

    // ---- 1. CRITICAL: End-of-day unfinished items (after 20:00) ----
    if (hour >= 20 && unfinished.length > 0) {
      list.push({
        id: "eod-push",
        icon: Clock,
        tone: "danger",
        priority: 1,
        title: isRTL
          ? `${unfinished.length} بنود متبقية قبل نهاية اليوم`
          : `${unfinished.length} items left before day ends`,
        body: isRTL
          ? `آخر ${24 - hour} ساعات — لا تتراجع الآن.`
          : `${24 - hour}h remaining — don't cave now.`,
        href: "/daily",
      });
    }

    // ---- 2. CRITICAL: High-risk items still pending ----
    if (highRiskPending.length > 0) {
      list.push({
        id: "high-risk",
        icon: AlertTriangle,
        tone: "danger",
        priority: 2,
        title: isRTL
          ? `⚠ بنود خطورة عالية لم تُنجز`
          : `High-risk items pending`,
        body: highRiskPending.slice(0, 2).map(i => i.what).join(" • "),
        href: "/daily",
      });
    }

    // ---- 3. CRITICAL: Prayer window imminent (within 30 min) ----
    if (prayerCache.timings) {
      const t = prayerCache.timings;
      const prayerList = [t.Fajr, t.Dhuhr, t.Asr, t.Maghrib, t.Isha];
      for (let i = 0; i < 5; i++) {
        if (!prayerList[i]) continue;
        const pm = toMins(prayerList[i]);
        const diff = pm - nowMins;
        if (diff > 0 && diff <= 30) {
          const pName = isRTL ? PRAYERS_AR[i] : PRAYERS[i];
          // Check if plan exists for this upcoming interval
          const planKey = `no-prayer-plans-${d}-${i}`;
          const hasPlan = !!localStorage.getItem(planKey);
          list.push({
            id: `prayer-${i}`,
            icon: Star,
            tone: hasPlan ? "info" : "warn",
            priority: 3,
            title: isRTL
              ? `${pName} بعد ${fmtMins(diff, true)}`
              : `${pName} in ${fmtMins(diff, false)}`,
            body: hasPlan
              ? (isRTL ? "راجع خطتك للفترة القادمة." : "Review your plan for the next interval.")
              : (isRTL ? "لم تضع خطة لما بعد الصلاة." : "No plan set for after this prayer."),
            href: "/prayer",
          });
          break; // only show the imminent one
        }
      }
    }

    // ---- 4. Morning intention (before 9am, no plan) ----
    if (hour < 9 && items.length === 0) {
      list.push({
        id: "morning",
        icon: Sunrise,
        tone: "info",
        priority: 4,
        title: isRTL ? "ابدأ يومك بنيّة واضحة" : "Start your day with intention",
        body: isRTL ? "ما الذي ستمتنع عنه اليوم؟" : "What will you say no to today?",
        href: "/daily",
      });
    }

    // ---- 5. No plan today (non-morning) ----
    if (hour >= 9 && items.length === 0) {
      list.push({
        id: "no-plan",
        icon: AlertCircle,
        tone: "warn",
        priority: 5,
        title: isRTL ? "لم تضع خطة اليوم بعد" : "No plan set for today",
        body: isRTL ? "ابدأ بإضافة أول بند في قائمة الامتناع." : "Add your first item to avoid.",
        href: "/daily",
      });
    }

    // ---- 6. Unfinished items (mid-day reminder) ----
    if (hour >= 9 && hour < 20 && unfinished.length > 0 && highRiskPending.length === 0) {
      list.push({
        id: "unfinished",
        icon: AlertCircle,
        tone: "warn",
        priority: 6,
        title: isRTL
          ? `${unfinished.length} بنود لم تكتمل بعد`
          : `${unfinished.length} unfinished item${unfinished.length === 1 ? "" : "s"}`,
        body: unfinished.slice(0, 2).map(i => i.what).join(" • "),
        href: "/daily",
      });
    }

    // ---- 7. Cave streak — 3+ caves in a row (last 5 logs) ----
    const recentCaves = logs.slice(0, 5).filter(l => l.outcome === "Caved");
    if (recentCaves.length >= 3 && logs.slice(0, 3).every(l => l.outcome === "Caved")) {
      list.push({
        id: "cave-streak",
        icon: Activity,
        tone: "danger",
        priority: 2,
        title: isRTL ? "٣ تراجعات متتالية" : "3 caves in a row",
        body: isRTL
          ? "ما الذي تغيّر؟ افتح المراجعة واكتب السبب."
          : "What changed? Open Review and write the cause.",
        href: "/review",
      });
    }

    // ---- 8. Suggest permanent ban: same "what" caved 3+ times in 14 days ----
    const caveCount: Record<string, number> = {};
    logs.forEach(l => {
      if (l.outcome === "Caved" && l.what) {
        caveCount[l.what] = (caveCount[l.what] ?? 0) + 1;
      }
    });
    const repeatOffender = Object.entries(caveCount).find(([what, n]) =>
      n >= 3 && !masterRules.some(m => m.what === what)
    );
    if (repeatOffender) {
      list.push({
        id: `ban-suggest-${repeatOffender[0]}`,
        icon: ShieldBan,
        tone: "warn",
        priority: 7,
        title: isRTL
          ? `تراجعت ${repeatOffender[1]} مرات عن نفس الشيء`
          : `Caved ${repeatOffender[1]}× on the same item`,
        body: isRTL
          ? `أضِف "${repeatOffender[0]}" إلى قائمة المنع الدائمة.`
          : `Add "${repeatOffender[0]}" to your permanent ban list.`,
        href: "/master",
      });
    }

    // ---- 9. Streak milestones ----
    const streak = stats.streak ?? 0;
    const streakMilestones = [3, 7, 14, 30, 60, 100, 365];
    if (streakMilestones.includes(streak)) {
      list.push({
        id: `streak-${streak}`,
        icon: Trophy,
        tone: "celebrate",
        priority: 1,
        title: isRTL ? `🏆 ${streak} أيام متواصلة!` : `🏆 ${streak}-day streak!`,
        body: isRTL ? "إنجاز نادر. حافظ على الزخم." : "Rare achievement. Keep the momentum.",
        href: "/",
      });
    } else if (streak >= 2 && hour >= 18) {
      // Don't break the streak warning
      list.push({
        id: "streak-guard",
        icon: Flame,
        tone: "info",
        priority: 6,
        title: isRTL ? `سلسلة ${streak} أيام قيد التهديد` : `${streak}-day streak at stake`,
        body: isRTL ? "أكمل بنود اليوم لتحافظ عليها." : "Finish today's items to preserve it.",
        href: "/daily",
      });
    }

    // ---- 10. Hours recovered milestone ----
    const totalHours = stats.hoursRecovered ?? 0;
    const hoursMilestones = [10, 25, 50, 100, 250, 500, 1000];
    const recentMilestone = hoursMilestones.reverse().find(m => totalHours >= m && totalHours < m + 5);
    if (recentMilestone) {
      list.push({
        id: `hours-${recentMilestone}`,
        icon: TrendingUp,
        tone: "celebrate",
        priority: 3,
        title: isRTL ? `🎯 تجاوزت ${recentMilestone} ساعة` : `🎯 Past ${recentMilestone}h recovered`,
        body: isRTL
          ? `المجموع: ${totalHours.toFixed(1)} ساعة استردتها من "لا".`
          : `Total: ${totalHours.toFixed(1)}h reclaimed from saying no.`,
        href: "/",
      });
    }

    // ---- 11. Weekly review due (Saturday or Sunday, no review yet) ----
    if (dayOfWeek === 6 || dayOfWeek === 0) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (dayOfWeek === 6 ? 0 : 1));
      const weekKey = weekStart.toISOString().split("T")[0];
      const reviewRaw = localStorage.getItem(`no-review-${weekKey}`);
      let hasReview = false;
      if (reviewRaw) {
        try {
          const arr = JSON.parse(reviewRaw);
          hasReview = Array.isArray(arr) && arr.some((a: string) => a?.trim());
        } catch { /* ignore */ }
      }
      if (!hasReview) {
        list.push({
          id: "review-due",
          icon: CalendarClock,
          tone: "info",
          priority: 4,
          title: isRTL ? "المراجعة الأسبوعية بانتظارك" : "Weekly review awaits",
          body: isRTL ? "تأمّل في قرارات الأسبوع." : "Reflect on this week's decisions.",
          href: "/review",
        });
      }
    }

    // ---- 12. Priorities incomplete ----
    if (priorities.length < 3 && hour < 20) {
      list.push({
        id: "priorities",
        icon: Target,
        tone: "info",
        priority: 8,
        title: isRTL ? "حدّد أولوياتك اليوم" : "Set today's priorities",
        body: isRTL ? `أنجزت ${priorities.length} من 3` : `${priorities.length} of 3 set`,
        href: "/daily",
      });
    }

    // ---- 13. If-then missing (only shown early in day) ----
    if (ifThenToday.length === 0 && hour < 12) {
      list.push({
        id: "if-then",
        icon: Zap,
        tone: "info",
        priority: 9,
        title: isRTL ? "لا توجد خطط محفزات" : "No if-then plans",
        body: isRTL ? "أضف 'إذا-فإني' لحماية قرارك." : "Add an if-then to protect your decision.",
        href: "/daily",
      });
    }

    // ---- 14. Empty master list (only if new-ish user: <7 log entries) ----
    if (masterRules.length === 0 && logs.length < 7) {
      list.push({
        id: "master",
        icon: ShieldBan,
        tone: "info",
        priority: 10,
        title: isRTL ? "ابنِ قائمة المنع الدائم" : "Build your permanent ban list",
        body: isRTL ? "قواعد لا تفاوض عليها." : "Non-negotiable rules.",
        href: "/master",
      });
    }

    // ---- 15. Inactivity warning (no logs in 3+ days) ----
    if (logs.length > 0) {
      const lastLogDate = logs[0]?.date;
      if (lastLogDate) {
        const daysSince = Math.floor(
          (new Date(d).getTime() - new Date(lastLogDate).getTime()) / 86400000,
        );
        if (daysSince >= 3) {
          list.push({
            id: "inactivity",
            icon: Moon,
            tone: "warn",
            priority: 5,
            title: isRTL ? `${daysSince} أيام بدون تسجيل` : `${daysSince} days without logging`,
            body: isRTL ? "عُد إلى النظام. سجّل قراراً." : "Come back. Log one decision.",
            href: "/tracker",
          });
        }
      }
    }

    // ---- 16. All items held today (celebration) ----
    if (items.length > 0 && unfinished.length === 0) {
      list.push({
        id: "all-done",
        icon: CheckCircle2,
        tone: "celebrate",
        priority: 5,
        title: isRTL ? "أكملت جميع بنود اليوم!" : "All today's items done!",
        body: isRTL ? "استمر — يوم قوي." : "Keep going — strong day.",
        href: "/daily",
      });
    }

    // ---- 17. Perfect week detected (7 consecutive Held days) ----
    const byDate: Record<string, string[]> = {};
    logs.forEach(l => {
      if (!byDate[l.date]) byDate[l.date] = [];
      byDate[l.date].push(l.outcome);
    });
    const last7 = Array.from({ length: 7 }, (_, i) => daysAgo(i));
    const perfectWeek = last7.every(date => {
      const outcomes = byDate[date];
      return outcomes && outcomes.length > 0 && outcomes.every(o => o === "Held");
    });
    if (perfectWeek) {
      list.push({
        id: "perfect-week",
        icon: Sparkles,
        tone: "celebrate",
        priority: 2,
        title: isRTL ? "✨ أسبوع مثالي" : "✨ Perfect week",
        body: isRTL ? "٧ أيام متتالية بدون تراجع." : "7 consecutive days without caving.",
        href: "/",
      });
    }

    // ---- 18. Category imbalance hint ----
    const catCounts: Record<string, number> = {};
    items.forEach(i => {
      const c = i.category ?? "other";
      catCounts[c] = (catCounts[c] ?? 0) + 1;
    });
    const totalItems = items.length;
    if (totalItems >= 4) {
      const dominant = Object.entries(catCounts).find(([, n]) => n / totalItems >= 0.75);
      if (dominant) {
        list.push({
          id: "cat-balance",
          icon: Lightbulb,
          tone: "info",
          priority: 11,
          title: isRTL ? "خطة اليوم متركّزة في فئة واحدة" : "Today's plan is single-category",
          body: isRTL
            ? `${dominant[1]} من ${totalItems} في "${dominant[0]}"`
            : `${dominant[1]} of ${totalItems} in "${dominant[0]}"`,
          href: "/daily",
        });
      }
    }

    // Sort by priority (ascending = more urgent first)
    list.sort((a, b) => a.priority - b.priority);
    return list;
  }, [itemsQ.data, prioritiesQ.data, ifThenQ.data, masterQ.data, logQ.data, statsQ.data, prayerCache, isRTL, d]);

  const urgentCount = notifs.filter(n => n.tone === "danger" || n.tone === "warn").length;

  const toneClass = (t: Tone) => {
    if (t === "danger") return "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300";
    if (t === "warn") return "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300";
    if (t === "success") return "bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300";
    if (t === "celebrate") return "bg-gold/15 dark:bg-gold/25 text-gold-deep dark:text-gold";
    return "bg-sky-100 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300";
  };

  const badgeColor = notifs.some(n => n.tone === "danger")
    ? "bg-red-600"
    : urgentCount > 0
      ? "bg-amber-500"
      : "bg-sky-500";

  return (
    <div ref={rootRef} className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 relative"
        onClick={() => setOpen(v => !v)}
        aria-label={isRTL ? "الإشعارات" : "Notifications"}
      >
        <Bell className="w-4 h-4" />
        {urgentCount > 0 && (
          <span className={`absolute top-0.5 ${isRTL ? "left-0.5" : "right-0.5"} min-w-[16px] h-4 px-1 rounded-full ${badgeColor} text-white text-[10px] font-bold flex items-center justify-center tabular leading-none shadow-sm`}>
            {urgentCount}
          </span>
        )}
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            style={{ width: "min(380px, calc(100vw - 24px))" }}
            className={[
              // Mobile: fixed to viewport edge under top bar
              "fixed top-14 sm:top-auto",
              isRTL ? "left-3 sm:left-auto" : "right-3 sm:right-auto",
              // Desktop: absolute anchored to bell's root div so it opens toward main
              "sm:absolute sm:top-full sm:mt-2",
              // LTR sidebar on left → dropdown extends RIGHT from the bell
              // RTL sidebar on right → dropdown extends LEFT from the bell
              isRTL ? "sm:right-0" : "sm:left-0",
              "bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-[60]",
            ].join(" ")}
          >
            <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-gradient-to-b from-muted/40 to-transparent">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {isRTL ? "مركز الإشعارات" : "Notifications"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {isRTL
                    ? urgentCount > 0
                      ? `${urgentCount} يحتاج انتباهك`
                      : "كل شيء تحت السيطرة"
                    : urgentCount > 0
                      ? `${urgentCount} need${urgentCount === 1 ? "s" : ""} attention`
                      : "All clear"}
                </p>
              </div>
              <span className="text-xs text-muted-foreground tabular bg-muted px-2 py-0.5 rounded-full">
                {notifs.length}
              </span>
            </div>
            <div className="max-h-[70vh] sm:max-h-[28rem] overflow-y-auto overscroll-contain">
              {notifs.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-green-100 dark:bg-green-950/40 flex items-center justify-center">
                    <CheckCircle2 className="w-7 h-7 text-green-600 dark:text-green-400" />
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    {isRTL ? "كل شيء هادئ" : "All quiet"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isRTL ? "لا تنبيهات حالياً." : "No alerts right now."}
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {notifs.map(n => (
                    <li key={n.id}>
                      <Link href={n.href}>
                        <button
                          onClick={() => setOpen(false)}
                          className="w-full flex items-start gap-3 px-3 py-3 hover:bg-muted/50 active:bg-muted transition-colors text-start"
                        >
                          <div className={`w-9 h-9 rounded-full ${toneClass(n.tone)} flex items-center justify-center shrink-0 shadow-sm`}>
                            <n.icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0 break-words">
                            <p className="text-sm font-semibold text-foreground leading-snug">{n.title}</p>
                            <p className="text-xs text-muted-foreground mt-1 leading-snug">{n.body}</p>
                          </div>
                        </button>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
