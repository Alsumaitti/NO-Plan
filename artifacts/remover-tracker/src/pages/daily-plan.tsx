import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Save, CheckCircle2, AlertCircle, CalendarCheck, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/lib/AppContext";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { arSA, enUS } from "date-fns/locale";

interface DailyItem {
  id: number;
  date: string;
  item: string;
  positiveAlternative?: string;
  riskLevel?: number;
  category?: string;
  source?: string;
  hoursRecovered?: number;
  archived?: boolean;
}

interface Priority { text: string; }
interface IfThenPlan { id: number; trigger: string; response: string; }

const RISK_LABELS_AR = ["", "منخفض جدًّا", "منخفض", "متوسط", "عالٍ", "عالٍ جدًّا"];
const RISK_LABELS_EN = ["", "Very Low", "Low", "Medium", "High", "Very High"];
const RISK_COLORS = ["", "bg-emerald-100 text-emerald-700", "bg-green-100 text-green-700", "bg-amber-100 text-amber-700", "bg-orange-100 text-orange-700", "bg-red-100 text-red-700"];

const DEFAULT_CATEGORIES_AR = ["العمل / اجتماعات", "رقمي / تركيز", "اجتماعي / عائلي", "صحّة / طعام", "ماليّ", "تعلّم / بحث", "التزام شخصي", "أخرى"];
const DEFAULT_CATEGORIES_EN = ["Work / Meetings", "Digital / Focus", "Social / Family", "Health / Food", "Financial", "Learning / Research", "Personal Commitment", "Other"];

const today = new Date().toISOString().split("T")[0];

export default function DailyPlan() {
  const { T, lang } = useApp();
  const qc = useQueryClient();
  const locale = lang === "ar" ? arSA : enUS;
  const riskLabels = lang === "ar" ? RISK_LABELS_AR : RISK_LABELS_EN;

  const { data: settings } = useQuery<{ customCategories?: string[] }>({ queryKey: ["settings"], queryFn: () => fetch("/api/settings").then(r => r.json()), staleTime: 120000 });
  const categories = (settings?.customCategories?.length ? settings.customCategories : (lang === "en" ? DEFAULT_CATEGORIES_EN : DEFAULT_CATEGORIES_AR));

  // Ban list
  const { data: allItems = [] } = useQuery<DailyItem[]>({
    queryKey: ["daily-items", today],
    queryFn: () => fetch(`/api/daily-items?date=${today}`).then(r => r.json()),
    staleTime: 30000,
  });
  const todayItems = allItems.filter(i => !i.archived);

  // Unararchived items (past)
  const { data: unarchivedItems = [] } = useQuery<DailyItem[]>({
    queryKey: ["daily-items-unarchived"],
    queryFn: () => fetch("/api/daily-items/past-dates").then(r => r.json()),
    staleTime: 30000,
  });

  // Priorities
  const { data: prioritiesData } = useQuery<{ priorities: string[] }>({
    queryKey: ["priorities", today],
    queryFn: () => fetch(`/api/priorities?date=${today}`).then(r => r.json()),
    staleTime: 30000,
  });

  // If-Then plans
  const { data: ifThenPlans = [] } = useQuery<IfThenPlan[]>({
    queryKey: ["if-then-plans"],
    queryFn: () => fetch("/api/if-then").then(r => r.json()),
    staleTime: 60000,
  });

  // State for new ban item
  const [newItem, setNewItem] = useState({ item: "", positiveAlternative: "", riskLevel: 3, category: "", source: "", hoursRecovered: "" });
  const [showAddForm, setShowAddForm] = useState(false);
  const [priorities, setPriorities] = useState<string[]>(prioritiesData?.priorities ?? ["", "", ""]);
  const [newTrigger, setNewTrigger] = useState("");
  const [newResponse, setNewResponse] = useState("");
  const [archiveMessage, setArchiveMessage] = useState("");

  const addItemMutation = useMutation({
    mutationFn: (data: Partial<DailyItem>) => fetch("/api/daily-items", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, date: today })
    }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["daily-items", today] }); setShowAddForm(false); setNewItem({ item: "", positiveAlternative: "", riskLevel: 3, category: "", source: "", hoursRecovered: "" }); },
  });

  const deleteItemMutation = useMutation({
    mutationFn: (id: number) => fetch(`/api/daily-items/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["daily-items", today] }); },
  });

  const archiveMutation = useMutation({
    mutationFn: (ids: number[]) => fetch("/api/daily-items/archive", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, date: today })
    }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["daily-items"] });
      qc.invalidateQueries({ queryKey: ["log-entries"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      const count = unarchivedItems.length;
      setArchiveMessage(`${T("archivedSuccess")} ${count} ${T("toLog")}`);
      setTimeout(() => setArchiveMessage(""), 3000);
    },
  });

  const savePrioritiesMutation = useMutation({
    mutationFn: (ps: string[]) => fetch("/api/priorities", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: today, priorities: ps.filter(p => p.trim()) })
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["priorities", today] }); },
  });

  const addIfThenMutation = useMutation({
    mutationFn: (data: { trigger: string; response: string }) => fetch("/api/if-then", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["if-then-plans"] }); setNewTrigger(""); setNewResponse(""); },
  });

  const deleteIfThenMutation = useMutation({
    mutationFn: (id: number) => fetch(`/api/if-then/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["if-then-plans"] }),
  });

  const handleAddItem = () => {
    if (!newItem.item.trim()) return;
    addItemMutation.mutate({
      item: newItem.item.trim(),
      positiveAlternative: newItem.positiveAlternative.trim() || undefined,
      riskLevel: newItem.riskLevel,
      category: newItem.category || undefined,
      source: newItem.source.trim() || undefined,
      hoursRecovered: newItem.hoursRecovered ? parseFloat(newItem.hoursRecovered) : undefined,
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-ink">{T("dailyPlanTitle")}</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {format(new Date(), "PPP", { locale })} — {T("dailyPlanSubtitle")}
          </p>
        </div>
        <Button className="bg-gold hover:bg-gold/90 text-ink gap-1.5" onClick={() => setShowAddForm(v => !v)}>
          <Plus className="w-4 h-4" /> {T("addItem")}
        </Button>
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <Card className="border-gold/30 bg-gold/5 shadow-sm">
              <CardContent className="pt-4 pb-4 px-5 space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">{T("whatToAvoid")} *</label>
                  <Input value={newItem.item} onChange={e => setNewItem(i => ({ ...i, item: e.target.value }))} placeholder={lang === "ar" ? "ما الذي ستمتنع عنه؟" : "What will you avoid?"} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">{T("positiveAlternative")}</label>
                    <Input value={newItem.positiveAlternative} onChange={e => setNewItem(i => ({ ...i, positiveAlternative: e.target.value }))} placeholder={lang === "ar" ? "البديل الإيجابي" : "Positive alternative"} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">{T("source")}</label>
                    <Input value={newItem.source} onChange={e => setNewItem(i => ({ ...i, source: e.target.value }))} placeholder={lang === "ar" ? "المصدر / المحفز" : "Source / Trigger"} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">{T("category")}</label>
                    <select value={newItem.category} onChange={e => setNewItem(i => ({ ...i, category: e.target.value }))} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground">
                      <option value="">{lang === "ar" ? "-- اختر --" : "-- Choose --"}</option>
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">{T("hoursRecoveredLabel")}</label>
                    <Input type="number" min="0" step="0.5" value={newItem.hoursRecovered} onChange={e => setNewItem(i => ({ ...i, hoursRecovered: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">{T("riskLevel")}: {riskLabels[newItem.riskLevel]}</label>
                  <input type="range" min={1} max={5} value={newItem.riskLevel} onChange={e => setNewItem(i => ({ ...i, riskLevel: Number(e.target.value) }))} className="w-full accent-gold" />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button className="bg-gold hover:bg-gold/90 text-ink" onClick={handleAddItem} disabled={!newItem.item.trim() || addItemMutation.isPending}>
                    {T("save")}
                  </Button>
                  <Button variant="outline" onClick={() => setShowAddForm(false)}>{T("cancel")}</Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unarchived items from past */}
      {unarchivedItems.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 shadow-sm">
          <CardContent className="py-3 px-5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-800">
                  {lang === "ar"
                    ? `${unarchivedItems.length} بنود سابقة لم ترحَّل للسجل`
                    : `${unarchivedItems.length} past items not yet archived to log`}
                </span>
              </div>
              <Button size="sm" variant="outline" className="border-amber-400 text-amber-800 hover:bg-amber-100 gap-1" onClick={() => archiveMutation.mutate(unarchivedItems.map(i => i.id))}>
                <CalendarCheck className="w-3.5 h-3.5" /> {T("archiveToLogBtn")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {archiveMessage && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="py-3 px-5">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="w-4 h-4" /><span className="text-sm font-medium">{archiveMessage}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's ban list */}
      <Card className="border-parchment-2 shadow-sm">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2 text-base">
            <CheckCircle2 className="w-5 h-5 text-gold" /> {T("todayBanList")}
            {todayItems.length > 0 && <Badge variant="outline" className="text-xs">{todayItems.length}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {todayItems.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground font-serif italic text-sm">{T("noBansYet")}</p>
              <p className="text-xs text-muted-foreground mt-1">{T("addHint")}</p>
            </div>
          ) : (
            <AnimatePresence>
              {todayItems.map(item => (
                <motion.div key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="flex items-start gap-3 p-3 rounded-xl border border-parchment-2 hover:border-gold/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-ink text-sm">{item.item}</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {item.positiveAlternative && <span className="text-xs text-teal bg-teal/10 rounded-full px-2 py-0.5">→ {item.positiveAlternative}</span>}
                        {item.riskLevel && <Badge className={`text-xs border-0 ${RISK_COLORS[item.riskLevel]}`}>{riskLabels[item.riskLevel]}</Badge>}
                        {item.category && <Badge variant="outline" className="text-xs">{item.category}</Badge>}
                        {item.source && <span className="text-xs text-muted-foreground">📍 {item.source}</span>}
                        {item.hoursRecovered && <span className="text-xs text-teal">⏱ +{item.hoursRecovered}h</span>}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0" onClick={() => deleteItemMutation.mutate(item.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Priorities */}
        <Card className="border-parchment-2 shadow-sm">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2 text-base">
              <Save className="w-5 h-5 text-gold" /> {T("priorities")}
              <span className="text-xs text-muted-foreground font-normal">{T("priorityHint")}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[0, 1, 2].map(i => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-gold/20 text-gold-deep text-xs flex items-center justify-center font-bold shrink-0">{i + 1}</span>
                <Input
                  value={(prioritiesData?.priorities ?? priorities)[i] ?? ""}
                  onChange={e => {
                    const arr = [...(prioritiesData?.priorities ?? priorities)];
                    arr[i] = e.target.value;
                    setPriorities(arr);
                  }}
                  placeholder={lang === "ar" ? `الأولوية ${i + 1}` : `Priority ${i + 1}`}
                />
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full mt-2 gap-1" onClick={() => savePrioritiesMutation.mutate(priorities)}>
              <Save className="w-3.5 h-3.5" /> {T("savePriorities")}
            </Button>
          </CardContent>
        </Card>

        {/* If-Then Plans */}
        <Card className="border-parchment-2 shadow-sm">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2 text-base">
              <Zap className="w-5 h-5 text-gold" /> {T("triggerPlanning")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Input value={newTrigger} onChange={e => setNewTrigger(e.target.value)} placeholder={T("ifHappened")} />
              <Input value={newResponse} onChange={e => setNewResponse(e.target.value)} placeholder={T("thenWillDo")} />
              <Button size="sm" variant="outline" className="w-full gap-1" onClick={() => { if (newTrigger.trim() && newResponse.trim()) addIfThenMutation.mutate({ trigger: newTrigger, response: newResponse }); }} disabled={!newTrigger.trim() || !newResponse.trim()}>
                <Plus className="w-3.5 h-3.5" /> {T("addPlan")}
              </Button>
            </div>

            {ifThenPlans.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-4 font-serif italic">{T("noPlanYet")}</p>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {ifThenPlans.map(plan => (
                  <div key={plan.id} className="p-3 rounded-xl bg-muted/30 border border-parchment-2 flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">{lang === "ar" ? "إذا" : "If"} <span className="font-medium text-ink">{plan.trigger}</span></p>
                      <p className="text-xs text-muted-foreground mt-0.5">{lang === "ar" ? "فإني" : "Then"} <span className="font-medium text-teal">{plan.response}</span></p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0" onClick={() => deleteIfThenMutation.mutate(plan.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
