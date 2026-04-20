import { useState, useEffect, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApp } from "@/lib/AppContext";
import { useAuthFetch } from "@/lib/apiClient";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MapPin, Sunrise, Sun, Sunset, Moon, Star, Clock,
  Plus, Trash2, Save, Archive as ArchiveIcon, Loader2, AlertCircle, Check,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const PRAYERS_AR = ["الفجر", "الظهر", "العصر", "المغرب", "العشاء"];
const PRAYERS_EN = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
const PRAYER_ICONS = [Sunrise, Sun, Sun, Sunset, Moon];

interface Timings {
  Fajr: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
}

interface LocationInfo { lat: number; lng: number; label?: string; }

// parse "HH:MM" into minutes since midnight
const toMins = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
const fmtTime = (t: string) => t;
const today = () => new Date().toISOString().split("T")[0];

export default function PrayerLaw() {
  const { lang, T } = useApp();
  const qc = useQueryClient();
  const authFetch = useAuthFetch();
  const isRTL = lang === "ar";
  const prayerNames = isRTL ? PRAYERS_AR : PRAYERS_EN;

  // ----- Location -----
  const [loc, setLoc] = useState<LocationInfo | null>(() => {
    try {
      const raw = localStorage.getItem("no-prayer-location");
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });
  const [locError, setLocError] = useState<string>("");
  const [manualCity, setManualCity] = useState("");
  const [locBusy, setLocBusy] = useState(false);

  const saveLoc = (v: LocationInfo) => {
    localStorage.setItem("no-prayer-location", JSON.stringify(v));
    setLoc(v);
  };

  const detectLocation = () => {
    setLocError("");
    if (!navigator.geolocation) {
      setLocError(isRTL ? "المتصفح لا يدعم تحديد الموقع" : "Browser doesn't support geolocation");
      return;
    }
    setLocBusy(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        saveLoc({ lat: p.coords.latitude, lng: p.coords.longitude });
        setLocBusy(false);
      },
      (e) => {
        setLocBusy(false);
        setLocError(
          e.code === 1
            ? (isRTL ? "رفض المتصفح إعطاء الموقع. أدخل مدينتك يدوياً." : "Permission denied. Enter your city manually.")
            : (isRTL ? "تعذّر تحديد الموقع" : "Couldn't get location"),
        );
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 },
    );
  };

  const lookupCity = async () => {
    if (!manualCity.trim()) return;
    setLocError("");
    setLocBusy(true);
    try {
      // Use Aladhan's city resolution via timingsByCity. We'll call it directly when fetching times.
      // But to keep a consistent model, try Nominatim geocoding (free, no key).
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(manualCity)}`,
        { headers: { "Accept": "application/json" } },
      );
      const data = await r.json();
      if (Array.isArray(data) && data[0]) {
        saveLoc({
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          label: data[0].display_name?.split(",")[0] ?? manualCity,
        });
      } else {
        setLocError(isRTL ? "لم نجد هذه المدينة" : "City not found");
      }
    } catch {
      setLocError(isRTL ? "تعذّر الاتصال" : "Connection failed");
    } finally {
      setLocBusy(false);
    }
  };

  // ----- Fetch prayer times (Aladhan API) -----
  const [timings, setTimings] = useState<Timings | null>(null);
  const [timesError, setTimesError] = useState("");
  const [timesBusy, setTimesBusy] = useState(false);

  useEffect(() => {
    if (!loc) return;
    const date = new Date();
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    setTimesBusy(true);
    setTimesError("");
    fetch(`https://api.aladhan.com/v1/timings/${dd}-${mm}-${yyyy}?latitude=${loc.lat}&longitude=${loc.lng}&method=4`)
      .then(r => r.json())
      .then(j => {
        const t = j?.data?.timings;
        if (!t) throw new Error("No timings");
        // Trim to HH:MM
        const clean = (s: string) => s.split(" ")[0].slice(0, 5);
        const cleaned = {
          Fajr: clean(t.Fajr),
          Dhuhr: clean(t.Dhuhr),
          Asr: clean(t.Asr),
          Maghrib: clean(t.Maghrib),
          Isha: clean(t.Isha),
        };
        setTimings(cleaned);
        // Cache so the NotificationCenter can surface prayer-window alerts
        try {
          const dateStr = `${yyyy}-${mm}-${dd}`;
          localStorage.setItem(`no-prayer-timings-${dateStr}`, JSON.stringify(cleaned));
        } catch { /* storage full — ignore */ }
      })
      .catch(() => setTimesError(isRTL ? "تعذّر تحميل أوقات الصلاة" : "Couldn't load prayer times"))
      .finally(() => setTimesBusy(false));
  }, [loc?.lat, loc?.lng, isRTL]);

  // ----- Current & next interval detection -----
  const { currentIdx, nextIdx, nextStart, nextEnd } = useMemo(() => {
    if (!timings) return { currentIdx: -1, nextIdx: -1, nextStart: "", nextEnd: "" };
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const order = [
      { name: "Fajr", t: timings.Fajr },
      { name: "Dhuhr", t: timings.Dhuhr },
      { name: "Asr", t: timings.Asr },
      { name: "Maghrib", t: timings.Maghrib },
      { name: "Isha", t: timings.Isha },
    ];
    const mins = order.map(o => toMins(o.t));
    // find current index: largest i where mins[i] <= now
    let currIdx = -1;
    for (let i = 0; i < mins.length; i++) {
      if (mins[i] <= nowMins) currIdx = i;
    }
    // If before Fajr, we're still in post-Isha (previous day). treat as index 4 (Isha)
    if (currIdx === -1) currIdx = 4;
    // Next interval's START = the prayer after current
    const nIdx = (currIdx + 1) % 5;
    const nStart = order[nIdx].t;
    const nEnd = order[(nIdx + 1) % 5].t;
    return { currentIdx: currIdx, nextIdx: nIdx, nextStart: nStart, nextEnd: nEnd };
  }, [timings]);

  // ----- Plans per interval (localStorage) -----
  const storageKey = useMemo(() => `no-prayer-plans-${today()}-${nextIdx}`, [nextIdx]);
  const [plans, setPlans] = useState<string[]>([""]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (nextIdx < 0) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr) && arr.length) { setPlans(arr); return; }
      }
    } catch { /* */ }
    setPlans([""]);
  }, [storageKey, nextIdx]);

  const savePlans = () => {
    const cleaned = plans.map(p => p.trim()).filter(Boolean);
    localStorage.setItem(storageKey, JSON.stringify(cleaned.length ? cleaned : [""]));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // ----- Archive to log -----
  const archiveMut = useMutation({
    mutationFn: async () => {
      const cleaned = plans.map(p => p.trim()).filter(Boolean);
      if (!cleaned.length) throw new Error("empty");
      const intervalLabel = `${prayerNames[nextIdx]} → ${prayerNames[(nextIdx + 1) % 5]}`;
      const note = cleaned.map((p, i) => `${i + 1}. ${p}`).join("\n");
      const r = await authFetch("/api/log-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: today(),
          what: isRTL ? `قانون الفرض الجاي: ${intervalLabel}` : `Next Prayer Law: ${intervalLabel}`,
          source: isRTL ? "قانون الفرض الجاي" : "Next Prayer Law",
          category: isRTL ? "قانون الفرض الجاي" : "Next Prayer Law",
          outcome: "Held",
          note,
        }),
      });
      if (!r.ok) throw new Error(`${r.status}`);
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["log-entries"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });

  // ----- Render -----
  if (!loc) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <header>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gold/10 flex items-center justify-center">
              <Star className="w-6 h-6 text-gold" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold text-ink">
                {isRTL ? "قانون الفرض الجاي" : "Next Prayer Law"}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {isRTL ? "كل صلاة بداية جديدة — خطّط لمهمتك القادمة" : "Every prayer is a fresh start — plan your next mission"}
              </p>
            </div>
          </div>
        </header>

        <Card className="border-gold/30 bg-gold/5">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-gold mt-0.5 shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-ink mb-1">
                  {isRTL ? "نحتاج موقعك لحساب أوقات الصلاة" : "We need your location to calculate prayer times"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {isRTL
                    ? "اسمح للمتصفح بالوصول، أو أدخل اسم مدينتك."
                    : "Allow browser access, or enter your city name."}
                </p>
              </div>
            </div>

            <Button onClick={detectLocation} disabled={locBusy} className="w-full h-11 gap-2 bg-gold hover:bg-gold/90 text-ink">
              {locBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
              {isRTL ? "استخدام موقعي الحالي" : "Use my current location"}
            </Button>

            <div className="relative my-3 flex items-center">
              <div className="flex-1 h-px bg-border" />
              <span className="px-3 text-xs text-muted-foreground">{isRTL ? "أو" : "or"}</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {isRTL ? "أدخل مدينتك يدوياً" : "Enter city manually"}
              </label>
              <div className="flex gap-2">
                <Input
                  value={manualCity}
                  onChange={e => setManualCity(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") lookupCity(); }}
                  placeholder={isRTL ? "الرياض، جدة، الدمام…" : "Riyadh, Jeddah, Dammam…"}
                  className="h-11"
                />
                <Button onClick={lookupCity} disabled={locBusy || !manualCity.trim()} className="h-11 bg-gold hover:bg-gold/90 text-ink">
                  {locBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : (isRTL ? "بحث" : "Find")}
                </Button>
              </div>
            </div>

            {locError && (
              <div className="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 px-3 py-2 text-sm text-red-800 dark:text-red-200">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{locError}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const CurrentIcon = currentIdx >= 0 ? PRAYER_ICONS[currentIdx] : Clock;
  const NextIcon = nextIdx >= 0 ? PRAYER_ICONS[nextIdx] : Clock;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24">
      {/* Header */}
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gold/10 flex items-center justify-center">
            <Star className="w-6 h-6 text-gold" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink">
              {isRTL ? "قانون الفرض الجاي" : "Next Prayer Law"}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground font-serif italic mt-0.5">
              {isRTL ? "كل صلاة = استعادة حياة ومهمة جديدة" : "Every prayer = life renewal, new mission"}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-9 text-xs gap-1.5"
          onClick={() => { localStorage.removeItem("no-prayer-location"); setLoc(null); }}
        >
          <MapPin className="w-3.5 h-3.5" />
          {loc.label ?? (isRTL ? "تغيير الموقع" : "Change location")}
        </Button>
      </header>

      {timesBusy && (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-gold" />
        </div>
      )}

      {timesError && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 px-3 py-3 text-sm text-red-800 dark:text-red-200">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{timesError}</span>
        </div>
      )}

      {timings && (
        <>
          {/* Prayer times row */}
          <Card className="border-parchment-2 shadow-sm">
            <CardContent className="p-4 grid grid-cols-5 gap-2">
              {prayerNames.map((name, i) => {
                const Icon = PRAYER_ICONS[i];
                const times = [timings.Fajr, timings.Dhuhr, timings.Asr, timings.Maghrib, timings.Isha];
                const active = i === currentIdx;
                const next = i === nextIdx;
                return (
                  <div
                    key={name}
                    className={`flex flex-col items-center gap-1 py-2 rounded-lg text-center ${
                      active ? "bg-teal/10 border border-teal/30" :
                      next ? "bg-gold/10 border border-gold/30" :
                      "bg-muted/30"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${active ? "text-teal" : next ? "text-gold" : "text-muted-foreground"}`} />
                    <span className={`text-[10px] font-medium ${active || next ? "text-ink" : "text-muted-foreground"}`}>{name}</span>
                    <span className={`text-[11px] tabular ${active || next ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
                      {fmtTime(times[i])}
                    </span>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Current interval banner */}
          <div className="rounded-xl border border-teal/30 bg-teal/5 px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-teal/15 flex items-center justify-center shrink-0">
              <CurrentIcon className="w-4 h-4 text-teal" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">
                {isRTL ? "أنت الآن بين" : "You're currently between"}
              </p>
              <p className="text-sm font-semibold text-ink">
                {prayerNames[currentIdx]} {isRTL ? "و" : "and"} {prayerNames[(currentIdx + 1) % 5]}
              </p>
            </div>
          </div>

          {/* Next interval plan card */}
          <Card className="border-gold/40 shadow-md">
            <CardHeader className="px-5 pt-5 pb-3 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gold/15 flex items-center justify-center shrink-0">
                  <NextIcon className="w-5 h-5 text-gold" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">
                    {isRTL ? "خطّط للفترة القادمة" : "Plan for the upcoming interval"}
                  </p>
                  <p className="font-display font-bold text-lg text-ink">
                    {isRTL ? "بين" : "Between"} {prayerNames[nextIdx]} {isRTL ? "و" : "and"} {prayerNames[(nextIdx + 1) % 5]}
                  </p>
                  <p className="text-xs text-muted-foreground tabular mt-0.5">
                    {fmtTime(nextStart)} – {fmtTime(nextEnd)}
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-5 space-y-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isRTL
                  ? "اكتب كل شيء بدون ضغط — حتى النوم والأكل. كل مهمة بداية جديدة."
                  : "Write everything freely — even sleep and meals. Every task is a new start."}
              </p>

              <ul className="space-y-2">
                <AnimatePresence initial={false}>
                  {plans.map((p, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="flex items-center gap-2"
                    >
                      <span className="inline-flex w-7 h-7 items-center justify-center rounded-full bg-gold/15 text-gold-deep font-semibold text-xs tabular shrink-0">
                        {i + 1}
                      </span>
                      <Input
                        value={p}
                        onChange={e => {
                          const next = [...plans];
                          next[i] = e.target.value;
                          setPlans(next);
                        }}
                        onKeyDown={e => {
                          if (e.key === "Enter" && p.trim()) {
                            if (i === plans.length - 1) setPlans([...plans, ""]);
                          }
                        }}
                        placeholder={isRTL ? `مهمة ${i + 1} — اكتب أي شيء` : `Task ${i + 1} — write anything`}
                        className="h-10"
                      />
                      {plans.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setPlans(plans.filter((_, idx) => idx !== i))}
                          className="shrink-0 w-8 h-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                          aria-label={isRTL ? "حذف" : "Delete"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>

              <div className="flex items-center gap-2 flex-wrap pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPlans([...plans, ""])}
                  className="h-9 gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {isRTL ? "أضف مهمة" : "Add task"}
                </Button>
                <Button
                  size="sm"
                  onClick={savePlans}
                  className="h-9 gap-1.5 bg-foreground text-background hover:bg-foreground/90"
                >
                  {saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                  {saved ? (isRTL ? "تم الحفظ" : "Saved") : (isRTL ? "حفظ" : "Save")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => archiveMut.mutate()}
                  disabled={archiveMut.isPending || !plans.some(p => p.trim())}
                  className="h-9 gap-1.5 border-gold/40 text-gold-deep hover:bg-gold/10"
                >
                  {archiveMut.isPending
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <ArchiveIcon className="w-3.5 h-3.5" />}
                  {isRTL ? "رحِّل إلى السجل" : "Archive to log"}
                </Button>
                {archiveMut.isSuccess && (
                  <span className="text-xs text-green-600 dark:text-green-400 inline-flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    {isRTL ? "رُحِّل" : "Archived"}
                  </span>
                )}
                {archiveMut.isError && (
                  <span className="text-xs text-red-600 dark:text-red-400">
                    {isRTL ? "تعذّر الترحيل" : "Archive failed"}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <div className="text-center text-xs text-muted-foreground pt-6">
        {T("copyright")}
      </div>
    </div>
  );
}
