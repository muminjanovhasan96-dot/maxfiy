"use client";
import { useEffect, useState } from "react";
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

type Note = NonNullable<ItemMeta["note"]>;

export function NoteDialog({
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
  const [note, setNote] = useState<Note>({ title: "", body: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setNote(editing?.meta.note ?? { title: "", body: "" });
  }, [open, editing]);

  async function save() {
    if (!repo || (!note.title.trim() && !note.body.trim())) return;
    setBusy(true);
    const finalNote = { ...note, title: note.title.trim() || "Untitled" };
    try {
      if (editing) await repo.updateItem(editing.item.id, { note: finalNote, name: finalNote.title });
      else await repo.addNote(finalNote);
      toast.success(editing ? "Updated" : "Saved");
      onSaved();
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh]">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit note" : "New note"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input
              value={note.title}
              onChange={(e) => setNote({ ...note, title: e.target.value })}
              placeholder="Title"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>Note</Label>
            <textarea
              value={note.body}
              onChange={(e) => setNote({ ...note, body: e.target.value })}
              rows={10}
              placeholder="Write something private…"
              className="w-full resize-none rounded-lg border border-input bg-background/60 px-3.5 py-2.5 text-sm leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
