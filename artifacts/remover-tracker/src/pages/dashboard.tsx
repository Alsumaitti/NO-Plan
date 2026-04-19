import { useQuery } from "@tanstack/react-query";
import { Flame, Trophy, TrendingUp, Clock, ShieldBan, Calendar, Activity, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApp } from "@/lib/AppContext";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { format, subDays, parseISO } from "date-fns";
import { arSA, enUS } from "date-fns/locale";

interface DashboardStats {
  totalNos: number;
  weekNos: number;
  hoursRecovered: number;
  commitmentRate: number;
  streak: number;
  bestStreak: number;
  todayNos: number;
  monthNos: number;
  lastLoginAt?: string;
  recentActivity: { date: string; count: number; held: number; caved: number; partial: number }[];
  categoryBreakdown: { category: string; count: number }[];
}

const COLORS = ["#C9A94A", "#0E5B5B", "#C8553D", "#6B8E4E", "#8B6914", "#1E6B6B", "#A0522D", "#4A7C59"];

function StatCard({
  icon: Icon, label, value, sub, color
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  sub?: string;
  color?: string;
}) {
  return (
    <Card className="border-parchment-2 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="pt-5 pb-4 px-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-1">{label}</p>
            <p className={`text-3xl font-bold font-display ${color ?? "text-ink"}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-opacity-10 ${color ? `bg-current` : "bg-gold/10"}`} style={{ backgroundColor: "rgba(201,169,74,0.12)" }}>
            <Icon className={`w-5 h-5 ${color ?? "text-gold"}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { T, lang } = useApp();
  const locale = lang === "ar" ? arSA : enUS;

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["dashboard-stats"],
    queryFn: () => fetch("/api/dashboard/stats").then(r => r.json()),
    staleTime: 30000,
  });

  // Get widget preferences
  const { data: settings } = useQuery<{ dashboardWidgets?: string[] }>({
    queryKey: ["settings"],
    queryFn: () => fetch("/api/settings").then(r => r.json()),
    staleTime: 120000,
  });
  const widgets = settings?.dashboardWidgets ?? ["stats", "streak", "activity", "categories", "lastLogin"];
  const showWidget = (key: string) => widgets.includes(key);

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const s = stats ?? {} as DashboardStats;

  const activityData = (s.recentActivity ?? []).map(d => ({
    date: format(parseISO(d.date), "dd/MM", { locale }),
    [T("held")]: d.held,
    [T("partial")]: d.partial,
    [T("caved")]: d.caved,
  }));

  const categoryData = (s.categoryBreakdown ?? [])
    .filter(c => c.count > 0)
    .map(c => ({ name: c.category || (lang === "ar" ? "أخرى" : "Other"), value: c.count }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-display font-bold text-ink">{T("dashboard")}</h2>
        <p className="text-muted-foreground mt-1 font-serif italic text-sm">{T("appMotto")}</p>
      </div>

      {/* KPI Stats */}
      {showWidget("stats") && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={ShieldBan} label={T("totalNos")} value={s.totalNos ?? 0} color="text-gold" />
          <StatCard icon={Calendar} label={T("weekNos")} value={s.weekNos ?? 0} />
          <StatCard icon={Clock} label={T("hoursRecovered")} value={s.hoursRecovered ?? 0} sub={lang === "ar" ? "ساعة" : "hrs"} />
          <StatCard
            icon={TrendingUp}
            label={T("commitmentRate")}
            value={`${s.commitmentRate ?? 0}%`}
            color={(s.commitmentRate ?? 0) >= 70 ? "text-green-600" : (s.commitmentRate ?? 0) >= 40 ? "text-amber-600" : "text-red-600"}
          />
        </div>
      )}

      {/* Streak Row */}
      {showWidget("streak") && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Flame} label={T("streak")} value={s.streak ?? 0} sub={T("days")} color="text-amber-600" />
          <StatCard icon={Trophy} label={T("bestStreak")} value={s.bestStreak ?? 0} sub={T("days")} color="text-yellow-600" />
          <StatCard icon={Star} label={T("todayNos")} value={s.todayNos ?? 0} color="text-teal" />
          <StatCard icon={Activity} label={T("monthNos")} value={s.monthNos ?? 0} />
        </div>
      )}

      {/* Last Login */}
      {showWidget("lastLogin") && s.lastLoginAt && (
        <Card className="border-parchment-2 shadow-sm">
          <CardContent className="py-3 px-5">
            <p className="text-sm text-muted-foreground">
              {T("lastLogin")}: <span className="text-ink font-medium">
                {format(parseISO(s.lastLoginAt), "PPP p", { locale })}
              </span>
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Bar Chart */}
        {showWidget("activity") && activityData.length > 0 && (
          <Card className="border-parchment-2 shadow-sm">
            <CardHeader><CardTitle className="font-display text-base">{T("recentActivity")}</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={activityData} margin={{ top: 4, right: 4, left: -30, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey={T("held")} fill="#0E5B5B" radius={[4, 4, 0, 0]} stackId="a" />
                  <Bar dataKey={T("partial")} fill="#C9A94A" radius={[0, 0, 0, 0]} stackId="a" />
                  <Bar dataKey={T("caved")} fill="#C8553D" radius={[0, 0, 4, 4]} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Category Breakdown */}
        {showWidget("categories") && categoryData.length > 0 && (
          <Card className="border-parchment-2 shadow-sm">
            <CardHeader><CardTitle className="font-display text-base">{T("categoryBreakdown")}</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                    {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Legend iconSize={10} iconType="circle" formatter={(v) => <span className="text-xs">{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Empty state */}
      {!s.totalNos && (
        <Card className="border-dashed border-parchment-2 bg-transparent shadow-none">
          <CardContent className="py-16 text-center">
            <ShieldBan className="w-12 h-12 text-gold/40 mx-auto mb-4" />
            <p className="text-muted-foreground font-serif italic text-lg">{T("noData")}</p>
            <p className="text-sm text-muted-foreground mt-2">
              {lang === "ar" ? "ابدأ بتسجيل أول قرار في سجل الإزالة" : "Start by logging your first decision in the tracker"}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
