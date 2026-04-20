import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Download, Search, X, Filter, Trash2, ShieldBan } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useApp } from "@/lib/AppContext";
import { useAuthFetch } from "@/lib/apiClient";
import { exportWorkbook } from "@/lib/exportWorkbook";
import { motion, AnimatePresence } from "framer-motion";
import { format, parseISO } from "date-fns";
import { arSA, enUS } from "date-fns/locale";

type Outcome = "Held" | "Partial" | "Caved";

interface LogEntry {
  id: number;
  date: string;
  what: string;
  source?: string;
  category?: string;
  outcome: Outcome;
  hoursRecovered?: number | null;
  note?: string | null;
}

const DEFAULT_CATEGORIES_AR = ["العمل / اجتماعات", "رقمي / تركيز", "اجتماعي / عائلي", "صحّة / طعام", "ماليّ", "تعلّم / بحث", "التزام شخصي", "أخرى"];
const DEFAULT_CATEGORIES_EN = ["Work / Meetings", "Digital / Focus", "Social / Family", "Health / Food", "Financial", "Learning / Research", "Personal Commitment", "Other"];

const OUTCOME_COLORS: Record<string, string> = {
  Held: "bg-green-100 text-green-800 border-green-200",
  Partial: "bg-amber-100 text-amber-800 border-amber-200",
  Caved: "bg-red-100 text-red-800 border-red-200",
};

function outcomeLabel(o: string, T: (k: string) => string) {
  const lo = o?.toLowerCase();
  if (lo === "held") return T("held");
  if (lo === "partial") return T("partial");
  if (lo === "caved") return T("caved");
  return o;
}

export default function Tracker() {
  const { T, lang } = useApp();
  const qc = useQueryClient();
  const authFetch = useAuthFetch();
  const locale = lang === "ar" ? arSA : enUS;

  const [searchTerm, setSearchTerm] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [filterOutcome, setFilterOutcome] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [exportLang, setExportLang] = useState<"ar" | "en">(lang);
  const [editingEntry, setEditingEntry] = useState<Partial<LogEntry> | null>(null);
  const [deleteIds, setDeleteIds] = useState<number[]>([]);

  const { data: settings } = useQuery<{ customCategories?: string[] }>({ queryKey: ["settings"], queryFn: () => authFetch("/api/settings").then(r => r.json()), staleTime: 120000 });
  const categories = (settings?.customCategories?.length ? settings.customCategories : (lang === "en" ? DEFAULT_CATEGORIES_EN : DEFAULT_CATEGORIES_AR));

  const queryKey = ["log-entries", filterFrom, filterTo, filterCat, filterOutcome];
  const { data: entries = [], isLoading } = useQuery<LogEntry[]>({
    queryKey,
    queryFn: () => {
      const params = new URLSearchParams();
      if (filterFrom) params.set("from", filterFrom);
      if (filterTo) params.set("to", filterTo);
      if (filterCat) params.set("category", filterCat);
      if (filterOutcome) params.set("outcome", filterOutcome);
      return authFetch(`/api/log-entries?${params}`).then(r => r.json());
    },
    staleTime: 30000,
  });

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return entries;
    const q = searchTerm.toLowerCase();
    return entries.filter(e => e.what?.toLowerCase().includes(q) || e.source?.toLowerCase().includes(q) || e.note?.toLowerCase().includes(q));
  }, [entries, searchTerm]);

  const saveMutation = useMutation({
    mutationFn: async (entry: Partial<LogEntry>) => {
      const method = entry.id ? "PUT" : "POST";
      const url = entry.id ? `/api/log-entries/${entry.id}` : "/api/log-entries";
      // ensure required fields for create
      const body: Record<string, unknown> = { ...entry };
      if (!entry.id) {
        body.date = entry.date || new Date().toISOString().split("T")[0];
        body.source = entry.source || (lang === "ar" ? "يدوي" : "Manual");
        body.category = entry.category || (lang === "ar" ? "أخرى" : "Other");
        body.outcome = entry.outcome || "Held";
      }
      const r = await authFetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error(`${r.status}`);
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["log-entries"] }); qc.invalidateQueries({ queryKey: ["dashboard-stats"] }); setShowForm(false); setEditingEntry(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await authFetch("/api/log-entries", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["log-entries"] }); qc.invalidateQueries({ queryKey: ["dashboard-stats"] }); setDeleteIds([]); },
  });

  const hasFilters = filterCat || filterOutcome || filterFrom || filterTo || searchTerm;

  const clearFilters = () => {
    setFilterCat(""); setFilterOutcome(""); setFilterFrom(""); setFilterTo(""); setSearchTerm("");
  };

  const [exporting, setExporting] = useState(false);
  const handleExport = async () => {
    try {
      setExporting(true);
      await exportWorkbook(authFetch, exportLang);
    } catch (err) {
      console.error("Export failed:", err);
      alert(lang === "ar" ? "تعذّر التصدير" : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const form = editingEntry ?? {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-3xl font-display font-bold text-ink">{T("logTitle")}</h2>
          <p className="text-muted-foreground text-sm mt-1">{T("logSubtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" /> {T("addEntry")}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-parchment-2 shadow-sm">
        <CardContent className="pt-4 pb-3 px-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder={T("search")}
                className="ps-9"
              />
            </div>
            <select
              value={filterCat}
              onChange={e => setFilterCat(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
            >
              <option value="">{T("allCategories")}</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={filterOutcome}
              onChange={e => setFilterOutcome(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
            >
              <option value="">{T("allOutcomes")}</option>
              <option value="Held">{T("held")}</option>
              <option value="Partial">{T("partial")}</option>
              <option value="Caved">{T("caved")}</option>
            </select>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Filter className="w-4 h-4" />
              {lang === "ar" ? "من" : "From"}:
            </div>
            <Input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} className="h-8 text-sm w-36" />
            <span className="text-muted-foreground text-sm">{lang === "ar" ? "إلى" : "To"}:</span>
            <Input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} className="h-8 text-sm w-36" />

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground gap-1 text-xs h-8">
                <X className="w-3 h-3" /> {T("clearFilters")}
              </Button>
            )}

            <div className="ms-auto flex items-center gap-2">
              <select
                value={exportLang}
                onChange={e => setExportLang(e.target.value as "ar" | "en")}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
              >
                <option value="ar">عربي</option>
                <option value="en">English</option>
              </select>
              <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting} className="gap-1.5 h-8 text-xs">
                <Download className="w-3.5 h-3.5" /> {exporting ? (lang === "ar" ? "جاري..." : "Exporting...") : `${T("exportData")} (XLSX)`}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk delete bar */}
      <AnimatePresence>
        {deleteIds.length > 0 && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
            <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-2">
              <span className="text-sm text-destructive font-medium">
                {lang === "ar" ? `${deleteIds.length} محددة` : `${deleteIds.length} selected`}
              </span>
              <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate(deleteIds)} disabled={deleteMutation.isPending} className="gap-1">
                <Trash2 className="w-3.5 h-3.5" /> {lang === "ar" ? "حذف المحددة" : "Delete selected"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setDeleteIds([])}>
                {T("cancel")}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Entries */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed border-parchment-2 bg-transparent shadow-none">
          <CardContent className="py-16 text-center">
            <ShieldBan className="w-10 h-10 text-gold/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-serif italic">{hasFilters ? T("noResults") : T("noEntries")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(entry => (
            <motion.div key={entry.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-parchment-2 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setEditingEntry(entry); setShowForm(true); }}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 w-4 h-4 accent-gold shrink-0"
                      checked={deleteIds.includes(entry.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        setDeleteIds(ids => ids.includes(entry.id) ? ids.filter(i => i !== entry.id) : [...ids, entry.id]);
                      }}
                      onClick={e => e.stopPropagation()}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-medium text-ink text-sm truncate">{entry.what}</span>
                        <Badge className={`text-xs border ${OUTCOME_COLORS[entry.outcome] ?? ""}`} variant="outline">
                          {outcomeLabel(entry.outcome, T)}
                        </Badge>
                        {entry.category && <Badge variant="outline" className="text-xs border-parchment-2">{entry.category}</Badge>}
                        {entry.hoursRecovered && entry.hoursRecovered > 0 && (
                          <Badge variant="outline" className="text-xs border-teal/30 text-teal">+{entry.hoursRecovered}h</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span>{format(parseISO(entry.date), "PPP", { locale })}</span>
                        {entry.source && <span>• {entry.source}</span>}
                        {entry.note && <span className="truncate max-w-xs">• {entry.note}</span>}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={(v) => { if (!v) { setShowForm(false); setEditingEntry(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">{editingEntry?.id ? (lang === "ar" ? "تعديل السجل" : "Edit Entry") : T("newEntry")}</DialogTitle>
          </DialogHeader>

          <EntryForm
            initial={editingEntry ?? {}}
            categories={categories}
            T={T}
            lang={lang}
            onSave={(data) => saveMutation.mutate({ ...editingEntry, ...data })}
            onDelete={editingEntry?.id ? () => { deleteMutation.mutate([editingEntry.id!]); setShowForm(false); setEditingEntry(null); } : undefined}
            isSaving={saveMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EntryForm({
  initial, categories, T, lang, onSave, onDelete, isSaving
}: {
  initial: Partial<LogEntry>;
  categories: string[];
  T: (k: string) => string;
  lang: string;
  onSave: (data: Partial<LogEntry>) => void;
  onDelete?: () => void;
  isSaving: boolean;
}) {
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState<Partial<LogEntry>>({
    date: today,
    outcome: "Held",
    ...initial,
  });

  const set = (k: keyof LogEntry, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-muted-foreground block mb-1">{T("whatSaidNo")} *</label>
        <Input value={form.what ?? ""} onChange={e => set("what", e.target.value)} placeholder={lang === "ar" ? "مثال: اجتماع غير ضروري" : "e.g. Unnecessary meeting"} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">{T("date")}</label>
          <Input type="date" value={form.date ?? today} onChange={e => set("date", e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">{T("outcome")}</label>
          <select value={form.outcome ?? "Held"} onChange={e => set("outcome", e.target.value as Outcome)} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground">
            <option value="Held">{T("held")}</option>
            <option value="Partial">{T("partial")}</option>
            <option value="Caved">{T("caved")}</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">{T("source")}</label>
          <Input value={form.source ?? ""} onChange={e => set("source", e.target.value)} placeholder={lang === "ar" ? "مثال: زميل / واتساب" : "e.g. Colleague / WhatsApp"} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">{T("category")}</label>
          <select value={form.category ?? ""} onChange={e => set("category", e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground">
            <option value="">{lang === "ar" ? "-- اختر --" : "-- Choose --"}</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="text-xs text-muted-foreground block mb-1">{T("hoursRecoveredLabel")}</label>
        <Input type="number" min="0" step="0.5" value={form.hoursRecovered ?? ""} onChange={e => set("hoursRecovered", e.target.value ? parseFloat(e.target.value) : undefined)} />
      </div>
      <div>
        <label className="text-xs text-muted-foreground block mb-1">{T("notes")}</label>
        <textarea
          value={form.note ?? ""}
          onChange={e => set("note", e.target.value)}
          className="w-full h-20 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground resize-none"
          placeholder={lang === "ar" ? "ملاحظات إضافية..." : "Additional notes..."}
        />
      </div>
      <DialogFooter className="gap-2 flex-row justify-between pt-2">
        <div>
          {onDelete && (
            <Button variant="destructive" size="sm" onClick={onDelete}>
              <Trash2 className="w-3.5 h-3.5 ml-1" /> {T("delete")}
            </Button>
          )}
        </div>
        <Button
          className="bg-gold hover:bg-gold/90 text-ink font-bold"
          onClick={() => onSave(form)}
          disabled={!form.what?.trim() || isSaving}
        >
          {T("save")}
        </Button>
      </DialogFooter>
    </div>
  );
}
