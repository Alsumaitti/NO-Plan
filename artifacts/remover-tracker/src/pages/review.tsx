import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format, subDays, startOfWeek as dfStartOfWeek } from "date-fns";
import { arSA, enUS } from "date-fns/locale";
import { useApp } from "@/lib/AppContext";
import { useAuthFetch } from "@/lib/apiClient";
import { RefreshCcw, Check, Archive as ArchiveIcon, Loader2 } from "lucide-react";

export default function Review() {
  const { lang, T } = useApp();
  const qc = useQueryClient();
  const authFetch = useAuthFetch();
  const locale = lang === "ar" ? arSA : enUS;
  const today = new Date();
  const weekStart = dfStartOfWeek(today, { weekStartsOn: 6 }); // Saturday
  const weekEnd = subDays(today, 0);
  const weekRange = `${format(weekStart, "d MMM", { locale })} - ${format(weekEnd, "d MMM", { locale })}`;
  const weekKey = format(weekStart, "yyyy-MM-dd");
  const storageKey = `no-review-${weekKey}`;

  const prompts = lang === "ar" ? [
    "ما الـ'لا' التي أحدثت أكبر فرق هذا الأسبوع؟",
    "متى تراجعت، وما الذي جعلني أتراجع؟",
    "ما الذي أريد أن أُضيفه لقائمة المنع الدائمة؟",
    "كيف شعرتُ حين قلتُ 'لا' بوعي؟",
    "ما الإزالة الأقوى في حياتي الآن؟",
    "ما الذي لا أزال أسمح به رغم معرفتي بضرره؟"
  ] : [
    "What 'No' made the biggest difference this week?",
    "When did I cave, and what made me cave?",
    "What do I want to add to my permanent ban list?",
    "How did I feel when I said 'No' consciously?",
    "What is the most powerful removal in my life right now?",
    "What am I still allowing despite knowing it hurts me?"
  ];

  const [answers, setAnswers] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return [...parsed, ...Array(prompts.length).fill("")].slice(0, prompts.length);
      }
    } catch { /* ignore */ }
    return Array(prompts.length).fill("");
  });
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // Auto-save with debounce
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(answers));
        setSavedAt(Date.now());
      } catch { /* ignore */ }
    }, 400);
    return () => clearTimeout(t);
  }, [answers, storageKey]);

  const filledCount = answers.filter(a => a.trim()).length;

  // Archive reflections to log as a single entry
  const archiveMut = useMutation({
    mutationFn: async () => {
      const filled = answers
        .map((a, i) => ({ q: prompts[i], a: a.trim() }))
        .filter(x => x.a);
      if (filled.length === 0) throw new Error("empty");
      const note = filled.map((x, i) => `${i + 1}. ${x.q}\n→ ${x.a}`).join("\n\n");
      const r = await authFetch("/api/log-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: format(new Date(), "yyyy-MM-dd"),
          what: lang === "ar" ? `مراجعة أسبوعية: ${weekRange}` : `Weekly Review: ${weekRange}`,
          source: lang === "ar" ? "مراجعة أسبوعية" : "Weekly Review",
          category: lang === "ar" ? "مراجعة أسبوعية" : "Weekly Review",
          outcome: "Held",
          note,
        }),
      });
      if (!r.ok) throw new Error(`${r.status}`);
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["log-entries"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });

  // Auto-archive detection: if it's a new week and the previous week had reflections,
  // automatically archive the previous week once.
  useEffect(() => {
    const flagKey = `no-review-autoarchived-${weekKey}`;
    if (localStorage.getItem(flagKey)) return;
    // Look for a prior week in localStorage
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith("no-review-") && !k.includes("autoarchived"));
      const prior = keys
        .map(k => k.replace("no-review-", ""))
        .filter(k => k !== weekKey)
        .sort()
        .reverse()[0];
      if (!prior) return;
      const priorRaw = localStorage.getItem(`no-review-${prior}`);
      if (!priorRaw) return;
      const priorArr = JSON.parse(priorRaw);
      if (!Array.isArray(priorArr) || !priorArr.some((a: string) => a?.trim())) return;
      const priorFilled = priorArr.map((a: string, i: number) => ({ q: prompts[i], a: (a ?? "").trim() })).filter(x => x.a);
      if (priorFilled.length === 0) return;
      const note = priorFilled.map((x, i) => `${i + 1}. ${x.q}\n→ ${x.a}`).join("\n\n");
      authFetch("/api/log-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: prior,
          what: lang === "ar" ? `مراجعة أسبوعية مُرحَّلة تلقائياً` : `Auto-archived Weekly Review`,
          source: lang === "ar" ? "مراجعة أسبوعية" : "Weekly Review",
          category: lang === "ar" ? "مراجعة أسبوعية" : "Weekly Review",
          outcome: "Held",
          note,
        }),
      }).then(r => {
        if (r.ok) localStorage.setItem(flagKey, "1");
      }).catch(() => { /* silent */ });
    } catch { /* silent */ }
  }, [weekKey, lang]);

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="text-center space-y-4 mb-12">
        <div className="w-16 h-16 rounded-2xl bg-gold/10 flex items-center justify-center mx-auto">
          <RefreshCcw className="w-8 h-8 text-gold" />
        </div>
        <h2 className="text-4xl font-display font-bold text-ink">
          {lang === "ar" ? "المراجعة الأسبوعية" : "Weekly Review"}
        </h2>
        <p className="text-lg text-muted-foreground">
          {lang === "ar" ? "خُذ نفساً عميقاً، وراجع أسبوعك بصراحة." : "Take a deep breath and review your week honestly."}
        </p>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <div className="inline-block bg-parchment-2 text-ink-2 px-4 py-1.5 rounded-full text-sm font-medium border border-border">
            {lang === "ar" ? `أسبوع: ${weekRange}` : `Week: ${weekRange}`}
          </div>
          <div className="inline-flex items-center gap-1.5 bg-gold/10 text-gold-deep px-3 py-1.5 rounded-full text-xs font-medium">
            <span className="tabular">{filledCount} / {prompts.length}</span>
            <span>{lang === "ar" ? "مكتمل" : "answered"}</span>
          </div>
          {savedAt && (
            <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Check className="w-3 h-3 text-green-600" />
              {lang === "ar" ? "محفوظ تلقائيًا" : "auto-saved"}
            </div>
          )}
        </div>

        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => archiveMut.mutate()}
            disabled={archiveMut.isPending || filledCount === 0}
            className="h-9 gap-1.5 border-gold/40 text-gold-deep hover:bg-gold/10"
          >
            {archiveMut.isPending
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <ArchiveIcon className="w-3.5 h-3.5" />}
            {lang === "ar" ? "رحِّل المراجعة إلى السجل" : "Archive review to log"}
          </Button>
          {archiveMut.isSuccess && (
            <span className="ms-2 inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
              <Check className="w-3 h-3" />
              {lang === "ar" ? "رُحِّل" : "Archived"}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {prompts.map((prompt, i) => (
          <Card key={i} className="border-gold/20 shadow-sm bg-white/60 dark:bg-card backdrop-blur hover:bg-white dark:hover:bg-card/80 transition-colors">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-gold-deep mb-3">{i + 1}.</p>
              <p className="font-medium text-ink mb-4 leading-relaxed">{prompt}</p>
              <textarea
                value={answers[i] ?? ""}
                onChange={(e) => {
                  const next = [...answers];
                  next[i] = e.target.value;
                  setAnswers(next);
                }}
                className="w-full h-28 text-sm bg-transparent border-b-2 border-parchment-2 focus:border-gold outline-none resize-none text-foreground placeholder-muted-foreground transition-colors"
                placeholder={lang === "ar" ? "اكتب تأملاتك هنا..." : "Write your reflections here..."}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center text-xs text-muted-foreground pt-8 border-t border-parchment-2">
        {T("copyright")}
      </div>
    </div>
  );
}
