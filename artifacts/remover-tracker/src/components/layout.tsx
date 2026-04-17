import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  CalendarDays, 
  ListTodo, 
  ShieldBan, 
  RefreshCcw, 
  Lightbulb,
  LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "لوحة التحكم", icon: LayoutDashboard },
  { href: "/daily", label: "خطة اليوم", icon: CalendarDays },
  { href: "/tracker", label: "السجل", icon: ListTodo },
  { href: "/master", label: "قائمة المنع", icon: ShieldBan },
  { href: "/review", label: "المراجعة", icon: RefreshCcw },
  { href: "/strategy", label: "الاستراتيجية", icon: Lightbulb },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background text-foreground font-sans">
      <aside className="w-full md:w-64 bg-sidebar border-b md:border-b-0 md:border-l border-sidebar-border shrink-0 md:h-[100dvh] sticky top-0 flex flex-col">
        <div className="p-6 text-center border-b border-sidebar-border">
          <h1 className="text-2xl font-bold text-gold-deep font-display tracking-tight flex items-center justify-center gap-2">
            <ShieldBan className="w-6 h-6" />
            متتبع الإزالة
          </h1>
          <p className="text-sm text-muted-foreground mt-2 font-serif italic">قوة الـ "لا"</p>
        </div>
        
        <nav className="flex-1 p-4 overflow-y-auto hidden md:block space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Mobile Nav */}
        <nav className="md:hidden flex overflow-x-auto p-2 hide-scrollbar border-b border-border bg-sidebar gap-2">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors cursor-pointer",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-sidebar-foreground bg-sidebar-accent/50"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="flex-1 max-w-6xl mx-auto w-full p-4 md:p-8 lg:p-12 overflow-y-auto">
        <div className="animate-in fade-in duration-500">
          {children}
        </div>
      </main>
    </div>
  );
}
