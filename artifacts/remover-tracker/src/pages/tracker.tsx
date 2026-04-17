import { useState } from "react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import {
  useGetLogEntries,
  getGetLogEntriesQueryKey,
  useCreateLogEntry,
  useDeleteLogEntry,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Download, FileJson, FileText, X, Search } from "lucide-react";
import { CATEGORIES, getCategoryIcon, OUTCOMES } from "@/lib/constants";
import { getApiUrl } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";

const BASE = getApiUrl();

const EMPTY_FORM = {
  date: format(new Date(), "yyyy-MM-dd"),
  what: "",
  source: "",
  category: CATEGORIES[0],
  hoursRecovered: "",
  outcome: "Held" as "Held" | "Partial" | "Caved",
  note: "",
};

export default function Tracker() {
  const queryClient = useQueryClient();
  const { data: entries } = useGetLogEntries({ query: { queryKey: getGetLogEntriesQueryKey() } });
  const createEntry = useCreateLogEntry();
  const deleteEntry = useDeleteLogEntry();

  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [searchText, setSearchText] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterOutcome, setFilterOutcome] = useState("");

  const setField = <K extends keyof typeof EMPTY_FORM>(key: K, val: (typeof EMPTY_FORM)[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  const handleSave = () => {
    if (!form.what.trim() || !form.source.trim()) return;
    createEntry.mutate(
      {
        data: {
          date: form.date,
          what: form.what.trim(),
          source: form.source.trim(),
          category: form.category,
          hoursRecovered: form.hoursRecovered ? parseFloat(form.hoursRecovered) : null,
          outcome: form.outcome,
          note: form.note.trim() || null,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetLogEntriesQueryKey() });
          setIsAdding(false);
          setForm(EMPTY_FORM);
        },
      }
    );
  };

  const handleExport = (fmt: "json" | "csv") => {
    const a = document.createElement("a");
    a.href = `${BASE}/export?format=${fmt}`;
    a.download = `remover-tracker-${format(new Date(), "yyyy-MM-dd")}.${fmt}`;
    a.click();
  };

  const filtered = (entries ?? []).filter((e) => {
    if (searchText && !e.what.includes(searchText) && !e.source.includes(searchText) && !(e.note ?? "").includes(searchText)) return false;
    if (filterCategory && e.category !== filterCategory) return false;
    if (filterOutcome && e.outcome !== filterOutcome) return false;
    return true;
  });

  const hasFilters = !!searchText || !!filterCategory || !!filterOutcome;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-ink">سجل الإزالة</h2>
          <p className="text-muted-foreground mt-1">توثيق كل موقف قلت فيه "لا"</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap self-start">
          {/* Export buttons */}
          <div className="flex items-center gap-1 border border-border rounded-lg p-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1 text-muted-foreground hover:text-ink"
              onClick={() => handleExport("json")}
              title="تحميل JSON"
            >
              <FileJson className="w-3.5 h-3.5" />
              JSON
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1 text-muted-foreground hover:text-ink"
              onClick={() => handleExport("csv")}
              title="تحميل CSV"
            >
              <FileText className="w-3.5 h-3.5" />
              CSV
            </Button>
          </div>
          <Button
            onClick={() => setIsAdding(!isAdding)}
            className="bg-ink hover:bg-ink-2 text-white"
            size="sm"
          >
            <Plus className="w-4 h-4 ml-1" />
            سجّل موقفاً
          </Button>
        </div>
      </div>

      {/* Add form */}
      {isAdding && (
        <Card className="border-gold/30 shadow-md bg-parchment-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="font-display text-base">موقف جديد</CardTitle>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsAdding(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Date */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">التاريخ</Label>
                <Input type="date" value={form.date} onChange={(e) => setField("date", e.target.value)} />
              </div>
              {/* What */}
              <div className="space-y-1.5 lg:col-span-2">
                <Label className="text-xs font-semibold">ماذا قلت له "لا"؟ *</Label>
                <Input
                  value={form.what}
                  onChange={(e) => setField("what", e.target.value)}
                  placeholder="مثال: اجتماع غير ضروري في نهاية اليوم"
                  autoFocus
                />
              </div>
              {/* Source */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">المصدر / المحفز *</Label>
                <Input
                  value={form.source}
                  onChange={(e) => setField("source", e.target.value)}
                  placeholder="مثال: زميل العمل، نفسي، وسائل التواصل"
                />
              </div>
              {/* Category */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">الفئة</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={form.category}
                  onChange={(e) => setField("category", e.target.value)}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              {/* Hours recovered */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">ساعات مستردّة (اختياري)</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  max="24"
                  value={form.hoursRecovered}
                  onChange={(e) => setField("hoursRecovered", e.target.value)}
                  placeholder="0.5"
                />
              </div>
            </div>

            {/* Outcome pills */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">النتيجة</Label>
              <div className="flex gap-2">
                {OUTCOMES.map((o) => (
                  <button
                    key={o.value}
                    onClick={() => setField("outcome", o.value as typeof form.outcome)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                      form.outcome === o.value
                        ? o.color + " ring-2 ring-offset-1 ring-current"
                        : "bg-white border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Note */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">ملاحظات (اختياري)</Label>
              <Textarea
                value={form.note}
                onChange={(e) => setField("note", e.target.value)}
                placeholder="كيف شعرت؟ ما الذي ساعدك على الصمود؟ ما الذي تعلمته؟"
                className="resize-none bg-background text-sm"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setIsAdding(false)}>إلغاء</Button>
              <Button
                onClick={handleSave}
                disabled={!form.what.trim() || !form.source.trim() || createEntry.isPending}
                className="bg-teal hover:bg-teal/90 text-white"
              >
                حفظ السجل
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="بحث في السجل..."
            className="pr-9 bg-white"
          />
        </div>
        <select
          className="h-9 rounded-md border border-input bg-white px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-w-36"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="">كل الفئات</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <select
          className="h-9 rounded-md border border-input bg-white px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={filterOutcome}
          onChange={(e) => setFilterOutcome(e.target.value)}
        >
          <option value="">كل النتائج</option>
          {OUTCOMES.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-ink"
            onClick={() => { setSearchText(""); setFilterCategory(""); setFilterOutcome(""); }}
          >
            <X className="w-3.5 h-3.5 ml-1" />
            مسح الفلاتر
          </Button>
        )}
        {hasFilters && (
          <span className="text-sm text-muted-foreground">
            {filtered.length} من {entries?.length ?? 0}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-muted/50 text-muted-foreground border-b border-border">
              <tr>
                <th className="p-4 font-medium">التاريخ</th>
                <th className="p-4 font-medium">الموضوع</th>
                <th className="p-4 font-medium">الفئة</th>
                <th className="p-4 font-medium">المصدر</th>
                <th className="p-4 font-medium text-center">ساعات</th>
                <th className="p-4 font-medium text-center">النتيجة</th>
                <th className="p-4 font-medium w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? (
                filtered.map((entry) => {
                  const Icon = getCategoryIcon(entry.category);
                  const outcomeDetails = OUTCOMES.find((o) => o.value === entry.outcome) ?? OUTCOMES[0];
                  return (
                    <tr key={entry.id} className="border-b border-border hover:bg-muted/30 transition-colors group">
                      <td className="p-4 whitespace-nowrap text-muted-foreground text-xs">
                        {format(new Date(entry.date + "T12:00:00"), "EEE dd MMM", { locale: ar })}
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-ink">{entry.what}</div>
                        {entry.note && (
                          <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1 max-w-xs">
                            {entry.note}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                          <span className="text-xs">{entry.category}</span>
                        </div>
                      </td>
                      <td className="p-4 text-muted-foreground text-xs">{entry.source}</td>
                      <td className="p-4 text-center font-display font-semibold text-ink">
                        {entry.hoursRecovered ? `+${entry.hoursRecovered}` : "—"}
                      </td>
                      <td className="p-4 text-center">
                        <Badge
                          variant="outline"
                          className={`${outcomeDetails.color} font-normal px-2 py-0.5 text-xs`}
                        >
                          {outcomeDetails.label}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() =>
                            deleteEntry.mutate(
                              { id: entry.id },
                              { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetLogEntriesQueryKey() }) }
                            )
                          }
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-muted-foreground">
                    {hasFilters ? "لا توجد نتائج تطابق الفلتر" : 'لا توجد سجلات بعد — ابدأ بتسجيل أول "لا" لك'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
