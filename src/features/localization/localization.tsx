import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouterState } from "@tanstack/react-router";
import { pageMetadataForPath } from "./page-metadata";

export type Locale = "ko" | "en";

const STORAGE_KEY = "rootorial.locale";

type LocalizationContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
};

const LocalizationContext = createContext<LocalizationContextValue | null>(null);

export function localeFromSearch(search: string): Locale | null {
  const value = new URLSearchParams(search).get("lang");
  return value === "ko" || value === "en" ? value : null;
}

function localeFromUrl(): Locale | null {
  if (typeof window === "undefined") return null;
  return localeFromSearch(window.location.search);
}

function storedLocale(): Locale | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(STORAGE_KEY);
  return value === "ko" || value === "en" ? value : null;
}

export function LocalizationProvider({ children }: { children: React.ReactNode }) {
  const search = useRouterState({ select: (state) => state.location.searchStr });
  const [locale, updateLocale] = useState<Locale>(() => localeFromSearch(search) ?? "ko");
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  useEffect(() => {
    updateLocale(localeFromUrl() ?? storedLocale() ?? "ko");
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    const metadata = pageMetadataForPath(pathname, locale);
    if (!metadata) return;

    document.title = metadata.title;

    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (description) {
      description.content = metadata.description;
    }
  }, [locale, pathname]);

  const setLocale = useCallback((nextLocale: Locale) => {
    updateLocale(nextLocale);
    window.localStorage.setItem(STORAGE_KEY, nextLocale);

    const url = new URL(window.location.href);
    url.searchParams.set("lang", nextLocale);
    window.history.replaceState(window.history.state, "", url);
  }, []);

  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);

  return (
    <LocalizationContext.Provider value={value}>
      {children}
    </LocalizationContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocalizationContext);
  if (!context) {
    throw new Error("useLocale must be used inside LocalizationProvider");
  }
  return context;
}

export function localized<T>(locale: Locale, values: Record<Locale, T>): T {
  return values[locale];
}
