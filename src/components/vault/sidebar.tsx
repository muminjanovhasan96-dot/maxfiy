"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cloud, HardDrive, Lock } from "lucide-react";
import { PRIMARY_NAV, SECONDARY_NAV } from "@/lib/nav";
import { getBackend } from "@/lib/storage";
import { useVault } from "@/store/vault-store";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

function NavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
        active
          ? "bg-primary/12 text-primary"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      <Icon className="h-[18px] w-[18px]" />
      {label}
    </Link>
  );
}

export function Sidebar() {
  const t = useT();
  const pathname = usePathname();
  const lock = useVault((s) => s.lock);
  const kind = getBackend().kind;

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-card/40 p-4 md:flex">
      <div className="mb-6 flex items-center gap-2.5 px-2 pt-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Lock className="h-5 w-5" />
        </div>
        <span className="text-lg font-semibold tracking-tight">Maxfiy</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {PRIMARY_NAV.map((n) => (
          <NavLink
            key={n.href}
            href={n.href}
            label={t(n.key)}
            icon={n.icon}
            active={pathname.startsWith(n.href)}
          />
        ))}
        <div className="my-3 h-px bg-border" />
        {SECONDARY_NAV.map((n) => (
          <NavLink
            key={n.href}
            href={n.href}
            label={t(n.key)}
            icon={n.icon}
            active={pathname.startsWith(n.href)}
          />
        ))}
      </nav>

      <div className="mt-4 space-y-3 border-t border-border pt-4">
        <div className="flex items-center gap-2 px-2 text-xs text-muted-foreground">
          {kind === "cloud" ? (
            <Cloud className="h-3.5 w-3.5" />
          ) : (
            <HardDrive className="h-3.5 w-3.5" />
          )}
          {kind === "cloud" ? t("side.cloud") : t("side.onDevice")}
        </div>
        <button
          onClick={lock}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Lock className="h-[18px] w-[18px]" />
          {t("side.lock")}
        </button>
      </div>
    </aside>
  );
}
