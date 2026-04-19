import { useState } from "react";
import { useLocation } from "wouter";
import { useApp } from "@/lib/AppContext";
import { Button } from "@/components/ui/button";
import { ShieldBan, Globe, Sun, Moon, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { lang, setLang, dark, setDark, T } = useApp();
  const [step, setStep] = useState(0);

  const saveAndFinish = async () => {
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: lang, darkMode: dark, onboardingComplete: true }),
      });
    } catch {}
    setLocation("/");
  };

  const steps = [
    // Step 0: Welcome
    <div key="welcome" className="text-center space-y-6">
      <div className="w-24 h-24 rounded-full bg-gold/10 flex items-center justify-center mx-auto">
        <ShieldBan className="w-12 h-12 text-gold" />
      </div>
      <div>
        <h2 className="text-3xl font-display font-bold text-ink">{T("welcomeTitle")}</h2>
        <p className="text-muted-foreground mt-2 text-lg">{T("welcomeSubtitle")}</p>
      </div>
    </div>,

    // Step 1: Language
    <div key="lang" className="space-y-6">
      <div className="text-center">
        <Globe className="w-10 h-10 text-gold mx-auto mb-3" />
        <h3 className="text-2xl font-display font-bold text-ink">{T("step1Title")}</h3>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => setLang("ar")}
          className={`p-6 rounded-2xl border-2 transition-all text-center ${lang === "ar" ? "border-gold bg-gold/10" : "border-border bg-white hover:border-gold/50"}`}
        >
          <div className="text-3xl mb-2">🇸🇦</div>
          <div className="font-bold text-ink">العربية</div>
          <div className="text-sm text-muted-foreground">Arabic</div>
        </button>
        <button
          onClick={() => setLang("en")}
          className={`p-6 rounded-2xl border-2 transition-all text-center ${lang === "en" ? "border-gold bg-gold/10" : "border-border bg-white hover:border-gold/50"}`}
        >
          <div className="text-3xl mb-2">🇺🇸</div>
          <div className="font-bold text-ink">English</div>
          <div className="text-sm text-muted-foreground">الإنجليزية</div>
        </button>
      </div>
    </div>,

    // Step 2: Theme
    <div key="theme" className="space-y-6">
      <div className="text-center">
        <Sun className="w-10 h-10 text-gold mx-auto mb-3" />
        <h3 className="text-2xl font-display font-bold text-ink">{T("step2Title")}</h3>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => setDark(false)}
          className={`p-6 rounded-2xl border-2 transition-all text-center ${!dark ? "border-gold bg-gold/10" : "border-border bg-white hover:border-gold/50"}`}
        >
          <Sun className="w-8 h-8 text-amber-500 mx-auto mb-2" />
          <div className="font-bold text-ink">{T("lightMode")}</div>
        </button>
        <button
          onClick={() => setDark(true)}
          className={`p-6 rounded-2xl border-2 transition-all text-center ${dark ? "border-gold bg-gold/10" : "border-border bg-white hover:border-gold/50"}`}
        >
          <Moon className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
          <div className="font-bold text-ink">{T("darkMode")}</div>
        </button>
      </div>
    </div>,

    // Step 3: Ready
    <div key="ready" className="text-center space-y-6">
      <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center mx-auto">
        <CheckCircle2 className="w-12 h-12 text-green-600" />
      </div>
      <div>
        <h3 className="text-2xl font-display font-bold text-ink">{T("step4Title")}</h3>
        <p className="text-muted-foreground mt-2">
          {lang === "ar" ? "كل شيء جاهز. ابدأ رحلة قوة اللا!" : "Everything is set. Start your No-power journey!"}
        </p>
      </div>
    </div>,
  ];

  const isLast = step === steps.length - 1;
  const isFirst = step === 0;

  return (
    <div className="min-h-[100dvh] bg-parchment flex items-center justify-center p-6" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="w-full max-w-md">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all ${i === step ? "w-8 bg-gold" : i < step ? "w-2 bg-gold/60" : "w-2 bg-border"}`}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="bg-white rounded-2xl shadow-xl border border-parchment-2 p-8 mb-6 min-h-64">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: lang === "ar" ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: lang === "ar" ? 20 : -20 }}
            >
              {steps[step]}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          {!isFirst ? (
            <Button variant="outline" onClick={() => setStep(s => s - 1)}>
              {lang === "ar" ? <ChevronRight className="w-4 h-4 ml-1" /> : <ChevronLeft className="w-4 h-4 mr-1" />}
              {lang === "ar" ? "السابق" : "Back"}
            </Button>
          ) : (
            <Button variant="ghost" onClick={saveAndFinish} className="text-muted-foreground text-sm">
              {T("skipOnboarding")}
            </Button>
          )}

          <Button
            className="bg-gold hover:bg-gold/90 text-ink font-bold"
            onClick={isLast ? saveAndFinish : () => setStep(s => s + 1)}
          >
            {isLast ? T("finish") : T("next")}
            {!isLast && (lang === "ar" ? <ChevronLeft className="w-4 h-4 mr-1" /> : <ChevronRight className="w-4 h-4 ml-1" />)}
          </Button>
        </div>
      </div>
    </div>
  );
}
