import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  detectSystemLocale,
  getLocale,
  l as lRaw,
  lf as lfRaw,
  setLocale,
  subscribeLocale,
  type LFormatParams,
  type Locale,
} from "./i18n";

type I18nContextValue = {
  locale: Locale;
  setLocale: (next: Locale) => void;
  l: (zh: string, en: string) => string;
  lf: (zhTemplate: string, enTemplate: string, params: LFormatParams) => string;
};

const I18nContext = createContext<I18nContextValue>({
  locale: getLocale(),
  setLocale,
  l: (zh: string, en: string) => lRaw(zh, en, getLocale()),
  lf: (zhTemplate: string, enTemplate: string, params: LFormatParams) =>
    lfRaw(zhTemplate, enTemplate, params, getLocale()),
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getLocale());

  useEffect(() => {
    return subscribeLocale((next) => {
      setLocaleState(next);
    });
  }, []);

  useEffect(() => {
    try {
      document.documentElement.lang = locale;
    } catch {
      // Ignore
    }
  }, [locale]);

  useEffect(() => {
    const onLanguageChange = () => {
      try {
        setLocale(detectSystemLocale());
      } catch {
        // Ignore
      }
    };

    try {
      window.addEventListener("languagechange", onLanguageChange);
      return () => {
        window.removeEventListener("languagechange", onLanguageChange);
      };
    } catch {
      return;
    }
  }, []);

  const value = useMemo<I18nContextValue>(() => {
    return {
      locale,
      setLocale,
      l: (zh: string, en: string) => lRaw(zh, en, locale),
      lf: (zhTemplate: string, enTemplate: string, params: LFormatParams) =>
        lfRaw(zhTemplate, enTemplate, params, locale),
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}
