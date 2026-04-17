import { useState } from "react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { 
  useGetLogEntries, 
  getGetLogEntriesQueryKey,
  useCreateLogEntry,
  useDeleteLogEntry
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus } from "lucide-react";
import { CATEGORIES, getCategoryIcon, OUTCOMES } from "@/lib/constants";
import { useQueryClient } from "@tanstack/react-query";

export default function Tracker() {
  const queryClient = useQueryClient();
  const { data: entries } = useGetLogEntries({ query: { queryKey: getGetLogEntriesQueryKey() } });
  const createEntry = useCreateLogEntry();
  const deleteEntry = useDeleteLogEntry();

  const [isAdding, setIsAdding] = useState(false);
  
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [what, setWhat] = useState("");
  const [source, setSource] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [hoursRecovered, setHoursRecovered] = useState("");
  const [outcome, setOutcome] = useState<"Held" | "Partial" | "Caved">("Held");
  const [note, setNote] = useState("");

  const handleSave = () => {
    if (!what || !source) return;
    
    createEntry.mutate({
      data: {
        date,
        what,
        source,
        category,
        hoursRecovered: hoursRecovered ? parseFloat(hoursRecovered) : null,
        outcome,
        note: note || null
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetLogEntriesQueryKey() });
        setIsAdding(false);
        setWhat("");
        setSource("");
        setHoursRecovered("");
        setNote("");
        setOutcome("Held");
      }
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-display font-bold text-ink">سجل الإزالة</h2>
          <p className="text-muted-foreground mt-1">توثيق كل موقف قلت فيه "لا"</p>
        </div>
        <Button onClick={() => setIsAdding(!isAdding)} className="bg-ink hover:bg-ink-2 text-white">
          <Plus className="w-4 h-4 mr-2" />
          سجل موقفاً جديداً
        </Button>
      </div>

      {isAdding && (
        <Card className="border-gold/30 shadow-md bg-parchment-2">
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>التاريخ</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>ما الذي قلت له لا؟</Label>
                <Input value={what} onChange={e => setWhat(e.target.value)} placeholder="مثال: طلب اجتماع غير ضروري" />
              </div>
              <div className="space-y-2">
                <Label>المصدر / المحفز</Label>
                <Input value={source} onChange={e => setSource(e.target.value)} placeholder="مثال: زميل العمل" />
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
              <div className="space-y-2">
                <Label>ساعات تم استردادها (اختياري)</Label>
                <Input type="number" step="0.5" value={hoursRecovered} onChange={e => setHoursRecovered(e.target.value)} placeholder="0.5" />
              </div>
              <div className="space-y-2">
                <Label>النتيجة</Label>
                <select 
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                  value={outcome} 
                  onChange={e => setOutcome(e.target.value as any)}
                >
                  {OUTCOMES.map(out => (
                    <option key={out.value} value={out.value}>{out.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>ملاحظات (اختياري)</Label>
              <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="كيف شعرت؟ وماذا تعلمت؟" className="resize-none bg-background" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setIsAdding(false)}>إلغاء</Button>
              <Button onClick={handleSave} className="bg-teal hover:bg-teal/90 text-white">حفظ السجل</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-muted/50 text-muted-foreground border-b border-border">
              <tr>
                <th className="p-4 font-medium">التاريخ</th>
                <th className="p-4 font-medium">الموضوع</th>
                <th className="p-4 font-medium">الفئة</th>
                <th className="p-4 font-medium">المصدر</th>
                <th className="p-4 font-medium text-center">ساعات مستردة</th>
                <th className="p-4 font-medium text-center">النتيجة</th>
                <th className="p-4 font-medium w-10"></th>
              </tr>
            </thead>
            <tbody>
              {entries && entries.length > 0 ? (
                entries.map(entry => {
                  const Icon = getCategoryIcon(entry.category);
                  const outcomeDetails = OUTCOMES.find(o => o.value === entry.outcome) || OUTCOMES[0];
                  
                  return (
                    <tr key={entry.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                      <td className="p-4 whitespace-nowrap text-muted-foreground">
                        {format(new Date(entry.date), "dd MMM yyyy", { locale: ar })}
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-ink">{entry.what}</div>
                        {entry.note && <div className="text-xs text-muted-foreground mt-1 truncate max-w-xs">{entry.note}</div>}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Icon className="w-4 h-4" />
                          <span>{entry.category}</span>
                        </div>
                      </td>
                      <td className="p-4 text-muted-foreground">{entry.source}</td>
                      <td className="p-4 text-center font-display font-medium text-ink">
                        {entry.hoursRecovered ? `+${entry.hoursRecovered}` : '-'}
                      </td>
                      <td className="p-4 text-center">
                        <Badge variant="outline" className={`${outcomeDetails.color} font-normal px-2 py-0.5`}>
                          {outcomeDetails.label}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            deleteEntry.mutate({ id: entry.id }, {
                              onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetLogEntriesQueryKey() })
                            });
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    لا توجد سجلات بعد. ابدأ بتسجيل أول "لا" لك!
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
