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
    for (const file of list) {
      try {
        if (kind === "document") await repo.addDocument(file);
        else await repo.addMedia(file, kind);
      } catch (err) {
        console.error(err);
        toast.error(t("upload.failed", { name: file.name }));
      }
      done++;
      setProgress({ done, total: list.length });
    }
    setBusy(false);
    setProgress(null);
    bump();
    toast.success(t("upload.added", { n: done }));
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
