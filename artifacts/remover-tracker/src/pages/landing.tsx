import { useLocation } from "wouter";
import { ShieldBan, CheckCircle, TrendingUp, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/AppContext";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function Landing() {
  const [, setLocation] = useLocation();
  const { T, lang } = useApp();

  const features = [
    { icon: ShieldBan, title: lang === "ar" ? "سجّل التزاماتك" : "Log Your Commitments", desc: lang === "ar" ? "وثّق كل مرة قلت فيها لا" : "Document every time you say no" },
    { icon: CheckCircle, title: lang === "ar" ? "تابع تقدمك" : "Track Progress", desc: lang === "ar" ? "تابع معدل الالتزام والاستمرار" : "Monitor your commitment rate & streak" },
    { icon: TrendingUp, title: lang === "ar" ? "خطط يومك" : "Plan Your Day", desc: lang === "ar" ? "جهّز قائمة الممنوعات اليومية" : "Prepare your daily ban list" },
    { icon: Clock, title: lang === "ar" ? "استرد وقتك" : "Reclaim Your Time", desc: lang === "ar" ? "احسب الساعات التي استردتها" : "Calculate hours you've recovered" },
  ];

  return (
    <div className="min-h-[100dvh] bg-parchment flex flex-col" dir={lang === "ar" ? "rtl" : "ltr"}>
      {/* Header */}
      <header className="flex items-center justify-between p-6 border-b border-parchment-2">
        <div className="flex items-center gap-3">
          <ShieldBan className="w-8 h-8 text-gold" />
          <div>
            <h1 className="text-xl font-bold font-display text-ink">{T("appName")}</h1>
            <p className="text-xs text-muted-foreground">{T("appTagline")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setLocation("/sign-in")}>
            {T("signIn")}
          </Button>
          <Button size="sm" className="bg-gold text-ink hover:bg-gold/90" onClick={() => setLocation("/sign-up")}>
            {T("signUp")}
          </Button>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center max-w-3xl mx-auto w-full">
        <div className="w-20 h-20 rounded-full bg-gold/10 flex items-center justify-center mb-8">
          <ShieldBan className="w-10 h-10 text-gold" />
        </div>
        <h2 className="text-4xl md:text-5xl font-display font-bold text-ink mb-6 leading-tight">
          {T("appName")}
        </h2>
        <p className="text-lg text-muted-foreground mb-10 max-w-xl leading-relaxed">
          {T("appMotto")}
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            size="lg"
            className="bg-gold text-ink hover:bg-gold/90 font-bold text-base px-8"
            onClick={() => setLocation("/sign-up")}
          >
            {lang === "ar" ? "ابدأ مجاناً" : "Start for Free"}
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="text-base px-8"
            onClick={() => setLocation("/sign-in")}
          >
            {T("signIn")}
          </Button>
        </div>
      </main>

      {/* Features */}
      <section className="px-6 py-16 bg-white/50">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <div key={i} className="text-center p-4">
              <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center mx-auto mb-3">
                <f.icon className="w-6 h-6 text-gold" />
              </div>
              <h3 className="font-semibold text-ink mb-1">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-muted-foreground border-t border-parchment-2">
        {T("copyright")}
      </footer>
    </div>
  );
}
