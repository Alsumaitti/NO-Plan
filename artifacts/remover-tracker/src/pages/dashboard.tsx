import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { 
  useGetDashboardStats, 
  getGetDashboardStatsQueryKey,
  useGetDashboardActivity,
  getGetDashboardActivityQueryKey,
  useGetDashboardByCategory,
  getGetDashboardByCategoryQueryKey,
  useGetDailyItems,
  getGetDailyItemsQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Flame, Target, ShieldBan, Clock } from "lucide-react";
import { motion } from "framer-motion";

const COLORS = ['#C8553D', '#0E5B5B', '#C9A14A', '#8A6A22', '#6B8E4E', '#1E2D46', '#0F1B2D', '#a1a1aa'];

export default function Dashboard() {
  const { data: stats } = useGetDashboardStats({ query: { queryKey: getGetDashboardStatsQueryKey() } });
  const { data: activity } = useGetDashboardActivity({ query: { queryKey: getGetDashboardActivityQueryKey() } });
  const { data: categories } = useGetDashboardByCategory({ query: { queryKey: getGetDashboardByCategoryQueryKey() } });
  const { data: dailyItems } = useGetDailyItems({ query: { queryKey: getGetDailyItemsQueryKey() } });

  const today = format(new Date(), "EEEE، d MMMM", { locale: ar });

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-ink">مرحباً بك</h2>
          <p className="text-muted-foreground mt-1">{today}</p>
        </div>
      </div>

      {/* Motivational Quote */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-parchment-2 p-8 rounded-xl border border-gold/20 overflow-hidden"
      >
        <div className="absolute top-4 right-4 text-gold opacity-20 text-6xl font-serif">"</div>
        <p className="text-xl md:text-2xl font-serif text-ink-2 text-center leading-relaxed relative z-10">
          ما لا تفعله يحدد ما يمكنك فعله. كل "لا" صغيرة هي "نعم" كبيرة لشيء أهم.
        </p>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard 
          title="معدل الالتزام" 
          value={`${stats?.commitmentRate ?? 0}%`} 
          icon={<Target className="w-5 h-5 text-teal" />}
          gradient="bg-gradient-to-r from-teal to-teal/60"
        />
        <KPICard 
          title="سلسلة الاستمرار" 
          value={`${stats?.streak ?? 0} أيام`} 
          icon={<Flame className="w-5 h-5 text-coral" />}
          gradient="bg-gradient-to-r from-coral to-coral/60"
        />
        <KPICard 
          title="إجمالي اللاءات" 
          value={stats?.totalNos ?? 0} 
          icon={<ShieldBan className="w-5 h-5 text-gold-deep" />}
          gradient="bg-gradient-to-r from-gold-deep to-gold"
        />
        <KPICard 
          title="ساعات مستردة" 
          value={stats?.hoursRecovered ?? 0} 
          icon={<Clock className="w-5 h-5 text-sage" />}
          gradient="bg-gradient-to-r from-sage to-sage/60"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Activity Chart */}
        <Card className="border-parchment-2 shadow-sm">
          <CardHeader>
            <CardTitle className="font-display">نشاط آخر 14 يوم</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {activity && activity.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activity}>
                  <XAxis dataKey="date" tickFormatter={(val) => format(new Date(val), 'd MMM', { locale: ar })} />
                  <YAxis />
                  <Tooltip labelFormatter={(val) => format(new Date(val), 'EEEE، d MMMM', { locale: ar })} />
                  <Bar dataKey="count" fill="var(--color-gold-deep)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">لا توجد بيانات كافية</div>
            )}
          </CardContent>
        </Card>

        {/* Categories Chart */}
        <Card className="border-parchment-2 shadow-sm">
          <CardHeader>
            <CardTitle className="font-display">توزيع الفئات</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {categories && categories.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categories}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="category"
                  >
                    {categories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">لا توجد بيانات كافية</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Today's Preview */}
      <Card className="border-parchment-2 shadow-sm">
        <CardHeader>
          <CardTitle className="font-display">متبقي لليوم</CardTitle>
          <CardDescription>قائمة الممنوعات المخطط لها اليوم</CardDescription>
        </CardHeader>
        <CardContent>
          {dailyItems && dailyItems.length > 0 ? (
            <div className="space-y-3">
              {dailyItems.filter(item => !item.done).map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-parchment/50 rounded-lg border border-border">
                  <span className="font-medium">{item.what}</span>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>خطر: {item.riskLevel}/5</span>
                  </div>
                </div>
              ))}
              {dailyItems.filter(item => !item.done).length === 0 && (
                <div className="text-center py-4 text-muted-foreground">تم إنجاز كل شيء!</div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">لا توجد خطة لليوم. اذهب إلى "خطة اليوم" لإضافتها.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KPICard({ title, value, icon, gradient }: { title: string, value: string | number, icon: React.ReactNode, gradient: string }) {
  return (
    <Card className="overflow-hidden border-parchment-2 shadow-sm relative">
      <div className={`h-1 w-full ${gradient} absolute top-0 left-0`} />
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
            <h3 className="text-2xl font-bold text-ink">{value}</h3>
          </div>
          <div className="p-3 bg-parchment rounded-full">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
