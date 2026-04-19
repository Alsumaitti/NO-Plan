import { useState, useEffect } from "react";
import { useApp } from "@/lib/AppContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Globe, Sun, Moon, Trash2, Plus, X, AlertTriangle,
  LayoutDashboard, Save, Check
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const DEFAULT_CATEGORIES_AR = [
  "العمل / اجتماعات", "رقمي / تركيز", "اجتماعي / عائلي",
  "صحّة / طعام", "ماليّ", "تعلّم / بحث", "التزام شخصي", "أخرى"
];

const DEFAULT_CATEGORIES_EN = [
  "Work / Meetings", "Digital / Focus", "Social / Family",
  "Health / Food", "Financial", "Learning / Research", "Personal Commitment", "Other"
];

const WIDGET_OPTIONS = [
  { key: "stats", labelAr: "إحصائيات KPI", labelEn: "KPI Stats" },
  { key: "streak", labelAr: "سلسلة الاستمرار", labelEn: "Streak" },
  { key: "activity", labelAr: "النشاط اليومي", labelEn: "Daily Activity" },
  { key: "categories", labelAr: "توزيع الفئات", labelEn: "Categories" },
  { key: "lastLogin", labelAr: "آخر دخول", labelEn: "Last Login" },
];

async function fetchSettings() {
  const r = await fetch("/api/settings");
  if (!r.ok) throw new Error("Failed");
  return r.json();
}

export default function Settings() {
  const { lang, setLang, dark, setDark, T } = useApp();
  const qc = useQueryClient();
  const [newCat, setNewCat] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saved, setSaved] = useState(false);

  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });

  const [customCats, setCustomCats] = useState<string[]>([]);
  const [dashWidgets, setDashWidgets] = useState<string[]>(["stats", "streak", "activity", "categories", "lastLogin"]);

  useEffect(() => {
    if (settings) {
      setCustomCats((settings.customCategories as string[]) ?? []);
      setDashWidgets((settings.dashboardWidgets as string[]) ?? ["stats", "streak", "activity", "categories", "lastLogin"]);
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data: object) => {
      const r = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await fetch("/api/account-data", { method: "DELETE" });
    },
    onSuccess: () => {
      qc.clear();
      setShowDeleteConfirm(false);
      window.location.reload();
    },
  });

  const handleSave = () => {
    saveMutation.mutate({
      language: lang,
      darkMode: dark,
      customCategories: customCats,
      dashboardWidgets: dashWidgets,
    });
  };

  const addCategory = () => {
    const trimmed = newCat.trim();
    if (!trimmed || customCats.includes(trimmed)) return;
    setCustomCats(prev => [...prev, trimmed]);
    setNewCat("");
  };

  const removeCategory = (cat: string) => {
    setCustomCats(prev => prev.filter(c => c !== cat));
  };

  const toggleWidget = (key: string) => {
    setDashWidgets(prev =>
      prev.includes(key) ? prev.filter(w => w !== key) : [...prev, key]
    );
  };

  const defaultCats = lang === "en" ? DEFAULT_CATEGORIES_EN : DEFAULT_CATEGORIES_AR;
  const allCats = customCats.length > 0 ? customCats : defaultCats;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-display font-bold text-ink">{T("settingsTitle")}</h2>
          <p className="text-muted-foreground mt-1">{lang === "ar" ? "تخصيص تجربتك" : "Customize your experience"}</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="bg-gold hover:bg-gold/90 text-ink font-bold gap-2"
        >
          {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? (lang === "ar" ? "تم الحفظ!" : "Saved!") : T("saveSettings")}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Language */}
        <Card className="border-parchment-2 shadow-sm">
          <CardHeader><CardTitle className="font-display flex items-center gap-2 text-base"><Globe className="w-5 h-5 text-gold" />{T("language")}</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setLang("ar")}
                className={`p-4 rounded-xl border-2 text-center transition-all ${lang === "ar" ? "border-gold bg-gold/10" : "border-border hover:border-gold/50"}`}
              >
                <div className="text-2xl mb-1">🇸🇦</div>
                <div className="font-medium text-ink text-sm">العربية</div>
              </button>
              <button
                onClick={() => setLang("en")}
                className={`p-4 rounded-xl border-2 text-center transition-all ${lang === "en" ? "border-gold bg-gold/10" : "border-border hover:border-gold/50"}`}
              >
                <div className="text-2xl mb-1">🇺🇸</div>
                <div className="font-medium text-ink text-sm">English</div>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Theme */}
        <Card className="border-parchment-2 shadow-sm">
          <CardHeader><CardTitle className="font-display flex items-center gap-2 text-base">{dark ? <Moon className="w-5 h-5 text-indigo-500" /> : <Sun className="w-5 h-5 text-amber-500" />}{T("theme")}</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setDark(false)}
                className={`p-4 rounded-xl border-2 text-center transition-all ${!dark ? "border-gold bg-gold/10" : "border-border hover:border-gold/50"}`}
              >
                <Sun className="w-6 h-6 text-amber-500 mx-auto mb-1" />
                <div className="font-medium text-ink text-sm">{T("lightMode")}</div>
              </button>
              <button
                onClick={() => setDark(true)}
                className={`p-4 rounded-xl border-2 text-center transition-all ${dark ? "border-gold bg-gold/10" : "border-border hover:border-gold/50"}`}
              >
                <Moon className="w-6 h-6 text-indigo-500 mx-auto mb-1" />
                <div className="font-medium text-ink text-sm">{T("darkMode")}</div>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Dashboard Widgets */}
        <Card className="border-parchment-2 shadow-sm">
          <CardHeader><CardTitle className="font-display flex items-center gap-2 text-base"><LayoutDashboard className="w-5 h-5 text-teal" />{T("dashboardWidgets")}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {WIDGET_OPTIONS.map(w => (
                <label key={w.key} className="flex items-center gap-3 p-3 rounded-xl border border-border cursor-pointer hover:bg-muted/30 transition-colors">
                  <input
                    type="checkbox"
                    checked={dashWidgets.includes(w.key)}
                    onChange={() => toggleWidget(w.key)}
                    className="w-4 h-4 accent-gold"
                  />
                  <span className="text-sm font-medium">{lang === "ar" ? w.labelAr : w.labelEn}</span>
                  {dashWidgets.includes(w.key) && <Badge variant="outline" className="text-xs text-green-700 bg-green-50 ms-auto">مفعّل</Badge>}
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Custom Categories */}
        <Card className="border-parchment-2 shadow-sm">
          <CardHeader>
            <CardTitle className="font-display text-base">{T("customCategories")}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {lang === "ar" ? "اتركها فارغة لاستخدام الافتراضية" : "Leave empty to use defaults"}
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={newCat}
                onChange={e => setNewCat(e.target.value)}
                placeholder={lang === "ar" ? "اسم الفئة الجديدة" : "New category name"}
                onKeyDown={e => e.key === "Enter" && addCategory()}
              />
              <Button size="icon" variant="outline" onClick={addCategory} disabled={!newCat.trim()}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <AnimatePresence>
                {(customCats.length > 0 ? customCats : defaultCats).map(cat => (
                  <motion.div
                    key={cat}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                  >
                    <Badge variant="outline" className="gap-1 pr-1 text-sm py-1">
                      {cat}
                      {customCats.length > 0 && (
                        <button onClick={() => removeCategory(cat)} className="hover:text-destructive transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </Badge>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            {customCats.length > 0 && (
              <Button variant="ghost" size="sm" className="text-muted-foreground text-xs" onClick={() => setCustomCats([])}>
                {lang === "ar" ? "استعادة الافتراضية" : "Reset to defaults"}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Danger Zone */}
      <Card className="border-destructive/30 shadow-sm">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2 font-display text-base">
            <AlertTriangle className="w-5 h-5" />
            {lang === "ar" ? "منطقة الخطر" : "Danger Zone"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-red-50 border border-red-200">
            <div>
              <p className="font-medium text-red-800 text-sm">{T("deleteAllData")}</p>
              <p className="text-xs text-red-600 mt-0.5">{T("deleteDataWarning")}</p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="w-4 h-4 ml-1" />
              {T("delete")}
            </Button>
          </div>

          <AnimatePresence>
            {showDeleteConfirm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-red-50 border border-red-300 rounded-xl p-4 space-y-3"
              >
                <p className="text-red-800 font-medium text-sm text-center">
                  {lang === "ar" ? "هل أنت متأكد؟ لا يمكن التراجع عن هذا الإجراء!" : "Are you sure? This cannot be undone!"}
                </p>
                <div className="flex gap-3 justify-center">
                  <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(false)}>
                    {T("cancel")}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteMutation.mutate()}
                    disabled={deleteMutation.isPending}
                  >
                    {T("confirmDelete")}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center text-xs text-muted-foreground py-4 border-t border-parchment-2">
        {T("copyright")}
      </div>
    </div>
  );
}
