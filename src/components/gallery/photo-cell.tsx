"use client";
import { memo, useEffect, useRef, useState } from "react";
import { CheckCircle2, Circle, Play, Star } from "lucide-react";
import { useVault } from "@/store/vault-store";
import type { ItemStub } from "@/lib/storage/types";
import { cn } from "@/lib/utils";

interface PhotoCellProps {
  stub: ItemStub;
  size: number;
  selectionMode: boolean;
  selected: boolean;
  onOpen: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onEnterSelection: (id: string) => void;
}

function PhotoCellImpl({
  stub,
  size,
  selectionMode,
  selected,
  onOpen,
  onToggleSelect,
  onEnterSelection,
}: PhotoCellProps) {
  const repo = useVault((s) => s.repo);
  const [url, setUrl] = useState<string | null>(null);
  const longPress = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;
    if (!repo) return;
    repo
      .getThumbUrl(stub)
      .then((u) => {
        if (active) setUrl(u);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [repo, stub]);

  function handleClick() {
    if (selectionMode) onToggleSelect(stub.id);
    else onOpen(stub.id);
  }

  return (
    <button
      onClick={handleClick}
      onPointerDown={() => {
        longPress.current = setTimeout(() => onEnterSelection(stub.id), 450);
      }}
      onPointerUp={() => longPress.current && clearTimeout(longPress.current)}
      onPointerLeave={() => longPress.current && clearTimeout(longPress.current)}
      style={{ width: size, height: size }}
      className="group relative overflow-hidden bg-muted no-tap-highlight"
    >
      {url ? (
        <img
          src={url}
          alt=""
          loading="lazy"
          draggable={false}
          className={cn(
            "h-full w-full object-cover transition-all duration-300 animate-fade-in",
            selectionMode && selected && "scale-90 rounded-lg",
            "group-active:brightness-90",
          )}
        />
      ) : (
        <div className="shimmer h-full w-full" />
      )}

      {stub.type === "video" && !selectionMode && (
        <span className="absolute bottom-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/45 backdrop-blur-sm">
          <Play className="h-3 w-3 fill-white text-white" />
        </span>
      )}

      {stub.favorite && !selectionMode && (
        <Star className="absolute bottom-1.5 left-1.5 h-3.5 w-3.5 fill-white text-white drop-shadow" />
      )}

      {selectionMode && (
        <span className="absolute right-1.5 top-1.5">
          {selected ? (
            <CheckCircle2 className="h-6 w-6 fill-primary text-white" />
          ) : (
            <Circle className="h-6 w-6 text-white/80 drop-shadow" />
          )}
        </span>
      )}
    </button>
  );
}

export const PhotoCell = memo(PhotoCellImpl);
