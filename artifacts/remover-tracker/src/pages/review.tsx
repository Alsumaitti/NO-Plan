import { Card, CardContent } from "@/components/ui/card";
import { format, subDays } from "date-fns";
import { arSA, enUS } from "date-fns/locale";
import { useApp } from "@/lib/AppContext";
import { RefreshCcw } from "lucide-react";

export default function Review() {
  const { lang, T } = useApp();
  const locale = lang === "ar" ? arSA : enUS;
  const today = new Date();
  const startOfWeek = subDays(today, 6);
  const weekRange = `${format(startOfWeek, "d MMM", { locale })} - ${format(today, "d MMM", { locale })}`;

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
        <div className="inline-block bg-parchment-2 text-ink-2 px-4 py-1.5 rounded-full text-sm font-medium border border-border">
          {lang === "ar" ? `أسبوع: ${weekRange}` : `Week: ${weekRange}`}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {prompts.map((prompt, i) => (
          <Card key={i} className="border-gold/20 shadow-sm bg-white/60 dark:bg-card backdrop-blur hover:bg-white dark:hover:bg-card/80 transition-colors">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-gold-deep mb-3">{i + 1}.</p>
              <p className="font-medium text-ink mb-4 leading-relaxed">{prompt}</p>
              <textarea
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
