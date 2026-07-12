"use client";
import { useEffect, useState } from "react";
import { Download, FileText, MoreVertical, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useVault } from "@/store/vault-store";
import type { DecryptedItem } from "@/lib/repo/vault-repo";
import { triggerDownload } from "@/lib/repo/backup";
import { DropZone } from "@/components/vault/drop-zone";
import { UploadButton } from "@/components/vault/uploader";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState, PageHeader } from "@/components/vault/section-ui";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBytes } from "@/lib/utils";
import { toast } from "@/components/ui/toaster";

export default function DocumentsPage() {
  const repo = useVault((s) => s.repo);
  const revision = useVault((s) => s.revision);
  const bump = useVault((s) => s.bump);
  const [items, setItems] = useState<DecryptedItem[] | null>(null);

  useEffect(() => {
    if (!repo) return;
    repo.listDecrypted({ type: "document", trashed: false }).then(setItems);
  }, [repo, revision]);

  async function download(d: DecryptedItem) {
    if (!repo) return;
    toast.show("Decrypting…");
    const blob = await repo.getAssetBlob(d.item);
    triggerDownload(blob, d.meta.name || `document-${d.item.id}`);
  }
  async function del(id: string) {
    await repo?.trash(id);
    bump();
    toast.success("Moved to Trash");
  }

  return (
    <div className="px-3 sm:px-5">
      <PageHeader count={items?.length} unit="documents">
        <UploadButton kind="document" label="Add files" />
      </PageHeader>
      <DropZone kind="document">
        {!items ? (
          <div className="space-y-2 py-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No documents yet"
            subtitle="PDFs, scans, and any other files — encrypted before storage. Drag & drop to add."
            action={<UploadButton kind="document" label="Add files" />}
          />
        ) : (
          <div className="space-y-2 pb-6">
            {items.map((d) => (
              <div
                key={d.item.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <FileText className="h-5 w-5" />
                </div>
                <button
                  onClick={() => download(d)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate text-sm font-medium">{d.meta.name || "Untitled"}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(d.meta.size ?? 0)}
                    {d.meta.capturedAt ? ` · ${format(d.meta.capturedAt, "d MMM yyyy")}` : ""}
                  </p>
                </button>
                <Button variant="ghost" size="icon" onClick={() => download(d)} aria-label="Download">
                  <Download className="h-4 w-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-foreground">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => download(d)}>
                      <Download className="h-4 w-4" /> Download
                    </DropdownMenuItem>
                    <DropdownMenuItem destructive onClick={() => del(d.item.id)}>
                      <Trash2 className="h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </DropZone>
    </div>
  );
}
