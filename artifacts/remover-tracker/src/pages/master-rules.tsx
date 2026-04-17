import { useState } from "react";
import { 
  useGetMasterRules, 
  getGetMasterRulesQueryKey,
  useCreateMasterRule,
  useDeleteMasterRule
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Plus, ShieldBan } from "lucide-react";
import { CATEGORIES, getCategoryIcon } from "@/lib/constants";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";

export default function MasterRules() {
  const queryClient = useQueryClient();
  const { data: rules } = useGetMasterRules({ query: { queryKey: getGetMasterRulesQueryKey() } });
  const createRule = useCreateMasterRule();
  const deleteRule = useDeleteMasterRule();

  const [isAdding, setIsAdding] = useState(false);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [what, setWhat] = useState("");
  const [why, setWhy] = useState("");

  const handleSave = () => {
    if (!what) return;
    createRule.mutate({
      data: {
        category,
        what,
        why: why || null
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMasterRulesQueryKey() });
        setIsAdding(false);
        setWhat("");
        setWhy("");
      }
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-display font-bold text-ink">قائمة المنع الدائمة</h2>
          <p className="text-muted-foreground mt-1">قواعد شخصية لا تراجع عنها أبداً</p>
        </div>
        <Button onClick={() => setIsAdding(!isAdding)} className="bg-ink hover:bg-ink-2 text-white">
          <Plus className="w-4 h-4 mr-2" />
          إضافة قاعدة
        </Button>
      </div>

      {isAdding && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-gold/30 shadow-md bg-parchment-2">
            <CardHeader>
              <CardTitle className="text-lg">قاعدة منع جديدة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ما هو الشيء الممنوع قطعاً؟</Label>
                  <Input value={what} onChange={e => setWhat(e.target.value)} placeholder="مثال: تصفح الجوال في أول ساعة من الصباح" />
                </div>
                <div className="space-y-2">
                  <Label>الفئة</Label>
                  <select 
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                    value={category} 
                    onChange={e => setCategory(e.target.value)}
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>السبب (لماذا؟)</Label>
                <Textarea value={why} onChange={e => setWhy(e.target.value)} placeholder="لأن هذه الساعة تحدد مسار يومي بالكامل..." className="resize-none bg-background" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setIsAdding(false)}>إلغاء</Button>
                <Button onClick={handleSave} className="bg-coral hover:bg-coral/90 text-white">حفظ القاعدة</Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {rules?.map((rule, index) => {
            const Icon = getCategoryIcon(rule.category);
            return (
              <motion.div 
                key={rule.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
              >
                <Card className="h-full border-border hover:border-coral/30 transition-colors shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-full h-1 bg-coral/80" />
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2 text-xs font-medium text-coral bg-coral/10 px-2 py-1 rounded-md">
                        <Icon className="w-3 h-3" />
                        {rule.category}
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity -mt-2 -mr-2"
                        onClick={() => {
                          deleteRule.mutate({ id: rule.id }, {
                            onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetMasterRulesQueryKey() })
                          });
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                    <CardTitle className="font-display text-xl pt-2 leading-tight">
                      {rule.what}
                    </CardTitle>
                  </CardHeader>
                  {rule.why && (
                    <CardContent>
                      <p className="text-muted-foreground text-sm leading-relaxed border-r-2 border-parchment-2 pr-3">
                        {rule.why}
                      </p>
                    </CardContent>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
        
        {rules?.length === 0 && !isAdding && (
          <div className="col-span-full flex flex-col items-center justify-center p-12 text-center text-muted-foreground border-2 border-dashed border-border rounded-xl">
            <ShieldBan className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-lg">لا توجد قواعد منع دائمة</p>
            <p className="text-sm mt-1">القواعد الدائمة هي حدود لا تقبل المساومة.</p>
          </div>
        )}
      </div>
    </div>
  );
}
