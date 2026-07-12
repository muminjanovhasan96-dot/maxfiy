"use client";
import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, RefreshCw, Wand2 } from "lucide-react";
import { useVault } from "@/store/vault-store";
import type { DecryptedItem } from "@/lib/repo/vault-repo";
import type { ItemMeta } from "@/lib/storage/types";
import { estimateStrength, generatePassphrase, generatePassword } from "@/lib/auth/strength";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

type Pw = NonNullable<ItemMeta["password"]>;
const empty: Pw = { title: "", username: "", password: "", url: "", notes: "" };

export function PasswordDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing?: DecryptedItem | null;
  onSaved: () => void;
}) {
  const repo = useVault((s) => s.repo);
  const [p, setP] = useState<Pw>(empty);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setP(editing?.meta.password ?? empty);
      setShow(false);
    }
  }, [open, editing]);

  const strength = useMemo(() => estimateStrength(p.password), [p.password]);
  const colors = ["bg-destructive", "bg-destructive", "bg-amber-500", "bg-emerald-500", "bg-emerald-500"];

  async function save() {
    if (!repo || !p.title.trim() || !p.password) return;
    setBusy(true);
    try {
      if (editing) await repo.updateItem(editing.item.id, { password: p, name: p.title });
      else await repo.addPassword(p);
      toast.success(editing ? "Updated" : "Saved");
      onSaved();
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit login" : "New login"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input
              value={p.title}
              onChange={(e) => setP({ ...p, title: e.target.value })}
              placeholder="e.g. Email account"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>Username</Label>
            <Input
              value={p.username ?? ""}
              onChange={(e) => setP({ ...p, username: e.target.value })}
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Password</Label>
            <div className="relative">
              <Input
                type={show ? "text" : "password"}
                value={p.password}
                onChange={(e) => setP({ ...p, password: e.target.value })}
                className="pr-10 font-mono"
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {p.password && (
              <div className="flex items-center gap-2">
                <div className="flex flex-1 gap-1">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={cn(
                        "h-1 flex-1 rounded-full",
                        i < strength.score ? colors[strength.score] : "bg-muted",
                      )}
                    />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">{strength.label}</span>
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setP({ ...p, password: generatePassword(20) })}
              >
                <RefreshCw className="h-3.5 w-3.5" /> Strong password
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setP({ ...p, password: generatePassphrase(4) })}
              >
                <Wand2 className="h-3.5 w-3.5" /> Passphrase
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Website</Label>
            <Input
              value={p.url ?? ""}
              onChange={(e) => setP({ ...p, url: e.target.value })}
              placeholder="https://…"
              inputMode="url"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <textarea
              value={p.notes ?? ""}
              onChange={(e) => setP({ ...p, notes: e.target.value })}
              rows={2}
              className="w-full resize-none rounded-lg border border-input bg-background/60 px-3.5 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={busy || !p.title.trim() || !p.password}>
            {busy ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
