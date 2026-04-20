import { Link, useLocation } from "wouter";
import { useClerk, useUser } from "@clerk/react";
import {
  LayoutDashboard, CalendarDays, ListTodo, ShieldBan, RefreshCcw,
  Lightbulb, Settings, LogOut, Sun, Moon, Globe, Flame, ChevronDown, Star
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/lib/AppContext";
import { Button } from "./ui/button";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useAuthFetch } from "@/lib/apiClient";
import { NotificationCenter } from "./NotificationCenter";

function useNavItems(T: (k: string) => string, lang: string) {
  return [
    { href: "/", label: T("dashboard"), icon: LayoutDashboard },
    { href: "/daily", label: T("dailyPlan"), icon: CalendarDays },
    { href: "/prayer", label: lang === "ar" ? "الفرض الجاي" : "Next Prayer", icon: Star },
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
  const authFetch = useAuthFetch();
  const navItems = useNavItems(T, lang);

  const { data: stats } = useQuery<{ streak?: number }>({
    queryKey: ["dashboard-stats-streak"],
    queryFn: () => authFetch("/api/dashboard/stats").then(r => r.json()),
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
            {/* Theme + Lang toggles + Notifications */}
            <div className="flex items-center gap-1">
              <NotificationCenter />
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

      {/* Mobile top bar: brand + toggles + extended menu scroll */}
      <div className="md:hidden sticky top-0 z-20 bg-sidebar border-b border-border">
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldBan className="w-5 h-5 text-gold shrink-0" />
            <h1 className="text-sm font-bold text-gold-deep font-display truncate">{T("appName")}</h1>
          </div>
          <div className="flex items-center gap-1">
            <NotificationCenter />
            {stats && (stats.streak ?? 0) > 0 && (
              <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-full px-2 py-1">
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs font-semibold text-amber-800 dark:text-amber-300 tabular">{stats.streak}</span>
              </div>
            )}
            <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setDark(!dark)} aria-label={dark ? T("lightMode") : T("darkMode")}>
              {dark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setLang(lang === "ar" ? "en" : "ar")} aria-label={T("language")}>
              <Globe className="w-4 h-4" />
            </Button>
          </div>
        </div>
        {/* Secondary scrollable chips for less frequent pages */}
        <div className="flex overflow-x-auto px-2 pb-2 gap-1.5 hide-scrollbar">
          {navItems.slice(4).map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div className={cn(
                  "flex items-center gap-1.5 px-3 h-9 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer shrink-0",
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

      <main className="flex-1 max-w-6xl mx-auto w-full p-4 md:p-8 lg:p-12 overflow-y-auto pb-24 md:pb-12">
        {children}
        {/* Footer */}
        <footer className="mt-16 pt-6 border-t border-parchment-2 text-center text-xs text-muted-foreground">
          {T("copyright")}
        </footer>
      </main>

      {/* Mobile bottom nav (primary items, 44px+ targets) */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-sidebar/95 backdrop-blur border-t border-border shadow-[0_-2px_12px_rgba(0,0,0,0.06)]"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Primary"
      >
        <div className="grid grid-cols-4">
          {navItems.slice(0, 4).map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div className={cn(
                  "flex flex-col items-center justify-center gap-1 py-2.5 min-h-[56px] transition-colors cursor-pointer",
                  isActive ? "text-primary" : "text-muted-foreground active:bg-sidebar-accent/60"
                )}>
                  <item.icon className={cn("w-5 h-5", isActive && "stroke-[2.5]")} />
                  <span className="text-[10px] font-medium leading-tight text-center line-clamp-1 max-w-full px-1">{item.label}</span>
                  {isActive && <span className="absolute top-0 h-0.5 w-10 bg-primary rounded-full" />}
                </div>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
