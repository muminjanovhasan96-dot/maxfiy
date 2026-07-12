"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, EyeOff, Fingerprint, KeyRound, Lock, ShieldAlert } from "lucide-react";
import {
  loginStageA,
  loginStageB,
  recoveryStage1,
  recoveryStage2,
  type RecoveryStage1Result,
  type StageAResult,
} from "@/lib/crypto";
import { useLockout } from "@/lib/auth/use-lockout";
import { useVault } from "@/store/vault-store";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuroraBackdrop } from "./aurora-backdrop";
import { InsecureContextBanner } from "./insecure-context-banner";
import { LanguageSwitcher } from "@/components/vault/language-switcher";
import { cn } from "@/lib/utils";

type Stage = "a" | "b" | "recovery1" | "recovery2";

function formatCountdown(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const STAGE_KEYS: Record<Stage, { sub: string; label: string; cta: string }> = {
  a: { sub: "lock.sub.a", label: "lock.label.a", cta: "lock.cta.a" },
  b: { sub: "lock.sub.b", label: "lock.label.b", cta: "lock.cta.b" },
  recovery1: { sub: "lock.sub.r1", label: "lock.label.r1", cta: "lock.cta.r1" },
  recovery2: { sub: "lock.sub.r2", label: "lock.label.r2", cta: "lock.cta.r2" },
};

export function LockScreen() {
  const t = useT();
  const header = useVault((s) => s.header);
  const openWithMasterKey = useVault((s) => s.openWithMasterKey);
  const lockout = useLockout();

  const [stage, setStage] = useState<Stage>("a");
  const [value, setValue] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stageA, setStageA] = useState<StageAResult | null>(null);
  const [recovery1, setRecovery1] = useState<RecoveryStage1Result | null>(null);

  const isRecovery = stage === "recovery1" || stage === "recovery2";

  function reset(toStage: Stage) {
    setStage(toStage);
    setValue("");
    setError(null);
    setShow(false);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!header || busy || lockout.locked || !value) return;
    setBusy(true);
    setError(null);
    try {
      if (stage === "a") {
        const res = await loginStageA(header, value);
        setStageA(res);
        await lockout.success();
        reset("b");
      } else if (stage === "b") {
        if (!stageA) return reset("a");
        const master = await loginStageB(header, stageA, value);
        await lockout.success();
        openWithMasterKey(master, header);
      } else if (stage === "recovery1") {
        const res = await recoveryStage1(header, value);
        setRecovery1(res);
        await lockout.success();
        reset("recovery2");
      } else if (stage === "recovery2") {
        if (!recovery1) return reset("recovery1");
        const master = await recoveryStage2(header, recovery1, value);
        await lockout.success();
        openWithMasterKey(master, header);
      }
    } catch {
      const status = await lockout.fail();
      if (status.locked) {
        setError(null);
      } else {
        setError(stage === "a" || stage === "recovery1" ? t("lock.err1") : t("lock.err2"));
      }
      if (stage === "b") reset("a");
      else if (stage === "recovery2") reset("recovery1");
      else setValue("");
    } finally {
      setBusy(false);
    }
  }

  const keys = STAGE_KEYS[stage];
  const placeholder =
    stage === "recovery1"
      ? t("lock.ph.word1")
      : stage === "recovery2"
        ? t("lock.ph.word2")
        : "••••••••";

  return (
    <div className="relative flex min-h-dvh items-center justify-center p-5">
      <AuroraBackdrop />
      <div className="absolute right-4 top-4 z-10">
        <LanguageSwitcher />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}
        className="relative w-full max-w-md"
      >
        <div className="glass rounded-3xl border border-white/10 p-8 shadow-glow">
          <div className="mb-7 flex flex-col items-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/20">
              {isRecovery ? <KeyRound className="h-7 w-7" /> : <Lock className="h-7 w-7" />}
            </div>
            <h1 className="text-xl font-semibold tracking-tight">Maxfiy</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t(keys.sub)}</p>
          </div>

          <InsecureContextBanner />

          {lockout.locked ? (
            <LockedNotice remaining={lockout.remaining} />
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="mb-1 flex items-center justify-center gap-1.5">
                {(isRecovery ? ["recovery1", "recovery2"] : ["a", "b"]).map((s) => (
                  <span
                    key={s}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      s === stage ? "w-6 bg-primary" : "w-1.5 bg-muted",
                    )}
                  />
                ))}
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={stage}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-2"
                >
                  <Label htmlFor="secret">{t(keys.label)}</Label>
                  <div className="relative">
                    <Input
                      id="secret"
                      autoFocus
                      type={show ? "text" : "password"}
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      placeholder={placeholder}
                      autoComplete="off"
                      className="h-12 pr-11 text-base"
                    />
                    <button
                      type="button"
                      onClick={() => setShow((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                      tabIndex={-1}
                      aria-label={show ? "Hide" : "Show"}
                    >
                      {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </motion.div>
              </AnimatePresence>

              {error && (
                <p className="flex items-center gap-1.5 text-sm text-destructive">
                  <ShieldAlert className="h-4 w-4" /> {error}
                </p>
              )}
              {!error && lockout.attemptsLeft < 2 && (
                <p className="text-xs text-amber-500">
                  {t("lock.attempts", { n: lockout.attemptsLeft })}
                </p>
              )}

              <Button type="submit" size="lg" className="w-full" disabled={busy || !value}>
                {busy ? t("lock.verifying") : t(keys.cta)}
              </Button>

              <div className="pt-1 text-center">
                {!isRecovery ? (
                  <button
                    type="button"
                    onClick={() => reset("recovery1")}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Fingerprint className="mr-1 inline h-3.5 w-3.5" />
                    {t("lock.forgot")}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => reset("a")}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {t("lock.backToLogin")}
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
        <p className="mt-5 text-center text-xs text-muted-foreground/70">{t("lock.footer")}</p>
      </motion.div>
    </div>
  );
}

function LockedNotice({ remaining }: { remaining: number }) {
  const t = useT();
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center"
    >
      <ShieldAlert className="mb-3 h-8 w-8 text-destructive" />
      <p className="font-medium">{t("lock.tooMany")}</p>
      <p className="mt-1 text-sm text-muted-foreground">{t("lock.paused")}</p>
      <p className="mt-4 font-mono text-3xl tabular-nums tracking-tight">
        {formatCountdown(remaining)}
      </p>
      <p className="mt-2 text-xs text-muted-foreground">{t("lock.tryAgain")}</p>
    </motion.div>
  );
}
