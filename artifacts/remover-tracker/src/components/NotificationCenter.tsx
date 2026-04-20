import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Bell, AlertCircle, Target, Zap, CheckCircle2, ShieldBan } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/lib/AppContext";
import { useAuthFetch } from "@/lib/apiClient";
import { Button } from "./ui/button";

interface Notif {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  href: string;
  tone: "warn" | "info" | "success";
}

const today = () => new Date().toISOString().split("T")[0];

export function NotificationCenter() {
  const { lang } = useApp();
  const authFetch = useAuthFetch();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const isRTL = lang === "ar";

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

  const itemsQ = useQuery<{ id: number; what: string; done: boolean }[]>({
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

  const masterQ = useQuery<{ id: number }[]>({
    queryKey: ["master-rules"],
    queryFn: () => authFetch("/api/master-rules").then(r => r.json()),
    staleTime: 120000,
  });

  // Build notifications
  const notifs: Notif[] = [];
  const items = itemsQ.data ?? [];
  const unfinished = items.filter(i => !i.done);
  if (items.length === 0) {
    notifs.push({
      id: "no-plan",
      icon: AlertCircle,
      tone: "warn",
      title: isRTL ? "لم تضع خطة اليوم بعد" : "No plan set for today",
      body: isRTL ? "ابدأ بإضافة أول بند في قائمة الامتناع." : "Start by adding your first item to avoid.",
      href: "/daily",
    });
  } else if (unfinished.length > 0) {
    notifs.push({
      id: "unfinished",
      icon: AlertCircle,
      tone: "warn",
      title: isRTL ? `${unfinished.length} بنود لم تكتمل اليوم` : `${unfinished.length} unfinished item${unfinished.length === 1 ? "" : "s"} today`,
      body: unfinished.slice(0, 2).map(i => i.what).join(" • "),
      href: "/daily",
    });
  }

  const filledPriorities = (prioritiesQ.data?.priorities ?? []).filter(p => p.trim()).length;
  if (filledPriorities < 3) {
    notifs.push({
      id: "priorities",
      icon: Target,
      tone: "info",
      title: isRTL ? "حدّد أولوياتك اليوم" : "Set today's priorities",
      body: isRTL
        ? `أنجزت ${filledPriorities} من 3 أولويات`
        : `${filledPriorities} of 3 priorities filled`,
      href: "/daily",
    });
  }

  const ifThenCount = (ifThenQ.data ?? []).filter(p => p.date === d).length;
  if (ifThenCount === 0) {
    notifs.push({
      id: "if-then",
      icon: Zap,
      tone: "info",
      title: isRTL ? "لا توجد خطط محفزات اليوم" : "No if-then plans for today",
      body: isRTL ? "أضف خطة 'إذا-إذًا' لحماية قرارك." : "Add an if-then plan to protect your decision.",
      href: "/daily",
    });
  }

  if ((masterQ.data ?? []).length === 0) {
    notifs.push({
      id: "master",
      icon: ShieldBan,
      tone: "info",
      title: isRTL ? "ابنِ قائمة المنع الدائم" : "Build your permanent ban list",
      body: isRTL ? "قواعد لا تفاوض عليها." : "Non-negotiable rules.",
      href: "/master",
    });
  }

  if (items.length > 0 && unfinished.length === 0) {
    notifs.unshift({
      id: "all-done",
      icon: CheckCircle2,
      tone: "success",
      title: isRTL ? "أكملت جميع بنود اليوم!" : "All today's items completed!",
      body: isRTL ? "استمر — يوم جيد." : "Keep going — great day.",
      href: "/daily",
    });
  }

  const count = notifs.filter(n => n.tone === "warn").length;

  const toneClass = (t: Notif["tone"]) => {
    if (t === "warn") return "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300";
    if (t === "success") return "bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300";
    return "bg-sky-100 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300";
  };

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
        {count > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center tabular">
            {count}
          </span>
        )}
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            style={{ width: "min(340px, calc(100vw - 24px))" }}
            className={`fixed sm:absolute ${isRTL ? "left-3 sm:left-0" : "right-3 sm:right-0"} top-14 sm:top-full sm:mt-2 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-[60]`}
          >
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">
                {isRTL ? "مركز الإشعارات" : "Notifications"}
              </p>
              <span className="text-xs text-muted-foreground tabular">{notifs.length}</span>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifs.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {isRTL ? "لا إشعارات حالياً" : "No notifications"}
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {notifs.map(n => (
                    <li key={n.id}>
                      <Link href={n.href}>
                        <button
                          onClick={() => setOpen(false)}
                          className="w-full flex items-start gap-3 px-3 py-3 hover:bg-muted/50 transition-colors text-start"
                        >
                          <div className={`w-8 h-8 rounded-full ${toneClass(n.tone)} flex items-center justify-center shrink-0`}>
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
