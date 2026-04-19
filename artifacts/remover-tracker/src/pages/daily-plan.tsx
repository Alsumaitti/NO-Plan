import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";
import {
  Plus, Trash2, CheckCircle2, AlertTriangle, CalendarCheck,
  Zap, Target, Timer, MapPin, Archive as ArchiveIcon,
  X as XIcon, Check, MoreHorizontal, Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApp } from "@/lib/AppContext";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { format } from "date-fns";
import { arSA, enUS } from "date-fns/locale";

// ---------- Types (aligned with api-zod contract) ----------
interface DailyItem {
  id: number;
  date: string;
  what: string;
  replacement?: string | null;
  riskLevel: number;
  done: boolean;
  createdAt: string;
}

interface IfThenPlan { id: number; trigger: string; response: string; }

// ---------- Constants ----------
const RISK_LABELS_AR = ["", "منخفض جدًّا", "منخفض", "متوسط", "عالٍ", "عالٍ جدًّا"];
const RISK_LABELS_EN = ["", "Very Low", "Low", "Medium", "High", "Very High"];

const today = new Date().toISOString().split("T")[0];

// ---------- Small presentational components ----------
function RiskDot({ level, className = "" }: { level: number; className?: string }) {
  return <span className={`risk-dot risk-dot-${level} ${className}`} aria-hidden="true" />;
}

function RiskSegmented({
  value, onChange, labels,
}: {
  value: number;
  onChange: (v: number) => void;
  labels: string[];
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Risk level"
      className="inline-flex items-center gap-1 rounded-[10px] border border-border bg-background p-1"
    >
      {[1, 2, 3, 4, 5].map((lvl) => {
        const active = value === lvl;
        return (
          <button
            key={lvl}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`${labels[lvl]} (${lvl} of 5)`}
            onClick={() => onChange(lvl)}
            className={[
              "relative h-9 min-w-9 px-2 rounded-md text-sm font-semibold",
              "flex items-center justify-center gap-1.5",
              "transition-all duration-150 focus:outline-none",
              active
                ? "bg-foreground text-background shadow-sm"
                : "text-foreground/70 hover:bg-secondary",
            ].join(" ")}
          >
            <RiskDot level={lvl} />
            <span className="tabular">{lvl}</span>
          </button>
        );
      })}
    </div>
  );
}

function SectionHeader({
  icon: Icon, title, hint, count, action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  hint?: string;
  count?: number;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-2.5">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
          <Icon className="h-4 w-4" />
        </span>
        <div className="flex items-center gap-2">
          <h3 className="font-display text-[17px] font-semibold text-foreground">{title}</h3>
          {typeof count === "number" && count > 0 && (
            <span className="chip chip-outline tabular" aria-label={`${count} items`}>{count}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
        {action}
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-lg">
      <div className="skeleton h-4 w-4 rounded-full" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-3 w-2/3" />
        <div className="skeleton h-3 w-1/3" />
      </div>
    </div>
  );
}

// ---------- Page ----------
export default function DailyPlan() {
  const { T, lang } = useApp();
  const qc = useQueryClient();
  const { getToken } = useAuth();
  const reduceMotion = useReducedMotion();
  const locale = lang === "ar" ? arSA : enUS;
  const riskLabels = lang === "ar" ? RISK_LABELS_AR : RISK_LABELS_EN;
  const isRTL = lang === "ar";

  // Helper to add Clerk token to fetch requests
  const authFetch = async (url: string, options?: RequestInit) => {
    const token = await getToken();
    const headers = new Headers(options?.headers || {});
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return fetch(url, { ...options, headers });
  };

  // ---- Queries ----
  const itemsQuery = useQuery<DailyItem[]>({
    queryKey: ["daily-items", today],
    queryFn: () =>
      authFetch(`/api/daily-items?date=${today}`)
        .then((r) => r.ok ? r.json() : Promise.reject(new Error(`${r.status}`))),
    staleTime: 30_000,
  });
  const items = itemsQuery.data ?? [];

  const pastDatesQuery = useQuery<string[]>({
    queryKey: ["daily-items-past-dates"],
    queryFn: () =>
      authFetch("/api/daily-items/past-dates")
        .then((r) => r.ok ? r.json() : Promise.reject(new Error(`${r.status}`))),
    staleTime: 60_000,
  });
  const pastDates = pastDatesQuery.data ?? [];

  const prioritiesQuery = useQuery<{ priorities: string[] }>({
    queryKey: ["priorities", today],
    queryFn: () => authFetch(`/api/priorities?date=${today}`).then((r) => r.json()),
    staleTime: 30_000,
  });

  const ifThenQuery = useQuery<IfThenPlan[]>({
    queryKey: ["if-then-plans"],
    queryFn: () => authFetch("/api/if-then").then((r) => r.json()),
    staleTime: 60_000,
  });
  const ifThenPlans = ifThenQuery.data ?? [];

  // ---- Sort items: undone first, done at bottom ----
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      if (a.done === b.done) return b.id - a.id;
      return a.done ? 1 : -1;
    });
  }, [items]);

  const doneCount = items.filter((i) => i.done).length;

  // ---- Mutations ----
  const addItem = useMutation({
    mutationFn: (data: { what: string; replacement?: string; riskLevel: number }) =>
      authFetch("/api/daily-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, date: today }),
      }).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${r.status}`)))),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["daily-items", today] });
      setShowAddForm(false);
      setNewItem({ what: "", replacement: "", riskLevel: 3 });
    },
  });

  const toggleDone = useMutation({
    mutationFn: ({ id, done }: { id: number; done: boolean }) =>
      authFetch(`/api/daily-items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done }),
      }).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${r.status}`)))),
    onMutate: async ({ id, done }) => {
      await qc.cancelQueries({ queryKey: ["daily-items", today] });
      const prev = qc.getQueryData<DailyItem[]>(["daily-items", today]);
      qc.setQueryData<DailyItem[]>(["daily-items", today], (old) =>
        old?.map((i) => (i.id === id ? { ...i, done } : i)) ?? [],
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["daily-items", today], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["daily-items", today] }),
  });

  const deleteItem = useMutation({
    mutationFn: (id: number) =>
      authFetch(`/api/daily-items/${id}`, { method: "DELETE" }).then((r) =>
        r.ok ? true : Promise.reject(new Error(`${r.status}`)),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["daily-items", today] }),
  });

  const archivePast = useMutation({
    mutationFn: (date: string) =>
      authFetch("/api/daily-items/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      }).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${r.status}`)))),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["daily-items"] });
      qc.invalidateQueries({ queryKey: ["daily-items-past-dates"] });
      qc.invalidateQueries({ queryKey: ["log-entries"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setArchiveMessage(T("archivedSuccess", "Archived to log."));
      setTimeout(() => setArchiveMessage(""), 3000);
    },
  });

  const savePriorities = useMutation({
    mutationFn: (ps: string[]) =>
      authFetch("/api/priorities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: today, priorities: ps.filter((p) => p.trim()) }),
      }).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${r.status}`)))),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["priorities", today] }),
  });

  const addIfThen = useMutation({
    mutationFn: (data: { trigger: string; response: string }) =>
      authFetch("/api/if-then", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${r.status}`)))),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["if-then-plans"] });
      setNewTrigger("");
      setNewResponse("");
    },
  });

  const deleteIfThen = useMutation({
    mutationFn: (id: number) =>
      authFetch(`/api/if-then/${id}`, { method: "DELETE" }).then((r) =>
        r.ok ? true : Promise.reject(new Error(`${r.status}`)),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["if-then-plans"] }),
  });

  // ---- Local state ----
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState<{ what: string; replacement: string; riskLevel: number }>({
    what: "", replacement: "", riskLevel: 3,
  });
  const [priorities, setPriorities] = useState<string[]>(["", "", ""]);
  const [newTrigger, setNewTrigger] = useState("");
  const [newResponse, setNewResponse] = useState("");
  const [archiveMessage, setArchiveMessage] = useState("");
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Sync priorities from server
  useEffect(() => {
    if (prioritiesQuery.data?.priorities) {
      const ps = [...prioritiesQuery.data.priorities];
      while (ps.length < 3) ps.push("");
      setPriorities(ps.slice(0, 3));
    }
  }, [prioritiesQuery.data]);

  // Debounced auto-save for priorities
  useEffect(() => {
    if (!prioritiesQuery.isSuccess) return;
    const current = prioritiesQuery.data?.priorities ?? [];
    const next = priorities.filter((p) => p.trim());
    const currentClean = current.filter((p) => p.trim());
    if (JSON.stringify(currentClean) === JSON.stringify(next)) return;
    const t = setTimeout(() => savePriorities.mutate(priorities), 600);
    return () => clearTimeout(t);
  }, [priorities]);

  // Focus first input when add form opens
  useEffect(() => {
    if (showAddForm) firstInputRef.current?.focus();
  }, [showAddForm]);

  const handleAddItem = () => {
    if (!newItem.what.trim()) return;
    addItem.mutate({
      what: newItem.what.trim(),
      replacement: newItem.replacement.trim() || undefined,
      riskLevel: newItem.riskLevel,
    });
  };

  // ---- Motion presets ----
  const fadeIn = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.1 } }
    : { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -4 }, transition: { duration: 0.22, ease: [0.32, 0.72, 0, 1] } };

  // ---- Render ----
  return (
    <div className="space-y-8 pb-24">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {format(new Date(), "PPPP", { locale })}
          </p>
          <h1 className="mt-1 font-display text-[30px] leading-tight font-bold text-foreground">
            {T("dailyPlanTitle", isRTL ? "خطة اليوم" : "Today's Plan")}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-lg">
            {T("dailyPlanSubtitle", isRTL
              ? "قائمة قصيرة بما ستمتنع عنه اليوم، وأولوياتك، وخطط الإذا–إذًا."
              : "A short list of what you'll avoid today, your priorities, and if-then plans.")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Progress chip */}
          {items.length > 0 && (
            <div
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 h-10"
              aria-label={`${doneCount} of ${items.length} done`}
            >
              <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))]" />
              <span className="text-sm font-semibold text-foreground tabular">
                {doneCount} / {items.length}
              </span>
              <span className="text-xs text-muted-foreground">
                {T("doneToday", isRTL ? "مكتمل اليوم" : "done today")}
              </span>
            </div>
          )}
          <Button
            onClick={() => setShowAddForm((v) => !v)}
            className="h-10 gap-2 bg-foreground text-background hover:bg-foreground/90"
          >
            <Plus className="h-4 w-4" />
            {T("addItem", isRTL ? "إضافة بند" : "Add item")}
          </Button>
        </div>
      </header>

      {/* Unarchived past banner */}
      {pastDates.length > 0 && (
        <motion.div {...fadeIn}>
          <div
            role="alert"
            className="flex items-start gap-3 rounded-[14px] border px-4 py-3"
            style={{
              borderColor: "hsl(var(--warn) / 0.35)",
              backgroundColor: "hsl(var(--warn-surface))",
              color: "hsl(var(--warn))",
            }}
          >
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <div className="flex-1 text-sm">
              <p className="font-semibold">
                {pastDates.length}{" "}
                {isRTL ? "تاريخ سابق لم يُرحَّل بعد" : pastDates.length === 1 ? "past day not yet archived" : "past days not yet archived"}
              </p>
              <p className="text-xs mt-0.5 opacity-85">
                {isRTL ? "رحِّل بنود الأمس إلى السجل لتحرّر اليوم." : "Archive yesterday's items into your log to free up today."}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-9 gap-1.5 border-[hsl(var(--warn)/0.4)] text-[hsl(var(--warn))] hover:bg-[hsl(var(--warn)/0.08)]"
              onClick={() => pastDates.forEach((d) => archivePast.mutate(d))}
              disabled={archivePast.isPending}
            >
              {archivePast.isPending
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <ArchiveIcon className="h-3.5 w-3.5" />}
              {T("archiveToLog", isRTL ? "رحِّل للسجل" : "Archive to log")}
            </Button>
          </div>
        </motion.div>
      )}

      {archiveMessage && (
        <motion.div {...fadeIn} role="status" aria-live="polite">
          <div className="flex items-center gap-2 rounded-[14px] border px-4 py-2.5 text-sm"
               style={{
                 borderColor: "hsl(var(--success) / 0.3)",
                 backgroundColor: "hsl(var(--success-surface))",
                 color: "hsl(var(--success))",
               }}>
            <CheckCircle2 className="h-4 w-4" />
            <span className="font-medium">{archiveMessage}</span>
          </div>
        </motion.div>
      )}

      {/* Add form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.section
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, height: "auto" }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
          >
            <Card className="surface-card overflow-hidden">
              <CardContent className="p-5 space-y-4">
                <div>
                  <label htmlFor="what" className="text-xs font-medium text-foreground/70 mb-1.5 block">
                    {T("whatToAvoid", isRTL ? "ماذا ستمتنع عنه اليوم؟" : "What will you avoid today?")} *
                  </label>
                  <Input
                    id="what"
                    ref={firstInputRef}
                    value={newItem.what}
                    onChange={(e) => setNewItem((i) => ({ ...i, what: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === "Enter" && newItem.what.trim()) handleAddItem(); if (e.key === "Escape") setShowAddForm(false); }}
                    placeholder={isRTL ? "مثلا: تصفّح وسائل التواصل بعد المغرب" : "e.g. Scrolling social media after sunset"}
                    className="h-10"
                  />
                </div>

                <div>
                  <label htmlFor="replacement" className="text-xs font-medium text-foreground/70 mb-1.5 block">
                    {T("positiveAlternative", isRTL ? "البديل الإيجابي" : "Positive alternative")}
                  </label>
                  <Input
                    id="replacement"
                    value={newItem.replacement}
                    onChange={(e) => setNewItem((i) => ({ ...i, replacement: e.target.value }))}
                    placeholder={isRTL ? "مثلا: قراءة 10 صفحات قبل النوم" : "e.g. Read 10 pages before bed"}
                    className="h-10"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground/70 mb-1.5 block">
                    {T("riskLevel", isRTL ? "مستوى الخطر" : "Risk level")}
                    <span className="ms-2 font-normal text-muted-foreground">
                      {riskLabels[newItem.riskLevel]}
                    </span>
                  </label>
                  <RiskSegmented
                    value={newItem.riskLevel}
                    onChange={(v) => setNewItem((i) => ({ ...i, riskLevel: v }))}
                    labels={riskLabels}
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    onClick={handleAddItem}
                    disabled={!newItem.what.trim() || addItem.isPending}
                    className="h-10 gap-2 bg-foreground text-background hover:bg-foreground/90"
                  >
                    {addItem.isPending
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Check className="h-4 w-4" />}
                    {T("save", isRTL ? "حفظ" : "Save")}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowAddForm(false)}
                    className="h-10"
                  >
                    {T("cancel", isRTL ? "إلغاء" : "Cancel")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Today's ban list */}
      <Card className="surface-card overflow-hidden">
        <CardHeader className="px-5 pt-5 pb-3 border-b border-border">
          <SectionHeader
            icon={CheckCircle2}
            title={T("todayBanList", isRTL ? "قائمة الامتناع اليوم" : "Today's Ban List")}
            count={items.length}
          />
        </CardHeader>
        <CardContent className="p-0">
          {itemsQuery.isLoading ? (
            <div className="divide-y divide-border">
              <SkeletonRow /><SkeletonRow /><SkeletonRow />
            </div>
          ) : itemsQuery.isError ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-[hsl(var(--danger))] font-medium">
                {T("loadError", isRTL ? "تعذّر تحميل البنود" : "Couldn't load items")}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 h-9"
                onClick={() => itemsQuery.reauthFetch()}
              >
                {T("retry", isRTL ? "إعادة المحاولة" : "Retry")}
              </Button>
            </div>
          ) : items.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-muted-foreground mb-4">
                <CalendarCheck className="h-6 w-6" />
              </span>
              <h4 className="font-display text-lg font-semibold text-foreground">
                {T("emptyBanTitle", isRTL ? "لا امتناعات بعد اليوم" : "No bans set for today")}
              </h4>
              <p className="mt-1 text-sm text-muted-foreground max-w-xs mx-auto">
                {T("emptyBanBody", isRTL
                  ? "اختر ما ستتجنّبه اليوم لحماية تركيزك."
                  : "Pick what you'll avoid today to protect your focus.")}
              </p>
              <Button
                onClick={() => setShowAddForm(true)}
                className="mt-5 h-10 gap-2 bg-foreground text-background hover:bg-foreground/90"
              >
                <Plus className="h-4 w-4" />
                {T("addFirst", isRTL ? "أضف أول بند" : "Add your first item")}
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              <AnimatePresence initial={false}>
                {sortedItems.map((item) => (
                  <motion.li
                    key={item.id}
                    layout={!reduceMotion}
                    {...fadeIn}
                  >
                    <div className={[
                      "group flex items-start gap-3 px-5 py-3.5 transition-colors",
                      "hover:bg-secondary/50",
                      item.done && "opacity-60",
                    ].filter(Boolean).join(" ")}>
                      {/* Done toggle */}
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={item.done}
                        aria-label={item.done
                          ? (isRTL ? "إلغاء الإكمال" : "Mark incomplete")
                          : (isRTL ? "وضع علامة مكتمل" : "Mark complete")}
                        onClick={() => toggleDone.mutate({ id: item.id, done: !item.done })}
                        className={[
                          "mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md",
                          "border-2 transition-all duration-150 focus:outline-none",
                          "focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
                          item.done
                            ? "bg-[hsl(var(--success))] border-[hsl(var(--success))] text-white"
                            : "border-[hsl(var(--border-strong))] hover:border-accent bg-background",
                        ].join(" ")}
                      >
                        {item.done && <Check className="h-3 w-3" strokeWidth={3} />}
                      </button>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className={[
                          "text-[15px] leading-snug text-foreground",
                          item.done && "line-through",
                        ].filter(Boolean).join(" ")}>
                          {item.what}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                            <RiskDot level={item.riskLevel} />
                            <span>{riskLabels[item.riskLevel]}</span>
                          </span>
                          {item.replacement && (
                            <span className="chip chip-info">
                              <span aria-hidden="true">→</span>
                              <span className="truncate max-w-[220px]">{item.replacement}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Delete */}
                      <button
                        type="button"
                        aria-label={isRTL ? "حذف" : "Delete"}
                        onClick={() => {
                          if (confirm(isRTL ? "حذف هذا البند؟" : "Delete this item?")) deleteItem.mutate(item.id);
                        }}
                        className={[
                          "shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-md",
                          "text-muted-foreground hover:text-[hsl(var(--danger))] hover:bg-[hsl(var(--danger-surface))]",
                          "transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                        ].join(" ")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Two-column: priorities + if-then */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Priorities */}
        <Card className="surface-card overflow-hidden">
          <CardHeader className="px-5 pt-5 pb-3 border-b border-border">
            <SectionHeader
              icon={Target}
              title={T("priorities", isRTL ? "أولويات اليوم" : "Today's Priorities")}
              hint={T("priorityHint", isRTL ? "تحفظ تلقائيًا" : "auto-saves")}
            />
          </CardHeader>
          <CardContent className="p-5 space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent font-semibold text-sm tabular">
                  {i + 1}
                </span>
                <Input
                  value={priorities[i] ?? ""}
                  onChange={(e) => {
                    const arr = [...priorities];
                    arr[i] = e.target.value;
                    setPriorities(arr);
                  }}
                  placeholder={isRTL ? `الأولوية ${i + 1}` : `Priority ${i + 1}`}
                  className="h-10"
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* If-then */}
        <Card className="surface-card overflow-hidden">
          <CardHeader className="px-5 pt-5 pb-3 border-b border-border">
            <SectionHeader
              icon={Zap}
              title={T("triggerPlanning", isRTL ? "خطط إذا–إذًا" : "If-Then Plans")}
              count={ifThenPlans.length}
            />
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {/* Add form */}
            <div className="space-y-2 rounded-[12px] bg-secondary/50 p-3">
              <Input
                value={newTrigger}
                onChange={(e) => setNewTrigger(e.target.value)}
                placeholder={T("ifHappened", isRTL ? "إذا حدث…" : "If this happens…")}
                className="h-10 bg-background"
              />
              <Input
                value={newResponse}
                onChange={(e) => setNewResponse(e.target.value)}
                placeholder={T("thenWillDo", isRTL ? "فإني سأفعل…" : "Then I'll…")}
                className="h-10 bg-background"
              />
              <Button
                size="sm"
                variant="outline"
                className="w-full h-10 gap-2"
                onClick={() => {
                  if (newTrigger.trim() && newResponse.trim()) {
                    addIfThen.mutate({ trigger: newTrigger, response: newResponse });
                  }
                }}
                disabled={!newTrigger.trim() || !newResponse.trim() || addIfThen.isPending}
              >
                {addIfThen.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                {T("addPlan", isRTL ? "أضف الخطة" : "Add plan")}
              </Button>
            </div>

            {/* List */}
            {ifThenQuery.isLoading ? (
              <div className="space-y-2"><SkeletonRow /><SkeletonRow /></div>
            ) : ifThenPlans.length === 0 ? (
              <div className="text-center py-6">
                <Zap className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  {T("noPlanYet", isRTL ? "لا خطط بعد — اكتب أول إذا–إذًا" : "No plans yet — write your first if-then")}
                </p>
              </div>
            ) : (
              <ul className="space-y-2 max-h-64 overflow-y-auto">
                {ifThenPlans.map((plan) => (
                  <li key={plan.id}>
                    <div className="group flex items-start gap-2 rounded-[12px] border border-border bg-background px-3 py-2.5 hover:border-[hsl(var(--border-strong))] transition-colors">
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <p className="text-xs">
                          <span className="text-muted-foreground">{isRTL ? "إذا" : "If"}</span>{" "}
                          <span className="font-semibold text-foreground">{plan.trigger}</span>
                        </p>
                        <p className="text-xs">
                          <span className="text-muted-foreground">{isRTL ? "فإني" : "Then"}</span>{" "}
                          <span className="font-semibold text-[hsl(var(--info))]">{plan.response}</span>
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label={isRTL ? "حذف الخطة" : "Delete plan"}
                        onClick={() => deleteIfThen.mutate(plan.id)}
                        className="shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-[hsl(var(--danger))] hover:bg-[hsl(var(--danger-surface))] transition-colors"
                      >
                        <XIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
