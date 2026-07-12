"use client";
import { Star } from "lucide-react";
import { useTimeline } from "@/components/gallery/use-timeline";
import { PhotoGrid } from "@/components/gallery/photo-grid";
import { EmptyState, GallerySkeleton, PageHeader } from "@/components/vault/section-ui";

export default function FavoritesPage() {
  const { stubs, loading } = useTimeline({
    type: ["photo", "video"],
    favorite: true,
    trashed: false,
  });

  return (
    <div className="px-3 sm:px-5">
      <PageHeader count={stubs.length} unit="favorites" />
      {loading ? (
        <GallerySkeleton />
      ) : (
        <PhotoGrid
          stubs={stubs}
          emptyState={
            <EmptyState
              icon={Star}
              title="No favorites yet"
              subtitle="Mark photos and videos as favorites and they’ll gather here for quick access."
            />
          }
        />
      )}
    </div>
  );
}
