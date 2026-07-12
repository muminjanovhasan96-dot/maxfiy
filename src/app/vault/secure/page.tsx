"use client";
import { useEffect, useState } from "react";
import {
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  MoreVertical,
  Plus,
  StickyNote,
  Trash2,
} from "lucide-react";
import { useVault } from "@/store/vault-store";
import type { DecryptedItem } from "@/lib/repo/vault-repo";
import { PasswordDialog } from "@/components/sections/password-dialog";
import { NoteDialog } from "@/components/sections/note-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/vault/section-ui";
import { Skeleton } from "@/components/ui/skeleton";
import { copyPlain, copySecret } from "@/lib/clipboard";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

type Tab = "passwords" | "notes";

export default function SecurePage() {
  const repo = useVault((s) => s.repo);
  const revision = useVault((s) => s.revision);
  const bump = useVault((s) => s.bump);
  const [tab, setTab] = useState<Tab>("passwords");
  const [passwords, setPasswords] = useState<DecryptedItem[] | null>(null);
  const [notes, setNotes] = useState<DecryptedItem[] | null>(null);
  const [pwDialog, setPwDialog] = useState(false);
  const [noteDialog, setNoteDialog] = useState(false);
  const [editing, setEditing] = useState<DecryptedItem | null>(null);
  const [reveal, setReveal] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!repo) return;
    repo.listDecrypted({ type: "password", trashed: false }).then(setPasswords);
    repo.listDecrypted({ type: "note", trashed: false }).then(setNotes);
  }, [repo, revision]);

  async function del(id: string) {
    await repo?.trash(id);
    bump();
    toast.success("Moved to Trash");
  }

  function toggleReveal(id: string) {
    setReveal((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  return (
    <div className="px-3 sm:px-5">
      <div className="flex items-center justify-between gap-3 py-3">
        <div className="inline-flex rounded-xl border border-border bg-card p-1">
          {(["passwords", "notes"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "rounded-lg px-4 py-1.5 text-sm font-medium capitalize transition-colors",
                tab === t
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            tab === "passwords" ? setPwDialog(true) : setNoteDialog(true);
          }}
        >
          <Plus className="h-4 w-4" /> New
        </Button>
      </div>

      {tab === "passwords" ? (
        !passwords ? (
          <ListSkeleton />
        ) : passwords.length === 0 ? (
          <EmptyState
            icon={KeyRound}
            title="No logins yet"
            subtitle="Store passwords and logins. Copy with one tap — the clipboard auto-clears."
          />
        ) : (
          <div className="space-y-2 pb-6">
            {passwords.map((d) => {
              const p = d.meta.password!;
              const shown = reveal.has(d.item.id);
              return (
                <div
                  key={d.item.id}
                  className="rounded-xl border border-border bg-card p-3.5"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
                      <KeyRound className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{p.title}</p>
                      {p.username && (
                        <p className="truncate text-xs text-muted-foreground">{p.username}</p>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        <code className="rounded bg-muted px-2 py-1 font-mono text-xs">
                          {shown ? p.password : "•".repeat(Math.min(12, p.password.length))}
                        </code>
                        <button
                          onClick={() => toggleReveal(d.item.id)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => copySecret(p.password, "Password copied")}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="rounded-full p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {p.username && (
                          <DropdownMenuItem onClick={() => copyPlain(p.username!, "Username copied")}>
                            <Copy className="h-4 w-4" /> Copy username
                          </DropdownMenuItem>
                        )}
                        {p.url && (
                          <DropdownMenuItem asChild>
                            <a href={p.url} target="_blank" rel="noreferrer noopener">
                              Open website
                            </a>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => {
                            setEditing(d);
                            setPwDialog(true);
                          }}
                        >
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem destructive onClick={() => del(d.item.id)}>
                          <Trash2 className="h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : !notes ? (
        <ListSkeleton />
      ) : notes.length === 0 ? (
        <EmptyState
          icon={StickyNote}
          title="No notes yet"
          subtitle="Private notes, encrypted end-to-end. Only you can read them."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 pb-6 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map((d) => {
            const n = d.meta.note!;
            return (
              <button
                key={d.item.id}
                onClick={() => {
                  setEditing(d);
                  setNoteDialog(true);
                }}
                className="group relative flex h-40 flex-col rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40"
              >
                <p className="mb-1 truncate font-semibold">{n.title}</p>
                <p className="line-clamp-5 whitespace-pre-wrap text-sm text-muted-foreground">
                  {n.body}
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    del(d.item.id);
                  }}
                  className="absolute right-2 top-2 rounded-full p-1.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </button>
            );
          })}
        </div>
      )}

      <PasswordDialog open={pwDialog} onOpenChange={setPwDialog} editing={editing} onSaved={bump} />
      <NoteDialog open={noteDialog} onOpenChange={setNoteDialog} editing={editing} onSaved={bump} />
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-2 py-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-20 w-full rounded-xl" />
      ))}
    </div>
  );
}
