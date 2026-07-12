"use client";
import { useEffect, useMemo, useState } from "react";
import { Mail, MoreVertical, Phone, Plus, Trash2, Users } from "lucide-react";
import { useVault } from "@/store/vault-store";
import type { DecryptedItem } from "@/lib/repo/vault-repo";
import { ContactDialog } from "@/components/sections/contact-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState, PageHeader } from "@/components/vault/section-ui";
import { Skeleton } from "@/components/ui/skeleton";
import { copyPlain } from "@/lib/clipboard";
import { toast } from "@/components/ui/toaster";
import { useT } from "@/lib/i18n";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}
function hue(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return h;
}

export default function ContactsPage() {
  const t = useT();
  const repo = useVault((s) => s.repo);
  const revision = useVault((s) => s.revision);
  const bump = useVault((s) => s.bump);
  const [items, setItems] = useState<DecryptedItem[] | null>(null);
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<DecryptedItem | null>(null);

  useEffect(() => {
    if (!repo) return;
    repo.listDecrypted({ type: "contact", trashed: false }).then(setItems);
  }, [repo, revision]);

  const grouped = useMemo(() => {
    if (!items) return [];
    const sorted = [...items].sort((a, b) =>
      (a.meta.name || "").localeCompare(b.meta.name || ""),
    );
    const map = new Map<string, DecryptedItem[]>();
    for (const it of sorted) {
      const letter = (it.meta.name?.[0] || "#").toUpperCase();
      const key = /[A-Z]/.test(letter) ? letter : "#";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(it);
    }
    return [...map.entries()];
  }, [items]);

  async function del(id: string) {
    await repo?.trash(id);
    bump();
    toast.success(t("contact.trashed"));
  }

  if (!items) {
    return (
      <div className="space-y-2 px-3 py-4 sm:px-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="px-3 sm:px-5">
      <PageHeader count={items.length} unit={t("unit.contacts")}>
        <Button
          onClick={() => {
            setEditing(null);
            setDialog(true);
          }}
        >
          <Plus className="h-4 w-4" /> {t("common.new")}
        </Button>
      </PageHeader>

      {items.length === 0 ? (
        <EmptyState
          icon={Users}
          title={t("empty.contacts.t")}
          subtitle={t("empty.contacts.s")}
          action={
            <Button
              onClick={() => {
                setEditing(null);
                setDialog(true);
              }}
            >
              <Plus className="h-4 w-4" /> {t("contact.new")}
            </Button>
          }
        />
      ) : (
        <div className="space-y-6 pb-6">
          {grouped.map(([letter, rows]) => (
            <div key={letter}>
              <p className="mb-1.5 px-1 text-xs font-semibold text-muted-foreground">{letter}</p>
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                {rows.map((d, i) => {
                  const c = d.meta.contact;
                  const name = d.meta.name || t("contact.unnamed");
                  return (
                    <div
                      key={d.item.id}
                      className={`flex items-center gap-3 p-3 ${i > 0 ? "border-t border-border" : ""}`}
                    >
                      <button
                        onClick={() => {
                          setEditing(d);
                          setDialog(true);
                        }}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <div
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                          style={{ backgroundColor: `hsl(${hue(name)} 55% 45%)` }}
                        >
                          {initials(name) || "?"}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {c?.company || c?.phones?.[0]?.value || c?.emails?.[0]?.value || ""}
                          </p>
                        </div>
                      </button>
                      {c?.phones?.[0]?.value && (
                        <a
                          href={`tel:${c.phones[0].value}`}
                          className="rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
                        >
                          <Phone className="h-4 w-4" />
                        </a>
                      )}
                      {c?.emails?.[0]?.value && (
                        <button
                          onClick={() => copyPlain(c.emails[0].value, t("clip.emailCopied"))}
                          className="rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
                        >
                          <Mail className="h-4 w-4" />
                        </button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-foreground">
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditing(d);
                              setDialog(true);
                            }}
                          >
                            {t("common.edit")}
                          </DropdownMenuItem>
                          <DropdownMenuItem destructive onClick={() => del(d.item.id)}>
                            <Trash2 className="h-4 w-4" /> {t("common.delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <ContactDialog
        open={dialog}
        onOpenChange={setDialog}
        editing={editing}
        onSaved={bump}
      />
    </div>
  );
}
