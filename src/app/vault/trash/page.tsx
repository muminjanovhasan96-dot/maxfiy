"use client";
import { useEffect, useState } from "react";
import {
  FileText,
  Image as ImageIcon,
  KeyRound,
  RotateCcw,
  StickyNote,
  Trash2,
  Users,
  Video,
} from "lucide-react";
import { useVault } from "@/store/vault-store";
import type { DecryptedItem } from "@/lib/repo/vault-repo";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/vault/section-ui";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toaster";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  photo: ImageIcon,
  video: Video,
  contact: Users,
  note: StickyNote,
  password: KeyRound,
  document: FileText,
};

function TrashThumb({ d }: { d: DecryptedItem }) {
  const repo = useVault((s) => s.repo);
  const [url, setUrl] = useState<string | null>(null);
  const Icon = ICONS[d.item.type] ?? FileText;
  useEffect(() => {
    let active = true;
    if (d.stub.thumbKey && repo) {
      repo.getThumbUrl(d.stub).then((u) => active && setUrl(u));
    }
    return () => {
      active = false;
    };
  }, [d, repo]);
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-muted-foreground">
      {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : <Icon className="h-5 w-5" />}
    </div>
  );
}

export default function TrashPage() {
  const repo = useVault((s) => s.repo);
  const revision = useVault((s) => s.revision);
  const bump = useVault((s) => s.bump);
  const [items, setItems] = useState<DecryptedItem[] | null>(null);

  useEffect(() => {
    if (!repo) return;
    repo.listDecrypted({ trashed: true }).then(setItems);
  }, [repo, revision]);

  async function restore(id: string) {
    await repo?.restore(id);
    bump();
    toast.success("Restored");
  }
  async function del(id: string) {
    if (!confirm("Delete permanently? This cannot be undone.")) return;
    await repo?.deletePermanently(id);
    bump();
    toast.success("Deleted permanently");
  }

  if (!items) {
    return (
      <div className="space-y-2 px-3 py-4 sm:px-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="px-3 sm:px-5">
      <PageHeader count={items.length} unit="items in trash" />
      {items.length === 0 ? (
        <EmptyState
          icon={Trash2}
          title="Trash is empty"
          subtitle="Deleted items land here first, so you can restore them before they’re gone for good."
        />
      ) : (
        <div className="space-y-2 pb-4">
          {items.map((d) => (
            <div
              key={d.item.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-2.5"
            >
              <TrashThumb d={d} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{d.meta.name || "Untitled"}</p>
                <p className="text-xs capitalize text-muted-foreground">{d.item.type}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => restore(d.item.id)} aria-label="Restore">
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => del(d.item.id)}
                className="text-destructive"
                aria-label="Delete permanently"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
