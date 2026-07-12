"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { useVault } from "@/store/vault-store";
import { SetupScreen } from "@/components/auth/setup-screen";
import { LockScreen } from "@/components/auth/lock-screen";

export default function Home() {
  const status = useVault((s) => s.status);
  const init = useVault((s) => s.init);
  const router = useRouter();

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    if (status === "unlocked") router.replace("/vault");
  }, [status, router]);

  if (status === "needs-setup") return <SetupScreen />;
  if (status === "locked") return <LockScreen />;

  return (
    <div className="flex min-h-dvh items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-3 text-muted-foreground"
      >
        <div className="flex h-12 w-12 animate-pulse items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <Lock className="h-6 w-6" />
        </div>
        <span className="text-sm">Opening…</span>
      </motion.div>
    </div>
  );
}
