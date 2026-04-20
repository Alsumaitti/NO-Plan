import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, ShieldBan } from "lucide-react";
import { useApp } from "@/lib/AppContext";
import { useAuthFetch } from "@/lib/apiClient";
import { motion, AnimatePresence } from "framer-motion";

interface MasterRule {
  id: number;
  what: string;
  why?: string | null;
  category: string;
}

export default function MasterRules() {
  const { T, lang } = useApp();
  const qc = useQueryClient();
  const authFetch = useAuthFetch();
  const [newRule, setNewRule] = useState("");
  const [newReason, setNewReason] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [showForm, setShowForm] = useState(false);

  const { data: rules = [], isLoading } = useQuery<MasterRule[]>({
    queryKey: ["master-rules"],
    queryFn: () => authFetch("/api/master-rules").then(r => r.json()),
    staleTime: 60000,
  });

  const { data: settings } = useQuery<{ customCategories?: string[] }>({
    queryKey: ["settings"],
    queryFn: () => authFetch("/api/settings").then(r => r.json()),
    staleTime: 120000,
  });

  const DEFAULT_CATEGORIES = lang === "en"
    ? ["Work / Meetings", "Digital / Focus", "Social / Family", "Health / Food", "Financial", "Learning / Research", "Personal Commitment", "Other"]
    : ["العمل / اجتماعات", "رقمي / تركيز", "اجتماعي / عائلي", "صحّة / طعام", "ماليّ", "تعلّم / بحث", "التزام شخصي", "أخرى"];

  const categories = settings?.customCategories?.length ? settings.customCategories : DEFAULT_CATEGORIES;

  const addMutation = useMutation({
    mutationFn: async (data: { what: string; why?: string; category: string }) => {
      const r = await authFetch("/api/master-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!r.ok) throw new Error(`${r.status}`);
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["master-rules"] }); setNewRule(""); setNewReason(""); setNewCategory(""); setShowForm(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await authFetch(`/api/master-rules/${id}`, { method: "DELETE" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["master-rules"] }),
  });

  const handleAdd = () => {
    if (!newRule.trim()) return;
    const fallbackCategory = lang === "ar" ? "أخرى" : "Other";
    addMutation.mutate({
      what: newRule.trim(),
      why: newReason.trim() || undefined,
      category: newCategory || fallbackCategory,
    });
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-display font-bold text-ink">{T("masterRules")}</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {lang === "ar" ? "قواعد لا تفاوض عليها — إزالات دائمة من حياتك" : "Non-negotiable rules — permanent removals from your life"}
          </p>
        </div>
        <Button className="bg-gold hover:bg-gold/90 text-ink gap-1.5" onClick={() => setShowForm(v => !v)}>
          <Plus className="w-4 h-4" /> {lang === "ar" ? "إضافة قاعدة" : "Add Rule"}
        </Button>
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <Card className="border-gold/30 bg-gold/5">
              <CardContent className="pt-4 pb-4 px-5 space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">
                    {lang === "ar" ? "القاعدة *" : "The Rule *"}
                  </label>
                  <Input
                    value={newRule}
                    onChange={e => setNewRule(e.target.value)}
                    placeholder={lang === "ar" ? "مثال: لن أقبل اجتماعات بدون أجندة واضحة" : "e.g. Never accept meetings without a clear agenda"}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">
                    {lang === "ar" ? "السبب / لماذا هذه القاعدة؟" : "Reason / Why this rule?"}
                  </label>
                  <Textarea
                    value={newReason}
                    onChange={e => setNewReason(e.target.value)}
                    placeholder={lang === "ar" ? "ما الذي حدث وجعلك تضع هذه القاعدة؟" : "What happened that made you set this rule?"}
                    className="h-20 resize-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">{T("category")}</label>
                  <select
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
                  >
                    <option value="">{lang === "ar" ? "-- اختر --" : "-- Choose --"}</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    className="bg-gold hover:bg-gold/90 text-ink"
                    onClick={handleAdd}
                    disabled={!newRule.trim() || addMutation.isPending}
                  >
                    {T("save")}
                  </Button>
                  <Button variant="outline" onClick={() => setShowForm(false)}>{T("cancel")}</Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rules list */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" />
        </div>
      ) : rules.length === 0 ? (
        <Card className="border-dashed border-parchment-2 bg-transparent shadow-none">
          <CardContent className="py-16 text-center">
            <ShieldBan className="w-12 h-12 text-gold/30 mx-auto mb-4" />
            <p className="text-muted-foreground font-serif italic text-lg">
              {lang === "ar" ? "لا توجد قواعد بعد" : "No rules yet"}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {lang === "ar" ? "أضف قاعدتك الأولى لتبدأ" : "Add your first rule to get started"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {rules.map((rule) => (
              <motion.div key={rule.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}>
                <Card className="border-parchment-2 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="py-4 px-5">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center shrink-0 mt-0.5">
                        <ShieldBan className="w-4 h-4 text-gold" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-ink">{rule.what}</p>
                        {rule.why && (
                          <p className="text-sm text-muted-foreground mt-1 font-serif italic">{rule.why}</p>
                        )}
                        {rule.category && (
                          <Badge variant="outline" className="text-xs mt-2">{rule.category}</Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => deleteMutation.mutate(rule.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-xs text-muted-foreground pt-8">
        {T("copyright")}
      </div>
    </div>
  );
}
