"use client";
import { Star } from "lucide-react";
import { useTimeline } from "@/components/gallery/use-timeline";
import { PhotoGrid } from "@/components/gallery/photo-grid";
import { EmptyState, GallerySkeleton, PageHeader } from "@/components/vault/section-ui";
import { useT } from "@/lib/i18n";

export default function FavoritesPage() {
  const t = useT();
  const { stubs, loading } = useTimeline({
    type: ["photo", "video"],
    favorite: true,
    trashed: false,
  });

  return (
    <div className="px-3 sm:px-5">
      <PageHeader count={stubs.length} unit={t("unit.favorites")} />
      {loading ? (
        <GallerySkeleton />
      ) : (
        <PhotoGrid
          stubs={stubs}
          emptyState={
            <EmptyState
              icon={Star}
              title={t("empty.favorites.t")}
              subtitle={t("empty.favorites.s")}
            />
          }
        />
      )}
    </div>
  );
}
