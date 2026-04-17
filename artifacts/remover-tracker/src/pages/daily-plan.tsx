import { useState } from "react";
import { format } from "date-fns";
import { 
  useGetDailyItems, 
  getGetDailyItemsQueryKey,
  useCreateDailyItem,
  useUpdateDailyItem,
  useDeleteDailyItem,
  useGetPriorities,
  getGetPrioritiesQueryKey,
  useSavePriorities,
  useGetIfThenPlans,
  getGetIfThenPlansQueryKey,
  useCreateIfThenPlan,
  useDeleteIfThenPlan
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Plus, AlertCircle, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";

export default function DailyPlan() {
  const queryClient = useQueryClient();
  const dateStr = format(new Date(), "yyyy-MM-dd");

  const { data: dailyItems } = useGetDailyItems({ query: { queryKey: getGetDailyItemsQueryKey() } });
  const createDailyItem = useCreateDailyItem();
  const updateDailyItem = useUpdateDailyItem();
  const deleteDailyItem = useDeleteDailyItem();

  const { data: priorities } = useGetPriorities({ query: { queryKey: getGetPrioritiesQueryKey() } });
  const savePriorities = useSavePriorities();

  const { data: plans } = useGetIfThenPlans({ query: { queryKey: getGetIfThenPlansQueryKey() } });
  const createPlan = useCreateIfThenPlan();
  const deletePlan = useDeleteIfThenPlan();

  const [newItemWhat, setNewItemWhat] = useState("");
  const [newItemReplacement, setNewItemReplacement] = useState("");
  const [newItemRisk, setNewItemRisk] = useState("3");

  const [newIf, setNewIf] = useState("");
  const [newThen, setNewThen] = useState("");

  const [p1, setP1] = useState(priorities?.priority1 || "");
  const [p2, setP2] = useState(priorities?.priority2 || "");
  const [p3, setP3] = useState(priorities?.priority3 || "");

  const handleAddDailyItem = () => {
    if (!newItemWhat) return;
    createDailyItem.mutate({
      data: {
        date: dateStr,
        what: newItemWhat,
        replacement: newItemReplacement || null,
        riskLevel: parseInt(newItemRisk)
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetDailyItemsQueryKey() });
        setNewItemWhat("");
        setNewItemReplacement("");
        setNewItemRisk("3");
      }
    });
  };

  const handleAddPlan = () => {
    if (!newIf || !newThen) return;
    createPlan.mutate({
      data: {
        date: dateStr,
        ifCondition: newIf,
        thenAction: newThen
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetIfThenPlansQueryKey() });
        setNewIf("");
        setNewThen("");
      }
    });
  };

  const handleSavePriorities = () => {
    savePriorities.mutate({
      data: {
        date: dateStr,
        priority1: p1,
        priority2: p2,
        priority3: p3
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetPrioritiesQueryKey() });
      }
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-display font-bold text-ink">خطة اليوم</h2>
        <p className="text-muted-foreground mt-1">تحديد الممنوعات وتجهيز البدائل</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Daily "No" List */}
        <Card className="border-parchment-2 shadow-sm bg-white/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-coral" />
              قائمة المنع لليوم
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-parchment p-4 rounded-xl space-y-4 border border-border">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ما الذي سأمتنع عنه؟</Label>
                  <Input value={newItemWhat} onChange={e => setNewItemWhat(e.target.value)} placeholder="مثال: تصفح تويتر" />
                </div>
                <div className="space-y-2">
                  <Label>البديل الإيجابي</Label>
                  <Input value={newItemReplacement} onChange={e => setNewItemReplacement(e.target.value)} placeholder="مثال: قراءة كتاب" />
                </div>
              </div>
              <div className="flex items-end gap-4">
                <div className="space-y-2 flex-1">
                  <Label>مستوى الخطر (1-5)</Label>
                  <select 
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                    value={newItemRisk} 
                    onChange={e => setNewItemRisk(e.target.value)}
                  >
                    <option value="1">1 - منخفض جدًّا</option>
                    <option value="2">2 - منخفض</option>
                    <option value="3">3 - متوسط</option>
                    <option value="4">4 - عالٍ</option>
                    <option value="5">5 - عالٍ جدًّا</option>
                  </select>
                </div>
                <Button onClick={handleAddDailyItem} className="bg-ink hover:bg-ink-2 text-white">إضافة</Button>
              </div>
            </div>

            <div className="space-y-3">
              <AnimatePresence>
                {dailyItems?.map(item => (
                  <motion.div 
                    key={item.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-3 p-3 bg-white rounded-lg border border-border shadow-sm group"
                  >
                    <Checkbox 
                      checked={item.done} 
                      onCheckedChange={(checked) => {
                        updateDailyItem.mutate({
                          id: item.id,
                          data: { done: checked === true }
                        }, {
                          onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetDailyItemsQueryKey() })
                        });
                      }}
                      className="border-gold data-[state=checked]:bg-gold data-[state=checked]:text-white"
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium truncate ${item.done ? 'line-through text-muted-foreground' : ''}`}>
                        {item.what}
                      </p>
                      {item.replacement && (
                        <p className="text-sm text-sage flex items-center gap-1 mt-1 truncate">
                          <ArrowRight className="w-3 h-3" /> بديل: {item.replacement}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        item.riskLevel >= 4 ? 'bg-red-100 text-red-700' :
                        item.riskLevel === 3 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        خطر: {item.riskLevel}
                      </span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => {
                          deleteDailyItem.mutate({ id: item.id }, {
                            onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetDailyItemsQueryKey() })
                          });
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-8">
          {/* Priorities */}
          <Card className="border-parchment-2 shadow-sm">
            <CardHeader>
              <CardTitle className="font-display">أولويات اليوم (إذا قلت لا للباقي)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gold/20 text-gold-deep flex items-center justify-center font-bold font-display">1</div>
                  <Input value={p1} onChange={e => setP1(e.target.value)} placeholder="الأولوية الأولى" />
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gold/20 text-gold-deep flex items-center justify-center font-bold font-display">2</div>
                  <Input value={p2} onChange={e => setP2(e.target.value)} placeholder="الأولوية الثانية" />
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gold/20 text-gold-deep flex items-center justify-center font-bold font-display">3</div>
                  <Input value={p3} onChange={e => setP3(e.target.value)} placeholder="الأولوية الثالثة" />
                </div>
              </div>
              <Button onClick={handleSavePriorities} className="w-full bg-parchment text-ink border border-border hover:bg-parchment-2">
                حفظ الأولويات
              </Button>
            </CardContent>
          </Card>

          {/* If/Then Plans */}
          <Card className="border-parchment-2 shadow-sm bg-teal/5 border-teal/20">
            <CardHeader>
              <CardTitle className="font-display text-teal">تخطيط المحفزات (إذا ... فإني)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 bg-white p-4 rounded-xl border border-teal/10">
                <div className="space-y-2">
                  <Label>إذا حدث...</Label>
                  <Input value={newIf} onChange={e => setNewIf(e.target.value)} placeholder="مثال: شعرت بالملل" />
                </div>
                <div className="space-y-2">
                  <Label>فإني سأقوم بـ...</Label>
                  <Input value={newThen} onChange={e => setNewThen(e.target.value)} placeholder="مثال: شرب كوب ماء والمشي دقيقتين" />
                </div>
                <Button onClick={handleAddPlan} className="w-full bg-teal hover:bg-teal/90 text-white">إضافة الخطة</Button>
              </div>

              <div className="space-y-2 mt-4">
                <AnimatePresence>
                  {plans?.map(plan => (
                    <motion.div 
                      key={plan.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex items-start justify-between p-3 bg-white rounded-lg border border-border shadow-sm group"
                    >
                      <div className="text-sm">
                        <p><span className="font-bold text-teal">إذا:</span> {plan.ifCondition}</p>
                        <p><span className="font-bold text-teal">فإني:</span> {plan.thenAction}</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
                        onClick={() => {
                          deletePlan.mutate({ id: plan.id }, {
                            onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetIfThenPlansQueryKey() })
                          });
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
