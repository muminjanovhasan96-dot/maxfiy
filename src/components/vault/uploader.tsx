"use client";
import { useRef, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { useVault } from "@/store/vault-store";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

export type UploadKind = "photo" | "video" | "document";

const ACCEPT: Record<UploadKind, string> = {
  photo: "image/*",
  video: "video/*",
  document: "*/*",
};

export function useUploads(kind: UploadKind) {
  const t = useT();
  const repo = useVault((s) => s.repo);
  const bump = useVault((s) => s.bump);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  async function upload(files: FileList | File[]) {
    if (!repo) return;
    const list = Array.from(files);
    if (!list.length) return;
    setBusy(true);
    setProgress({ done: 0, total: list.length });

    let done = 0;
    let ok = 0;
    let failed = 0;
    let firstError = "";
    let cursor = 0;
    const CONCURRENCY = 4;

    async function worker() {
      while (cursor < list.length) {
        const file = list[cursor++];
        try {
          if (kind === "document") await repo!.addDocument(file);
          else await repo!.addMedia(file, kind);
          ok++;
        } catch (err) {
          failed++;
          const msg = err instanceof Error ? err.message : String(err);
          if (!firstError) firstError = `${file.name} — ${msg}`;
          console.error("Upload failed:", file.name, err);
        }
        done++;
        setProgress({ done, total: list.length });
      }
    }

    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, list.length) }, () => worker()),
    );

    setBusy(false);
    setProgress(null);
    bump();
    if (ok > 0) toast.success(t("upload.added", { n: ok }));
    if (failed > 0) {
      toast.error(`${t("upload.someFailed", { n: failed })} · ${firstError.slice(0, 140)}`);
    }
  }

  return { busy, progress, upload };
}

export function UploadButton({
  kind,
  label,
  className,
}: {
  kind: UploadKind;
  label?: string;
  className?: string;
}) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const { busy, progress, upload } = useUploads(kind);

  return (
    <>
      <Button
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className={cn(className)}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        {busy && progress
          ? t("upload.encrypting", { done: progress.done, total: progress.total })
          : (label ?? t("common.add"))}
      </Button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT[kind]}
        className="hidden"
        onChange={(e) => {
          if (e.target.files) void upload(e.target.files);
          e.target.value = "";
        }}
      />
    </>
  );
}
