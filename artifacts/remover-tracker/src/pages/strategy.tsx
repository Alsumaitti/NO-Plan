import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApp } from "@/lib/AppContext";
import { Lightbulb, Target, Brain, ShieldCheck, Zap } from "lucide-react";

export default function Strategy() {
  const { lang, T } = useApp();

  const principles = lang === "ar" ? [
    {
      icon: Brain,
      title: "الوعي قبل القرار",
      desc: "قبل أن تقول نعم لأي شيء، خُذ ثلاث ثوانٍ واسأل نفسك: هل هذا يقودني نحو هدفي أم يبعدني عنه؟"
    },
    {
      icon: Target,
      title: "حدّد ما لا تريد أولاً",
      desc: "أغلب الناس يعرفون ما يريدون، لكن القلة فقط تعرف بوضوح ما لا تريد. قائمة المنع أقوى من قائمة الأهداف."
    },
    {
      icon: ShieldCheck,
      title: "الحدود تحمي الأهداف",
      desc: "كل 'لا' لشيء غير مهم هي 'نعم' لشيء أهم. الحدود الواضحة تحرر الطاقة والوقت."
    },
    {
      icon: Zap,
      title: "العادة فوق الإرادة",
      desc: "لا تعتمد على قوة الإرادة. حوّل إزالاتك الأساسية إلى قواعد تلقائية لا تحتاج قراراً كل مرة."
    },
  ] : [
    {
      icon: Brain,
      title: "Awareness Before Decision",
      desc: "Before saying yes to anything, take three seconds and ask yourself: Does this move me toward my goal or away from it?"
    },
    {
      icon: Target,
      title: "Define What You Don't Want First",
      desc: "Most people know what they want, but few clearly know what they don't want. A ban list is more powerful than a goals list."
    },
    {
      icon: ShieldCheck,
      title: "Boundaries Protect Goals",
      desc: "Every 'No' to something unimportant is a 'Yes' to something more important. Clear boundaries free up energy and time."
    },
    {
      icon: Zap,
      title: "Habit Over Willpower",
      desc: "Don't rely on willpower. Turn your key removals into automatic rules that don't require a decision each time."
    },
  ];

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <div className="w-16 h-16 rounded-2xl bg-gold/10 flex items-center justify-center mx-auto mb-4">
          <Lightbulb className="w-8 h-8 text-gold" />
        </div>
        <h2 className="text-4xl font-display font-bold text-ink">
          {lang === "ar" ? "استراتيجية الإزالة" : "Removal Strategy"}
        </h2>
        <p className="text-lg text-muted-foreground mt-2 font-serif italic">
          {lang === "ar" ? "المبادئ التي تجعل قوة اللا فعّالة" : "Principles that make the power of No effective"}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {principles.map((p, i) => (
          <Card key={i} className="border-gold/20 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
                  <p.icon className="w-5 h-5 text-gold" />
                </div>
                <CardTitle className="font-display text-base">{p.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quote */}
      <Card className="border-gold/30 bg-gold/5 shadow-none">
        <CardContent className="py-8 text-center">
          <p className="text-xl font-serif italic text-ink-2 leading-relaxed max-w-2xl mx-auto">
            {lang === "ar"
              ? '"ما لا تفعله يحدد ما يمكنك فعله. كل \"لا\" صغيرة هي \"نعم\" كبيرة لشيء أهم."'
              : '"What you don\'t do defines what you can do. Every small \'No\' is a big \'Yes\' to something more important."'}
          </p>
        </CardContent>
      </Card>

      <div className="text-center text-xs text-muted-foreground pt-8 border-t border-parchment-2">
        {T("copyright")}
      </div>
    </div>
  );
}
