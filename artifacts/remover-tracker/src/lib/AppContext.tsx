import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { Lang } from "./i18n";
import { tr } from "./i18n";

interface AppContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  dark: boolean;
  setDark: (d: boolean) => void;
  T: (key: string, fallback?: string) => string;
}

const AppContext = createContext<AppContextValue>({
  lang: "ar",
  setLang: () => {},
  dark: false,
  setDark: () => {},
  T: (k) => k,
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    return (localStorage.getItem("lang") as Lang) ?? "ar";
  });
  const [dark, setDarkState] = useState(() => {
    return localStorage.getItem("dark") === "true";
  });

  const setLang = useCallback((l: Lang) => {
    localStorage.setItem("lang", l);
    setLangState(l);
    document.documentElement.lang = l;
    document.documentElement.dir = l === "ar" ? "rtl" : "ltr";
  }, []);

  const setDark = useCallback((d: boolean) => {
    localStorage.setItem("dark", String(d));
    setDarkState(d);
    if (d) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const T = useCallback((key: string, fallback?: string) => tr(lang, key, fallback), [lang]);

  // Apply on mount
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    if (dark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, []);

  return (
    <AppContext.Provider value={{ lang, setLang, dark, setDark, T }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
