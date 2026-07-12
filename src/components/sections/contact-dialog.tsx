"use client";
import { useEffect, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { useVault } from "@/store/vault-store";
import type { DecryptedItem } from "@/lib/repo/vault-repo";
import type { ItemMeta } from "@/lib/storage/types";
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

type Contact = NonNullable<ItemMeta["contact"]>;

const empty: Contact = {
  firstName: "",
  lastName: "",
  company: "",
  phones: [{ label: "mobile", value: "" }],
  emails: [{ label: "home", value: "" }],
  notes: "",
};

export function ContactDialog({
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
  const [c, setC] = useState<Contact>(empty);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setC(editing?.meta.contact ?? empty);
  }, [open, editing]);

  function set<K extends keyof Contact>(k: K, v: Contact[K]) {
    setC((prev) => ({ ...prev, [k]: v }));
  }

  async function save() {
    if (!repo || !c.firstName.trim()) return;
    setBusy(true);
    const cleaned: Contact = {
      ...c,
      phones: c.phones.filter((p) => p.value.trim()),
      emails: c.emails.filter((e) => e.value.trim()),
    };
    try {
      if (editing) {
        const name = `${cleaned.firstName} ${cleaned.lastName ?? ""}`.trim();
        await repo.updateItem(editing.item.id, { contact: cleaned, name });
      } else {
        await repo.addContact(cleaned);
      }
      toast.success(editing ? "Contact updated" : "Contact added");
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
          <DialogTitle>{editing ? "Edit contact" : "New contact"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>First name</Label>
              <Input value={c.firstName} onChange={(e) => set("firstName", e.target.value)} autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label>Last name</Label>
              <Input value={c.lastName ?? ""} onChange={(e) => set("lastName", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Company</Label>
            <Input value={c.company ?? ""} onChange={(e) => set("company", e.target.value)} />
          </div>

          <RepeatList
            label="Phone"
            rows={c.phones}
            onChange={(rows) => set("phones", rows)}
            placeholder="+1 555 0100"
            inputMode="tel"
          />
          <RepeatList
            label="Email"
            rows={c.emails}
            onChange={(rows) => set("emails", rows)}
            placeholder="name@example.com"
            inputMode="email"
          />

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <textarea
              value={c.notes ?? ""}
              onChange={(e) => set("notes", e.target.value)}
              rows={3}
              className="w-full resize-none rounded-lg border border-input bg-background/60 px-3.5 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={busy || !c.firstName.trim()}>
            {busy ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RepeatList({
  label,
  rows,
  onChange,
  placeholder,
  inputMode,
}: {
  label: string;
  rows: { label: string; value: string }[];
  onChange: (rows: { label: string; value: string }[]) => void;
  placeholder?: string;
  inputMode?: "tel" | "email";
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <button
          onClick={() => onChange([...rows, { label: label.toLowerCase(), value: "" }])}
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      </div>
      {rows.map((row, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            value={row.value}
            inputMode={inputMode}
            placeholder={placeholder}
            onChange={(e) => {
              const next = [...rows];
              next[i] = { ...next[i], value: e.target.value };
              onChange(next);
            }}
          />
          {rows.length > 1 && (
            <button
              onClick={() => onChange(rows.filter((_, j) => j !== i))}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
