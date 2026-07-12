"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useVault } from "@/store/vault-store";
import { Sidebar } from "@/components/vault/sidebar";
import { BottomNav } from "@/components/vault/bottom-nav";
import { Topbar } from "@/components/vault/topbar";
import { AutoLock } from "@/components/vault/auto-lock";

export default function VaultLayout({ children }: { children: React.ReactNode }) {
  const status = useVault((s) => s.status);
  const router = useRouter();

  // Guard: a hard reload resets the in-memory session, so re-unlock is required.
  useEffect(() => {
    if (status !== "unlocked" && status !== "loading") router.replace("/");
  }, [status, router]);

  if (status !== "unlocked") {
    return (
      <div className="flex min-h-dvh items-center justify-center text-sm text-muted-foreground">
        Redirecting to unlock…
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh">
      <AutoLock />
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 pb-20 md:pb-0">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
