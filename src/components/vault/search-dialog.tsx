"use client";
/**
 * Global encrypted search. Runs entirely client-side over decrypted metadata for
 * the text sections (contacts, notes, passwords, documents). Nothing is queried
 * server-side, so the server never learns what you search for.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { FileText, KeyRound, Search, StickyNote, Users, X } from "lucide-react";
import { useVault } from "@/store/vault-store";
import { useT } from "@/lib/i18n";
import type { DecryptedItem } from "@/lib/repo/vault-repo";
import type { ItemType } from "@/lib/storage/types";

const TYPE_META: Record<string, { icon: React.ComponentType<{ className?: string }>; href: string }> = {
  contact: { icon: Users, href: "/vault/contacts" },
  note: { icon: StickyNote, href: "/vault/secure" },
  password: { icon: KeyRound, href: "/vault/secure" },
  document: { icon: FileText, href: "/vault/documents" },
};

function searchable(d: DecryptedItem): string {
  const m = d.meta;
  const parts = [m.name];
  if (m.contact)
    parts.push(
      m.contact.firstName,
      m.contact.lastName,
      m.contact.company,
      ...m.contact.phones.map((p) => p.value),
      ...m.contact.emails.map((e) => e.value),
    );
  if (m.note) parts.push(m.note.title, m.note.body);
  if (m.password) parts.push(m.password.title, m.password.username, m.password.url);
  if (m.document) parts.push(m.document.fileName);
  return parts.filter(Boolean).join(" ").toLowerCase();
}

export function SearchDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const t = useT();
  const repo = useVault((s) => s.repo);
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<DecryptedItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || !repo) return;
    setQuery("");
    void repo
      .listDecrypted({
        trashed: false,
        type: ["contact", "note", "password", "document"] as ItemType[],
      })
      .then(setItems);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [open, repo]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 12);
    return items.filter((d) => searchable(d).includes(q)).slice(0, 40);
  }, [query, items]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-start justify-center bg-black/50 p-4 pt-[12vh] backdrop-blur-sm"
          onClick={() => onOpenChange(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card shadow-glow"
          >
            <div className="flex items-center gap-3 border-b border-border px-4">
              <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("search.placeholder")}
                className="h-14 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
              />
              <button
                onClick={() => onOpenChange(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-2">
              {results.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                  {query ? t("search.none") : t("search.prompt")}
                </p>
              ) : (
                results.map((d) => {
                  const conf = TYPE_META[d.item.type];
                  const Icon = conf?.icon ?? FileText;
                  return (
                    <button
                      key={d.item.id}
                      onClick={() => {
                        router.push(conf?.href ?? "/vault");
                        onOpenChange(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-accent"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {d.meta.name || "Untitled"}
                        </p>
                        <p className="truncate text-xs capitalize text-muted-foreground">
                          {d.item.type}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
