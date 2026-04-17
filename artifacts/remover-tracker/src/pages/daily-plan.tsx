import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import {
  useCreateDailyItem,
  useUpdateDailyItem,
  useDeleteDailyItem,
  useGetPriorities,
  getGetPrioritiesQueryKey,
  useSavePriorities,
  useGetIfThenPlans,
  getGetIfThenPlansQueryKey,
  useCreateIfThenPlan,
  useDeleteIfThenPlan,
} from "@workspace/api-client-react";
import type { DailyItem } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Trash2,
  Plus,
  AlertCircle,
  ArrowLeft,
  ArchiveIcon,
  ChevronRight,
  ChevronLeft,
  Calendar,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/api";

const BASE = getApiUrl();

const RISK_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: "منخفض جدًّا", color: "bg-green-100 text-green-700 border-green-200" },
  2: { label: "منخفض", color: "bg-lime-100 text-lime-700 border-lime-200" },
  3: { label: "متوسط", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  4: { label: "عالٍ", color: "bg-orange-100 text-orange-700 border-orange-200" },
  5: { label: "عالٍ جدًّا", color: "bg-red-100 text-red-700 border-red-200" },
};

export default function DailyPlan() {
  const queryClient = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");

  const [viewDate, setViewDate] = useState(today);
  const [pastDates, setPastDates] = useState<string[]>([]);
  const [archivingDate, setArchivingDate] = useState<string | null>(null);
  const [archiveSuccess, setArchiveSuccess] = useState<string | null>(null);

  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemWhat, setNewItemWhat] = useState("");
  const [newItemReplacement, setNewItemReplacement] = useState("");
  const [newItemRisk, setNewItemRisk] = useState("3");
  const [newIf, setNewIf] = useState("");
  const [newThen, setNewThen] = useState("");
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [p3, setP3] = useState("");

  const { data: dailyItems, isLoading: loadingItems } = useQuery<DailyItem[]>({
    queryKey: ["daily-items", viewDate],
    queryFn: () =>
      fetch(`${BASE}/daily-items?date=${viewDate}`).then((r) => r.json()),
  });

  const { data: priorities } = useGetPriorities({
    query: { queryKey: getGetPrioritiesQueryKey() },
  });
  const { data: plans } = useGetIfThenPlans({
    query: { queryKey: getGetIfThenPlansQueryKey() },
  });

  const createDailyItem = useCreateDailyItem();
  const updateDailyItem = useUpdateDailyItem();
  const deleteDailyItem = useDeleteDailyItem();
  const savePriorities = useSavePriorities();
  const createPlan = useCreateIfThenPlan();
  const deletePlan = useDeleteIfThenPlan();

  // Sync priority fields when data loads
  useEffect(() => {
    if (priorities) {
      setP1(priorities.priority1 || "");
      setP2(priorities.priority2 || "");
      setP3(priorities.priority3 || "");
    }
  }, [priorities]);

  // Fetch past dates with items
  useEffect(() => {
    fetch(`${BASE}/daily-items/past-dates`)
      .then((r) => r.json())
      .then((dates: string[]) => setPastDates(dates))
      .catch(() => {});
  }, [archiveSuccess]);

  const invalidateItems = () => {
    queryClient.invalidateQueries({ queryKey: ["daily-items", viewDate] });
  };

  const handleAddItem = () => {
    if (!newItemWhat.trim()) return;
    createDailyItem.mutate(
      {
        data: {
          date: viewDate,
          what: newItemWhat.trim(),
          replacement: newItemReplacement.trim() || null,
          riskLevel: parseInt(newItemRisk),
        },
      },
      {
        onSuccess: () => {
          invalidateItems();
          setNewItemWhat("");
          setNewItemReplacement("");
          setNewItemRisk("3");
          setShowAddItem(false);
        },
      }
    );
  };

  const handleAddPlan = () => {
    if (!newIf.trim() || !newThen.trim()) return;
    createPlan.mutate(
      { data: { date: today, ifCondition: newIf.trim(), thenAction: newThen.trim() } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetIfThenPlansQueryKey() });
          setNewIf("");
          setNewThen("");
        },
      }
    );
  };

  const handleSavePriorities = () => {
    savePriorities.mutate(
      { data: { date: today, priority1: p1, priority2: p2, priority3: p3 } },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetPrioritiesQueryKey() }) }
    );
  };

  const handleArchive = async (date: string) => {
    setArchivingDate(date);
    try {
      await fetch(`${BASE}/daily-items/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });
      setArchiveSuccess(date);
      setPastDates((prev) => prev.filter((d) => d !== date));
      if (viewDate === date) setViewDate(today);
      invalidateItems();
      setTimeout(() => setArchiveSuccess(null), 3000);
    } finally {
      setArchivingDate(null);
    }
  };

  const goToPrevDay = () => {
    const d = new Date(viewDate);
    d.setDate(d.getDate() - 1);
    setViewDate(format(d, "yyyy-MM-dd"));
  };

  const goToNextDay = () => {
    if (viewDate >= today) return;
    const d = new Date(viewDate);
    d.setDate(d.getDate() + 1);
    setViewDate(format(d, "yyyy-MM-dd"));
  };

  const isToday = viewDate === today;
  const doneCount = dailyItems?.filter((i) => i.done).length ?? 0;
  const totalCount = dailyItems?.length ?? 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-ink">خطة اليوم</h2>
          <p className="text-muted-foreground mt-1">تحديد الممنوعات وتجهيز البدائل</p>
        </div>

        {/* Date Navigator */}
        <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2 shadow-sm self-start">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToPrevDay}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2 text-sm font-medium min-w-36 justify-center">
            <Calendar className="w-4 h-4 text-gold" />
            {isToday
              ? "اليوم"
              : format(new Date(viewDate + "T12:00:00"), "dd MMM yyyy", { locale: ar })}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={goToNextDay}
            disabled={isToday}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          {!isToday && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7 mr-1"
              onClick={() => setViewDate(today)}
            >
              اليوم
            </Button>
          )}
        </div>
      </div>

      {/* Past dates banners */}
      <AnimatePresence>
        {pastDates.map((date) => (
          <motion.div
            key={date}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3"
          >
            <div className="flex items-center gap-2 text-amber-800 text-sm font-medium">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              بنود من يوم {format(new Date(date + "T12:00:00"), "dd MMMM", { locale: ar })} لم تُرحَّل للسجل
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-amber-700 text-xs hover:bg-amber-100"
                onClick={() => setViewDate(date)}
              >
                عرض
              </Button>
              <Button
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs"
                disabled={archivingDate === date}
                onClick={() => handleArchive(date)}
              >
                {archivingDate === date ? (
                  <Loader2 className="w-3 h-3 animate-spin ml-1" />
                ) : (
                  <ArchiveIcon className="w-3 h-3 ml-1" />
                )}
                رحّل للسجل
              </Button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Archive success toast */}
      <AnimatePresence>
        {archiveSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-green-800 text-sm"
          >
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            تم ترحيل بنود يوم {format(new Date(archiveSuccess + "T12:00:00"), "dd MMMM", { locale: ar })} إلى السجل بنجاح
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Daily "No" List */}
        <Card className="border-parchment-2 shadow-sm bg-white/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-display flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-coral" />
                قائمة المنع
                {isToday ? " لليوم" : ""}
              </CardTitle>
              <div className="flex items-center gap-2">
                {totalCount > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {doneCount}/{totalCount} مكتمل
                  </Badge>
                )}
                {isToday && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => setShowAddItem((v) => !v)}
                  >
                    <Plus className="w-3 h-3 ml-1" />
                    إضافة
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add form */}
            <AnimatePresence>
              {showAddItem && isToday && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-parchment border border-border rounded-xl p-4 space-y-3 overflow-hidden"
                >
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">ما الذي سأمتنع عنه؟ *</Label>
                    <Input
                      value={newItemWhat}
                      onChange={(e) => setNewItemWhat(e.target.value)}
                      placeholder="مثال: تصفح تويتر أثناء العمل"
                      onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">البديل الإيجابي (اختياري)</Label>
                    <Input
                      value={newItemReplacement}
                      onChange={(e) => setNewItemReplacement(e.target.value)}
                      placeholder="مثال: قراءة فصل واحد من الكتاب"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">مستوى الخطر</Label>
                    <div className="flex gap-2 flex-wrap">
                      {[1, 2, 3, 4, 5].map((r) => (
                        <button
                          key={r}
                          onClick={() => setNewItemRisk(String(r))}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                            newItemRisk === String(r)
                              ? RISK_LABELS[r].color + " ring-2 ring-offset-1 ring-current"
                              : "bg-white border-border text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          {r} — {RISK_LABELS[r].label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <Button variant="outline" size="sm" onClick={() => setShowAddItem(false)}>
                      إلغاء
                    </Button>
                    <Button
                      size="sm"
                      className="bg-ink hover:bg-ink-2 text-white"
                      onClick={handleAddItem}
                      disabled={!newItemWhat.trim() || createDailyItem.isPending}
                    >
                      {createDailyItem.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "إضافة"}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Items list */}
            <div className="space-y-2">
              {loadingItems ? (
                <div className="flex justify-center py-8 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              ) : dailyItems && dailyItems.length > 0 ? (
                <AnimatePresence>
                  {dailyItems.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-start gap-3 p-3 bg-white rounded-xl border border-border shadow-sm group hover:shadow-md transition-shadow"
                    >
                      <Checkbox
                        checked={item.done}
                        disabled={!isToday}
                        onCheckedChange={(checked) => {
                          updateDailyItem.mutate(
                            { id: item.id, data: { done: checked === true } },
                            { onSuccess: invalidateItems }
                          );
                        }}
                        className="mt-0.5 border-gold data-[state=checked]:bg-gold data-[state=checked]:text-white"
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className={`font-medium text-sm ${
                            item.done ? "line-through text-muted-foreground" : "text-ink"
                          }`}
                        >
                          {item.what}
                        </p>
                        {item.replacement && (
                          <p className="text-xs text-sage flex items-center gap-1 mt-1">
                            <ArrowLeft className="w-3 h-3" />
                            {item.replacement}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          variant="outline"
                          className={`text-xs px-2 py-0.5 ${RISK_LABELS[item.riskLevel]?.color}`}
                        >
                          {item.riskLevel}
                        </Badge>
                        {isToday && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() =>
                              deleteDailyItem.mutate({ id: item.id }, { onSuccess: invalidateItems })
                            }
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  {isToday ? (
                    <>
                      <AlertCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                      <p>لم تضف أي ممنوعات لليوم بعد</p>
                      <p className="text-xs mt-1">اضغط "إضافة" لتحديد ما ستتجنبه</p>
                    </>
                  ) : (
                    <p>لا توجد بنود لهذا اليوم</p>
                  )}
                </div>
              )}
            </div>

            {/* Archive current past-day button */}
            {!isToday && dailyItems && dailyItems.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="w-full text-amber-700 border-amber-300 hover:bg-amber-50"
                disabled={archivingDate === viewDate}
                onClick={() => handleArchive(viewDate)}
              >
                {archivingDate === viewDate ? (
                  <Loader2 className="w-3 h-3 animate-spin ml-1" />
                ) : (
                  <ArchiveIcon className="w-3.5 h-3.5 ml-1" />
                )}
                رحّل بنود هذا اليوم إلى السجل
              </Button>
            )}
          </CardContent>
        </Card>

        <div className="space-y-8">
          {/* Priorities — always for today */}
          <Card className="border-parchment-2 shadow-sm">
            <CardHeader>
              <CardTitle className="font-display text-base">
                أولويات اليوم (إذا قلت لا للباقي)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {[
                  { num: 1, val: p1, set: setP1 },
                  { num: 2, val: p2, set: setP2 },
                  { num: 3, val: p3, set: setP3 },
                ].map(({ num, val, set }) => (
                  <div key={num} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gold/20 text-gold-deep flex items-center justify-center font-bold font-display shrink-0 text-sm">
                      {num}
                    </div>
                    <Input
                      value={val}
                      onChange={(e) => set(e.target.value)}
                      placeholder={`الأولوية ${num === 1 ? "الأولى" : num === 2 ? "الثانية" : "الثالثة"}`}
                    />
                  </div>
                ))}
              </div>
              <Button
                onClick={handleSavePriorities}
                disabled={savePriorities.isPending}
                className="w-full bg-parchment text-ink border border-border hover:bg-parchment-2"
              >
                {savePriorities.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : null}
                حفظ الأولويات
              </Button>
            </CardContent>
          </Card>

          {/* If/Then Plans */}
          <Card className="border-teal/20 shadow-sm bg-teal/5">
            <CardHeader>
              <CardTitle className="font-display text-teal text-base">
                تخطيط المحفزات — إذا ... فإني
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-white rounded-xl border border-teal/10 p-4 space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">إذا حدث...</Label>
                  <Input
                    value={newIf}
                    onChange={(e) => setNewIf(e.target.value)}
                    placeholder="مثال: شعرت بالملل فجأة"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">فإني سأقوم بـ...</Label>
                  <Input
                    value={newThen}
                    onChange={(e) => setNewThen(e.target.value)}
                    placeholder="مثال: شرب ماء والمشي دقيقتين"
                    onKeyDown={(e) => e.key === "Enter" && handleAddPlan()}
                  />
                </div>
                <Button
                  onClick={handleAddPlan}
                  disabled={!newIf.trim() || !newThen.trim() || createPlan.isPending}
                  className="w-full bg-teal hover:bg-teal/90 text-white"
                  size="sm"
                >
                  {createPlan.isPending ? <Loader2 className="w-3 h-3 animate-spin ml-1" /> : <Plus className="w-3 h-3 ml-1" />}
                  إضافة الخطة
                </Button>
              </div>

              <div className="space-y-2">
                <AnimatePresence>
                  {plans?.map((plan) => (
                    <motion.div
                      key={plan.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 12 }}
                      className="flex items-start justify-between p-3 bg-white rounded-xl border border-border shadow-sm group"
                    >
                      <div className="text-sm space-y-0.5">
                        <p>
                          <span className="font-bold text-teal text-xs">إذا:</span>{" "}
                          {plan.ifCondition}
                        </p>
                        <p>
                          <span className="font-bold text-teal text-xs">فإني:</span>{" "}
                          {plan.thenAction}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 shrink-0"
                        onClick={() =>
                          deletePlan.mutate(
                            { id: plan.id },
                            {
                              onSuccess: () =>
                                queryClient.invalidateQueries({ queryKey: getGetIfThenPlansQueryKey() }),
                            }
                          )
                        }
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {!plans?.length && (
                  <p className="text-xs text-center text-muted-foreground py-3">
                    لا توجد خطط محفزات بعد
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
