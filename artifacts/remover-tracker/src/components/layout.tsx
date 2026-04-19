import { Link, useLocation } from "wouter";
import { useClerk, useUser } from "@clerk/react";
import {
  LayoutDashboard, CalendarDays, ListTodo, ShieldBan, RefreshCcw,
  Lightbulb, Settings, LogOut, Sun, Moon, Globe, Flame, ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/lib/AppContext";
import { Button } from "./ui/button";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";

function useNavItems(T: (k: string) => string) {
  return [
    { href: "/", label: T("dashboard"), icon: LayoutDashboard },
    { href: "/daily", label: T("dailyPlan"), icon: CalendarDays },
    { href: "/tracker", label: T("log"), icon: ListTodo },
    { href: "/master", label: T("masterRules"), icon: ShieldBan },
    { href: "/review", label: T("review"), icon: RefreshCcw },
    { href: "/strategy", label: T("strategy"), icon: Lightbulb },
    { href: "/settings", label: T("settings"), icon: Settings },
  ];
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { signOut } = useClerk();
  const { user } = useUser();
  const { T, lang, dark, setDark, setLang } = useApp();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navItems = useNavItems(T);

  const { data: stats } = useQuery<{ streak?: number }>({
    queryKey: ["dashboard-stats-streak"],
    queryFn: () => fetch("/api/dashboard/stats").then(r => r.json()),
    staleTime: 60000,
  });

  return (
    <div className={cn("min-h-[100dvh] flex flex-col md:flex-row bg-background text-foreground font-sans", lang === "ar" ? "direction-rtl" : "direction-ltr")}>
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-sidebar border-b md:border-b-0 md:border-l border-sidebar-border shrink-0 md:h-[100dvh] sticky top-0 flex flex-col z-20">
        {/* Brand */}
        <div className="p-5 border-b border-sidebar-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldBan className="w-6 h-6 text-gold" />
              <div>
                <h1 className="text-lg font-bold text-gold-deep font-display leading-tight">{T("appName")}</h1>
                <p className="text-xs text-muted-foreground font-serif italic">{T("appTagline")}</p>
              </div>
            </div>
            {/* Theme + Lang toggles */}
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDark(!dark)} title={dark ? T("lightMode") : T("darkMode")}>
                {dark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setLang(lang === "ar" ? "en" : "ar")} title={T("language")}>
                <Globe className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Streak banner */}
          {stats && (stats.streak ?? 0) > 0 && (
            <div className="mt-3 flex items-center gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-1.5">
              <Flame className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-medium text-amber-800 dark:text-amber-300">
                {lang === "ar" ? `سلسلة ${stats.streak} ${stats.streak === 1 ? "يوم" : "أيام"}` : `${stats.streak} day streak`}
              </span>
            </div>
          )}
        </div>

        {/* Desktop Nav */}
        <nav className="flex-1 p-3 overflow-y-auto hidden md:block space-y-0.5">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}>
                  <item.icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-3 border-t border-sidebar-border">
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(v => !v)}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-sidebar-accent transition-colors"
            >
              {user?.imageUrl ? (
                <img src={user.imageUrl} alt={user.fullName ?? ""} className="w-8 h-8 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center shrink-0 text-sm font-bold text-gold-deep">
                  {user?.firstName?.[0] ?? "?"}
                </div>
              )}
              <div className="flex-1 min-w-0 text-right">
                <p className="text-sm font-medium text-ink truncate">{user?.fullName ?? user?.username ?? user?.emailAddresses?.[0]?.emailAddress ?? ""}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.emailAddresses?.[0]?.emailAddress}</p>
              </div>
              <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform shrink-0", userMenuOpen && "rotate-180")} />
            </button>

            <AnimatePresence>
              {userMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="absolute bottom-full mb-1 left-0 right-0 bg-card border border-border rounded-xl shadow-lg overflow-hidden"
                >
                  <Link href="/settings">
                    <button className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors" onClick={() => setUserMenuOpen(false)}>
                      <Settings className="w-4 h-4 text-muted-foreground" />
                      {T("settings")}
                    </button>
                  </Link>
                  <button
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                    onClick={() => signOut()}
                  >
                    <LogOut className="w-4 h-4" />
                    {T("signOut")}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </aside>

      {/* Mobile Nav */}
      <div className="md:hidden sticky top-0 z-20 bg-sidebar border-b border-border">
        <div className="flex overflow-x-auto p-2 gap-1 hide-scrollbar">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer shrink-0",
                  isActive ? "bg-primary text-primary-foreground" : "text-sidebar-foreground bg-sidebar-accent/50"
                )}>
                  <item.icon className="w-3.5 h-3.5" />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <main className="flex-1 max-w-6xl mx-auto w-full p-4 md:p-8 lg:p-12 overflow-y-auto">
        {children}
        {/* Footer */}
        <footer className="mt-16 pt-6 border-t border-parchment-2 text-center text-xs text-muted-foreground">
          {T("copyright")}
        </footer>
      </main>
    </div>
  );
}
