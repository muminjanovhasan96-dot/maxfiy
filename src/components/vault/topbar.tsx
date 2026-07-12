"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Download,
  EllipsisVertical,
  Eraser,
  Lock,
  Search,
  Star,
  Trash2,
  Upload,
} from "lucide-react";
import { sectionTitleKey } from "@/lib/nav";
import { exportBackup, importBackup, triggerDownload } from "@/lib/repo/backup";
import { destroyLocalDatabase } from "@/lib/storage/indexeddb";
import { getBackend } from "@/lib/storage";
import { useVault } from "@/store/vault-store";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "./theme-toggle";
import { LanguageSwitcher } from "./language-switcher";
import { SearchDialog } from "./search-dialog";
import { toast } from "@/components/ui/toaster";

export function Topbar() {
  const t = useT();
  const pathname = usePathname();
  const router = useRouter();
  const lock = useVault((s) => s.lock);
  const bump = useVault((s) => s.bump);
  const [search, setSearch] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const isLocal = getBackend().kind === "local";

  async function onExport() {
    toast.show(t("backup.preparing"));
    const blob = await exportBackup();
    triggerDownload(blob, `maxfiy-backup-${new Date().toISOString().slice(0, 10)}.json`);
    toast.success(t("backup.downloaded"));
  }

  async function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { items } = await importBackup(file);
      bump();
      toast.success(t("backup.restored", { n: items }));
    } catch {
      toast.error(t("backup.invalid"));
    } finally {
      e.target.value = "";
    }
  }

  async function onErase() {
    if (!confirm(t("erase.confirm"))) return;
    await destroyLocalDatabase();
    lock();
    router.replace("/");
    location.reload();
  }

  return (
    <header className="glass sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border px-3 sm:px-5">
      <div className="flex items-center gap-2 md:hidden">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Lock className="h-4 w-4" />
        </div>
      </div>
      <h1 className="flex-1 truncate text-base font-semibold tracking-tight sm:text-lg">
        {t(sectionTitleKey(pathname))}
      </h1>

      <Button variant="ghost" size="icon" onClick={() => setSearch(true)} aria-label="Search">
        <Search className="h-5 w-5" />
      </Button>
      <LanguageSwitcher />
      <ThemeToggle />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="More">
            <EllipsisVertical className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href="/vault/favorites">
              <Star className="h-4 w-4" /> {t("nav.favorites")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/vault/trash">
              <Trash2 className="h-4 w-4" /> {t("nav.trash")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onExport}>
            <Download className="h-4 w-4" /> {t("menu.export")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4" /> {t("menu.import")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={lock}>
            <Lock className="h-4 w-4" /> {t("menu.lockNow")}
          </DropdownMenuItem>
          {isLocal && (
            <DropdownMenuItem destructive onClick={onErase}>
              <Eraser className="h-4 w-4" /> {t("menu.erase")}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={onImport}
      />
      <SearchDialog open={search} onOpenChange={setSearch} />
    </header>
  );
}
