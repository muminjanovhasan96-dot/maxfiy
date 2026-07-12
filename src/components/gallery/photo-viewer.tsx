"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { useVault } from "@/store/vault-store";
import type { ItemStub, StoredItem } from "@/lib/storage/types";
import { triggerDownload } from "@/lib/repo/backup";
import { toast } from "@/components/ui/toaster";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface ViewerProps {
  items: ItemStub[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
  onChanged: () => void;
}

export function PhotoViewer({ items, index, onIndexChange, onClose, onChanged }: ViewerProps) {
  const t = useT();
  const repo = useVault((s) => s.repo);
  const stub = items[index];
  const [item, setItem] = useState<StoredItem | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [favorite, setFavorite] = useState(stub?.favorite ?? false);

  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const urlCache = useRef<Map<string, string>>(new Map());

  const go = useCallback(
    (dir: number) => {
      const next = index + dir;
      if (next < 0 || next >= items.length) return;
      setScale(1);
      setPos({ x: 0, y: 0 });
      onIndexChange(next);
    },
    [index, items.length, onIndexChange],
  );

  // Load current asset.
  useEffect(() => {
    let active = true;
    if (!repo || !stub) return;
    setLoading(true);
    setFavorite(stub.favorite);
    (async () => {
      const full = await repo.getItem(stub.id);
      if (!full || !active) return;
      setItem(full);
      const cached = urlCache.current.get(stub.id);
      if (cached) {
        setUrl(cached);
        setLoading(false);
        return;
      }
      try {
        const u = await repo.getAssetUrl(full);
        if (!active) {
          URL.revokeObjectURL(u);
          return;
        }
        urlCache.current.set(stub.id, u);
        setUrl(u);
      } catch {
        toast.error(t("toast.couldNotDecrypt"));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [repo, stub]);

  // Revoke all cached object URLs on unmount.
  useEffect(() => {
    const cache = urlCache.current;
    return () => {
      for (const u of cache.values()) URL.revokeObjectURL(u);
      cache.clear();
    };
  }, []);

  // Keyboard + scroll lock.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [go, onClose]);

  async function toggleFavorite() {
    if (!repo || !item) return;
    const next = !favorite;
    setFavorite(next);
    await repo.setFavorite(item.id, next);
    onChanged();
  }

  async function download() {
    if (!repo || !item) return;
    toast.show(t("doc.decrypting"));
    const blob = await repo.getAssetBlob(item);
    const meta = await repo.decryptMeta(item);
    triggerDownload(blob, meta.name || `maxfiy-${item.id}`);
  }

  async function remove() {
    if (!repo || !item) return;
    await repo.trash(item.id);
    onChanged();
    toast.success(t("toast.moved"));
    if (items.length <= 1) onClose();
    else go(index === items.length - 1 ? -1 : 1);
  }

  const isVideo = stub?.type === "video";

  function onPointerDown(e: React.PointerEvent) {
    drag.current = { x: e.clientX, y: e.clientY, panX: pos.x, panY: pos.y };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current || scale <= 1) return;
    setPos({
      x: drag.current.panX + (e.clientX - drag.current.x),
      y: drag.current.panY + (e.clientY - drag.current.y),
    });
  }
  function onPointerUp(e: React.PointerEvent) {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    drag.current = null;
    if (scale <= 1 && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
      go(dx < 0 ? 1 : -1);
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80] flex flex-col bg-black"
      >
        {/* top bar */}
        <div className="absolute inset-x-0 top-0 z-10 flex items-center gap-1 bg-gradient-to-b from-black/70 to-transparent px-2 pb-8 pt-[max(0.5rem,env(safe-area-inset-top))] text-white">
          <button onClick={onClose} className="rounded-full p-2.5 hover:bg-white/10">
            <X className="h-6 w-6" />
          </button>
          <span className="flex-1 text-center text-sm text-white/80">
            {index + 1} {t("common.of")} {items.length}
          </span>
          <button onClick={toggleFavorite} className="rounded-full p-2.5 hover:bg-white/10">
            <Star className={cn("h-6 w-6", favorite && "fill-white")} />
          </button>
          <button onClick={download} className="rounded-full p-2.5 hover:bg-white/10">
            <Download className="h-6 w-6" />
          </button>
          <button onClick={remove} className="rounded-full p-2.5 hover:bg-white/10">
            <Trash2 className="h-6 w-6" />
          </button>
        </div>

        {/* media */}
        <div className="relative flex flex-1 items-center justify-center overflow-hidden">
          {loading && <Loader2 className="absolute h-8 w-8 animate-spin text-white/70" />}

          {url && isVideo ? (
            <video
              key={stub.id}
              src={url}
              controls
              autoPlay
              playsInline
              className="max-h-full max-w-full"
            />
          ) : url ? (
            <img
              key={stub.id}
              src={url}
              alt=""
              draggable={false}
              onDoubleClick={() => {
                setScale((s) => (s > 1 ? 1 : 2.5));
                setPos({ x: 0, y: 0 });
              }}
              onWheel={(e) => {
                const next = Math.min(5, Math.max(1, scale - e.deltaY * 0.002));
                setScale(next);
                if (next === 1) setPos({ x: 0, y: 0 });
              }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              style={{
                transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
                cursor: scale > 1 ? "grab" : "auto",
              }}
              className="max-h-full max-w-full touch-none select-none object-contain transition-transform duration-100"
            />
          ) : null}

          {/* desktop nav arrows */}
          {index > 0 && (
            <button
              onClick={() => go(-1)}
              className="absolute left-3 hidden rounded-full bg-white/10 p-3 text-white backdrop-blur hover:bg-white/20 md:block"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}
          {index < items.length - 1 && (
            <button
              onClick={() => go(1)}
              className="absolute right-3 hidden rounded-full bg-white/10 p-3 text-white backdrop-blur hover:bg-white/20 md:block"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
