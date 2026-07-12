"use client";
import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useT } from "@/lib/i18n";

/**
 * Warns up-front when the page has no Web Crypto (crypto.subtle) — i.e. it's not
 * a secure context (e.g. VS Code's Simple Browser). The vault cannot encrypt
 * without it, so we tell the user to open the app in a real browser tab.
 */
export function InsecureContextBanner() {
  const t = useT();
  const [insecure, setInsecure] = useState(false);
  const [url, setUrl] = useState("");

  useEffect(() => {
    setInsecure(typeof crypto === "undefined" || !crypto.subtle);
    setUrl(window.location.href);
  }, []);

  if (!insecure) return null;

  return (
    <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-500">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p className="font-semibold">{t("insecure.title")}</p>
        <p className="mt-0.5 whitespace-pre-wrap text-amber-500/90">
          {t("insecure.body", { url: url || "http://localhost:3100" })}
        </p>
      </div>
    </div>
  );
}
