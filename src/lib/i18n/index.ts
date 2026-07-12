"use client";
import { useMemo } from "react";
import { create } from "zustand";
import { enUS, ru, uz, type Locale } from "date-fns/locale";
import { DEFAULT_LANG, type Lang, translate } from "./translations";

interface LangState {
  lang: Lang;
  setLang: (l: Lang) => void;
  init: () => void;
}

export const useLangStore = create<LangState>((set) => ({
  lang: DEFAULT_LANG,
  setLang: (lang) => {
    try {
      localStorage.setItem("mx_lang", lang);
    } catch {
      /* ignore */
    }
    set({ lang });
  },
  init: () => {
    try {
      const stored = localStorage.getItem("mx_lang") as Lang | null;
      if (stored === "uz" || stored === "ru" || stored === "en") set({ lang: stored });
    } catch {
      /* ignore */
    }
  },
}));

export type TFunc = (key: string, vars?: Record<string, string | number>) => string;

/** Translation function bound to the current language. */
export function useT(): TFunc {
  const lang = useLangStore((s) => s.lang);
  return useMemo<TFunc>(() => (key, vars) => translate(lang, key, vars), [lang]);
}

export function useLang(): Lang {
  return useLangStore((s) => s.lang);
}

const LOCALES: Record<Lang, Locale> = { uz, ru, en: enUS };
export function dateLocale(lang: Lang): Locale {
  return LOCALES[lang];
}

export { LANGS, LANG_NAMES } from "./translations";
export type { Lang } from "./translations";
