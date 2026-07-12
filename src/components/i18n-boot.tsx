"use client";
import { useEffect } from "react";
import { useLangStore } from "@/lib/i18n";

/** Loads the saved language preference on mount. Renders nothing. */
export function I18nBoot() {
  const init = useLangStore((s) => s.init);
  useEffect(() => {
    init();
  }, [init]);
  return null;
}
