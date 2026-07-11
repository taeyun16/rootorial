import { useLocale, type Locale } from "../features/localization/localization";

const options: { locale: Locale; shortLabel: string; label: string }[] = [
  { locale: "ko", shortLabel: "한국어", label: "한국어로 보기" },
  { locale: "en", shortLabel: "EN", label: "View in English" },
];

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useLocale();

  return (
    <div className="language-switcher" role="group" aria-label={locale === "ko" ? "언어 선택" : "Choose language"}>
      {options.map((option) => (
        <button
          aria-pressed={locale === option.locale}
          className={locale === option.locale ? "is-active" : undefined}
          key={option.locale}
          lang={option.locale}
          onClick={() => setLocale(option.locale)}
          title={option.label}
          type="button"
        >
          {compact && option.locale === "ko" ? "KO" : option.shortLabel}
        </button>
      ))}
    </div>
  );
}
