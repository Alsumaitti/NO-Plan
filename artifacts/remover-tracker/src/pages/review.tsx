import { Card, CardContent } from "@/components/ui/card";
import { format, subDays } from "date-fns";
import { ar } from "date-fns/locale";

const prompts = [
  "ما الـ'لا' التي أحدثت أكبر فرق هذا الأسبوع؟",
  "متى تراجعت، وما الذي جعلني أتراجع؟",
  "ما الذي أريد أن أُضيفه لقائمة المنع الدائمة؟",
  "كيف شعرتُ حين قلتُ 'لا' بوعي؟"
];

export default function Review() {
  const today = new Date();
  const startOfWeek = subDays(today, 6);
  
  const weekRange = `${format(startOfWeek, "d MMM", { locale: ar })} - ${format(today, "d MMM", { locale: ar })}`;

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="text-center space-y-4 mb-12">
        <h2 className="text-4xl font-display font-bold text-ink">المراجعة الأسبوعية</h2>
        <p className="text-lg text-muted-foreground">خُذ نفساً عميقاً، وراجع أسبوعك بصراحة.</p>
        <div className="inline-block bg-parchment-2 text-ink-2 px-4 py-1.5 rounded-full text-sm font-medium border border-border">
          أسبوع: {weekRange}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {prompts.map((prompt, i) => (
          <Card key={i} className="border-gold/20 shadow-sm bg-white/60 backdrop-blur hover:bg-white transition-colors">
            <CardContent className="p-8">
              <div className="text-gold-deep/30 font-display text-4xl font-bold mb-4">{i + 1}</div>
              <h3 className="text-xl font-medium text-ink leading-relaxed mb-6">
                {prompt}
              </h3>
              <div className="h-32 border-b-2 border-dotted border-parchment-2 w-full mt-auto relative">
                {/* Visual lines to look like a journal */}
                <div className="absolute top-1/3 left-0 w-full border-b-2 border-dotted border-parchment-2" />
                <div className="absolute top-2/3 left-0 w-full border-b-2 border-dotted border-parchment-2" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="bg-ink text-parchment p-8 rounded-xl text-center mt-12 relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-teal/20 rounded-full blur-3xl"></div>
        <div className="absolute -left-8 -bottom-8 w-32 h-32 bg-gold/20 rounded-full blur-3xl"></div>
        
        <h3 className="text-2xl font-serif mb-4 relative z-10">استعد للأسبوع القادم</h3>
        <p className="text-parchment-2/80 relative z-10 max-w-lg mx-auto">
          الهدف ليس الكمال، بل الوعي. كل أسبوع هو فرصة جديدة لحماية مساحتك ووقتك وانتباهك.
        </p>
      </div>
    </div>
  );
}
