"use client";
import { useState } from "react";
import { UploadCloud } from "lucide-react";
import { useUploads, type UploadKind } from "./uploader";

export function DropZone({
  kind,
  children,
}: {
  kind: UploadKind;
  children: React.ReactNode;
}) {
  const { upload } = useUploads(kind);
  const [dragging, setDragging] = useState(false);

  return (
    <div
      className="relative min-h-[60vh]"
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (e.dataTransfer.files.length) void upload(e.dataTransfer.files);
      }}
    >
      {children}
      {dragging && (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center rounded-2xl border-2 border-dashed border-primary bg-primary/10 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2 text-primary">
            <UploadCloud className="h-10 w-10" />
            <span className="font-medium">Drop to encrypt & add</span>
          </div>
        </div>
      )}
    </div>
  );
}
