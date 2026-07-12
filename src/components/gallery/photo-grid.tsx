"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { format, isToday, isYesterday } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { Star, Trash2, X } from "lucide-react";
import { useVault } from "@/store/vault-store";
import type { ItemStub } from "@/lib/storage/types";
import { PhotoCell } from "./photo-cell";
import { PhotoViewer } from "./photo-viewer";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { dateLocale, useLang, useT, type TFunc } from "@/lib/i18n";
import type { Locale } from "date-fns";

const GAP = 3;
const HEADER_H = 52;

type Row =
  | { kind: "header"; key: string; label: string }
  | { kind: "photos"; key: string; items: ItemStub[] };

function dayLabel(ts: number, t: TFunc, locale: Locale): string {
  if (isToday(ts)) return t("date.today");
  if (isYesterday(ts)) return t("date.yesterday");
  return format(ts, "EEEE, d MMMM yyyy", { locale });
}

export function PhotoGrid({
  stubs,
  emptyState,
}: {
  stubs: ItemStub[];
  emptyState?: React.ReactNode;
}) {
  const t = useT();
  const lang = useLang();
  const locale = dateLocale(lang);
  const bump = useVault((s) => s.bump);
  const repo = useVault((s) => s.repo);
  const listRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [offsetTop, setOffsetTop] = useState(0);

  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const measure = () => {
      setWidth(el.clientWidth);
      const rect = el.getBoundingClientRect();
      setOffsetTop(rect.top + window.scrollY);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { columns, cellSize } = useMemo(() => {
    if (!width) return { columns: 3, cellSize: 120 };
    const target = width < 480 ? 116 : width < 900 ? 140 : 158;
    const cols = Math.max(3, Math.floor((width + GAP) / (target + GAP)));
    const cell = Math.floor((width - GAP * (cols - 1)) / cols);
    return { columns: cols, cellSize: cell };
  }, [width]);

  // Build the flat row model: a header per day, then chunked photo rows.
  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    let currentDay = "";
    let bucket: ItemStub[] = [];
    const flush = () => {
      for (let i = 0; i < bucket.length; i += columns) {
        out.push({
          kind: "photos",
          key: `r-${bucket[i].id}`,
          items: bucket.slice(i, i + columns),
        });
      }
      bucket = [];
    };
    for (const s of stubs) {
      const day = new Date(s.sortKey).toDateString();
      if (day !== currentDay) {
        flush();
        currentDay = day;
        out.push({ kind: "header", key: `h-${day}`, label: dayLabel(s.sortKey, t, locale) });
      }
      bucket.push(s);
    }
    flush();
    return out;
  }, [stubs, columns, t, locale]);

  const rowHeight = useCallback(
    (index: number) => (rows[index]?.kind === "header" ? HEADER_H : cellSize + GAP),
    [rows, cellSize],
  );

  const virtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: rowHeight,
    overscan: 8,
    scrollMargin: offsetTop,
    getItemKey: (i) => rows[i]?.key ?? i,
  });

  // Re-measure rows when cell size changes.
  useEffect(() => {
    virtualizer.measure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cellSize, rows.length]);

  const toggleSelect = useCallback((id: string) => {
    setSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const enterSelection = useCallback((id: string) => {
    setSelectionMode(true);
    setSelection(new Set([id]));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectionMode(false);
    setSelection(new Set());
  }, []);

  async function favoriteSelected() {
    if (!repo) return;
    const n = selection.size;
    for (const id of selection) await repo.setFavorite(id, true);
    toast.success(t("toast.favorited", { n }));
    clearSelection();
    bump();
  }
  async function trashSelected() {
    if (!repo) return;
    const n = selection.size;
    for (const id of selection) await repo.trash(id);
    toast.success(t("toast.movedN", { n }));
    clearSelection();
    bump();
  }

  if (stubs.length === 0) {
    return <>{emptyState}</>;
  }

  return (
    <>
      <div ref={listRef} className="relative w-full">
        <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
          {virtualizer.getVirtualItems().map((vItem) => {
            const row = rows[vItem.index];
            if (!row) return null;
            const top = vItem.start - virtualizer.options.scrollMargin;
            if (row.kind === "header") {
              return (
                <div
                  key={vItem.key}
                  style={{ position: "absolute", top, left: 0, height: vItem.size, width: "100%" }}
                  className="flex items-end px-1 pb-2 pt-4"
                >
                  <h2 className="text-[15px] font-semibold tracking-tight">{row.label}</h2>
                </div>
              );
            }
            return (
              <div
                key={vItem.key}
                style={{ position: "absolute", top, left: 0, height: vItem.size, width: "100%", gap: GAP }}
                className="flex"
              >
                {row.items.map((stub) => (
                  <div key={stub.id} style={{ marginRight: GAP }}>
                    <PhotoCell
                      stub={stub}
                      size={cellSize}
                      selectionMode={selectionMode}
                      selected={selection.has(stub.id)}
                      onOpen={(id) => setViewerIndex(stubs.findIndex((s) => s.id === id))}
                      onToggleSelect={toggleSelect}
                      onEnterSelection={enterSelection}
                    />
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {selectionMode && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 32 }}
            className="glass fixed inset-x-0 bottom-16 z-50 mx-auto flex max-w-md items-center gap-2 rounded-full border border-border px-3 py-2 shadow-glow md:bottom-6"
          >
            <Button variant="ghost" size="icon" onClick={clearSelection}>
              <X className="h-5 w-5" />
            </Button>
            <span className="flex-1 text-sm font-medium">
              {t("gallery.selected", { n: selection.size })}
            </span>
            <Button variant="ghost" size="sm" onClick={favoriteSelected} disabled={!selection.size}>
              <Star className="h-4 w-4" /> {t("gallery.favorite")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={trashSelected}
              disabled={!selection.size}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4" /> {t("common.delete")}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {viewerIndex !== null && (
        <PhotoViewer
          items={stubs}
          index={viewerIndex}
          onIndexChange={setViewerIndex}
          onClose={() => setViewerIndex(null)}
          onChanged={bump}
        />
      )}
    </>
  );
}
