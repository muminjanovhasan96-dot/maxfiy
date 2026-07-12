"use client";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Lock, ShieldCheck } from "lucide-react";
import { estimateStrength } from "@/lib/auth/strength";
import { useVault } from "@/store/vault-store";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toaster";
import { AuroraBackdrop } from "./aurora-backdrop";
import { InsecureContextBanner } from "./insecure-context-banner";
import { LanguageSwitcher } from "@/components/vault/language-switcher";
import { cn } from "@/lib/utils";

function StrengthMeter({ value }: { value: string }) {
  const t = useT();
  const s = useMemo(() => estimateStrength(value), [value]);
  if (!value) return null;
  const colors = ["bg-destructive", "bg-destructive", "bg-amber-500", "bg-emerald-500", "bg-emerald-500"];
  return (
    <div className="mt-1.5 space-y-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              i < s.score ? colors[s.score] : "bg-muted",
            )}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {t(`strength.${s.score}`)} · {t(`strengthHint.${s.score}`)}
      </p>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  showMeter,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  showMeter?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          className="pr-11"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          tabIndex={-1}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          {show ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
        </button>
      </div>
      {showMeter && <StrengthMeter value={value} />}
    </div>
  );
}

export function SetupScreen() {
  const t = useT();
  const setup = useVault((s) => s.setup);
  const [step, setStep] = useState<1 | 2>(1);
  const [busy, setBusy] = useState(false);

  const [pwA, setPwA] = useState("");
  const [pwA2, setPwA2] = useState("");
  const [pwB, setPwB] = useState("");
  const [pwB2, setPwB2] = useState("");
  const [w1, setW1] = useState("");
  const [w2, setW2] = useState("");
  const [ack, setAck] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const step1Valid =
    pwA.length >= 8 && pwA === pwA2 && pwB.length >= 8 && pwB === pwB2 && pwA !== pwB;
  const step2Valid = w1.trim().length >= 3 && w2.trim().length >= 3 && w1 !== w2 && ack;

  async function onCreate() {
    if (!step2Valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      await setup({ passwordA: pwA, passwordB: pwB, word1: w1.trim(), word2: w2.trim() });
      toast.success(t("toast.vaultCreated"));
    } catch (err) {
      const message = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      console.error("createVault failed:", err);
      setError(message);
      toast.error(t("toast.couldNotCreate"));
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center p-5">
      <AuroraBackdrop />
      <div className="absolute right-4 top-4 z-10">
        <LanguageSwitcher />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 240, damping: 26 }}
        className="relative w-full max-w-md"
      >
        <div className="glass rounded-3xl border border-white/10 p-8 shadow-glow">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/20">
              <Lock className="h-7 w-7" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight">{t("setup.title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {step === 1 ? t("setup.sub1") : t("setup.sub2")}
            </p>
          </div>

          <InsecureContextBanner />

          {step === 1 ? (
            <div className="space-y-4">
              <Field id="pwA" label={t("setup.pw1")} value={pwA} onChange={setPwA} showMeter />
              <Field id="pwA2" label={t("setup.pw1c")} value={pwA2} onChange={setPwA2} />
              <div className="h-px bg-border" />
              <Field id="pwB" label={t("setup.pw2")} value={pwB} onChange={setPwB} showMeter />
              <Field id="pwB2" label={t("setup.pw2c")} value={pwB2} onChange={setPwB2} />
              {pwA && pwB && pwA === pwB && (
                <p className="text-xs text-amber-500">{t("setup.diffWarn")}</p>
              )}
              <Button size="lg" className="w-full" disabled={!step1Valid} onClick={() => setStep(2)}>
                {t("common.continue")}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3.5 text-xs text-amber-500/90">
                {t("setup.recoveryWarn")}
              </div>
              <Field id="w1" label={t("setup.word1")} value={w1} onChange={setW1} placeholder="harbor" />
              <Field id="w2" label={t("setup.word2")} value={w2} onChange={setW2} placeholder="willow" />
              <label className="flex cursor-pointer items-start gap-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={ack}
                  onChange={(e) => setAck(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]"
                />
                <span className="text-muted-foreground">{t("setup.ack")}</span>
              </label>
              {error && (
                <p className="break-words rounded-lg border border-destructive/30 bg-destructive/5 p-2.5 text-xs text-destructive">
                  {error}
                </p>
              )}
              <div className="flex gap-2">
                <Button variant="secondary" size="lg" onClick={() => setStep(1)}>
                  {t("common.back")}
                </Button>
                <Button size="lg" className="flex-1" disabled={!step2Valid || busy} onClick={onCreate}>
                  <ShieldCheck className="h-4 w-4" />
                  {busy ? t("setup.creating") : t("setup.create")}
                </Button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
