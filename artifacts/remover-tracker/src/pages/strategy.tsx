import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

export default function Strategy() {
  return (
    <div className="space-y-8 max-w-3xl mx-auto pb-12">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-display font-bold text-ink mb-4">استراتيجية الإزالة</h2>
        <p className="text-lg text-muted-foreground font-serif max-w-2xl mx-auto">
          الإنتاجية ليست في فعل المزيد، بل في التخلص من غير الضروري بلا رحمة.
        </p>
      </div>

      <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-coral before:via-gold before:to-sage">
        
        <LayerCard 
          number="1"
          color="bg-coral"
          textColor="text-coral"
          title="الوضوح"
          desc="اعرف ما لا تفعله قبل أن تبدأ يومك"
          details="قرارات اللحظة الأخيرة تستهلك طاقة الإرادة. حدد الممنوعات مسبقاً في خطة اليوم."
        />

        <LayerCard 
          number="2"
          color="bg-gold"
          textColor="text-gold-deep"
          title="الاستبدال"
          desc="كل 'لا' يحتاج 'نعم' أخرى تملأ الفراغ"
          details="الطبيعة تكره الفراغ. إذا منعت نفسك من تصفح الجوال، فماذا ستفعل بدلاً من ذلك؟ ضع كتاباً أو كوب ماء."
        />

        <LayerCard 
          number="3"
          color="bg-teal"
          textColor="text-teal"
          title="التخطيط المُسبق"
          desc="خطط لمحفّزاتك بـ'إذا... فإنّي...'"
          details="لا تعتمد على قوة الإرادة وقت الضعف. ضع خطة واضحة لما ستفعله عندما يضربك المحفز."
        />

        <LayerCard 
          number="4"
          color="bg-sage"
          textColor="text-sage"
          title="المراجعة"
          desc="راجع أسبوعيًّا وعدّل قائمتك"
          details="قائمة الممنوعات تتطور معك. ما كان مغرياً بالأمس قد لا يكون كذلك اليوم."
        />

      </div>

      <div className="mt-16 bg-parchment-2 border border-border p-8 rounded-xl shadow-sm">
        <h3 className="font-display text-2xl font-bold text-ink mb-6 text-center">أسئلة الفلترة السريعة</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            "هل هذا يخدمني أم يخدم أجندة شخص آخر؟",
            "هل سأندم على هذا الوقت غداً؟",
            "هل أقول نعم بدافع الحرج؟",
            "هل هذا النشاط يغذي طاقتي أم يمتصها؟"
          ].map((q, i) => (
            <div key={i} className="flex items-start gap-3 bg-white p-4 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-gold mt-0.5 shrink-0" />
              <p className="font-medium text-ink-2">{q}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LayerCard({ number, color, textColor, title, desc, details }: { number: string, color: string, textColor: string, title: string, desc: string, details: string }) {
  return (
    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
      {/* Icon */}
      <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-background ${color} text-white font-bold font-display shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 absolute right-0 md:left-1/2 md:right-auto transform translate-x-1/2`}>
        {number}
      </div>
      
      {/* Card */}
      <Card className="w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)] shadow-sm hover:shadow-md transition-all mr-12 md:mr-0 border-border relative overflow-hidden">
        <div className={`absolute top-0 right-0 w-1 h-full ${color}`} />
        <CardContent className="p-6">
          <h4 className={`font-display text-xl font-bold mb-2 ${textColor}`}>{title}</h4>
          <p className="font-medium text-ink mb-2">{desc}</p>
          <p className="text-sm text-muted-foreground leading-relaxed">{details}</p>
        </CardContent>
      </Card>
    </div>
  );
}
