import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouterState } from "@tanstack/react-router";

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
    const isVectorsChapter = pathname === "/chapters/vectors" || pathname.endsWith("/chapters/vectors");
    const isTransformerCurriculum = pathname === "/curricula/transformer-from-zero";
    document.title = isVectorsChapter
      ? locale === "ko"
        ? "01. 벡터와 텐서 · Rootorial"
        : "01. Vectors and Tensors · Rootorial"
      : isTransformerCurriculum
        ? locale === "ko"
          ? "Transformer를 바닥부터 · Rootorial"
          : "Transformers from the Ground Up · Rootorial"
        : locale === "ko"
          ? "Rootorial — 복잡한 기술을 바닥부터."
          : "Rootorial — Technology, understood from the root.";

    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (description) {
      description.content = isVectorsChapter
        ? locale === "ko"
          ? "벡터의 크기와 내적부터 텐서 shape와 브로드캐스팅까지 인터랙티브 시각화와 NumPy 코드로 이해합니다."
          : "Learn vector magnitude, dot products, tensor shapes, and broadcasting through interactive visualizations and NumPy code."
        : isTransformerCurriculum
          ? locale === "ko"
            ? "수학적 직관, 실행 가능한 코드, 인터랙티브 시각화로 Transformer를 바닥부터 이해합니다."
            : "Understand Transformers from the ground up through mathematical intuition, executable code, and interactive visualization."
          : locale === "ko"
            ? "AI, 시스템, 인프라와 소프트웨어 설계를 직접 움직이고 실행하며 바닥부터 이해하는 인터랙티브 커리큘럼."
            : "Interactive curricula for understanding AI, systems, infrastructure, and software design from the ground up.";
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
