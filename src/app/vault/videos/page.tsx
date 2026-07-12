"use client";
import { Video } from "lucide-react";
import { useTimeline } from "@/components/gallery/use-timeline";
import { PhotoGrid } from "@/components/gallery/photo-grid";
import { DropZone } from "@/components/vault/drop-zone";
import { UploadButton } from "@/components/vault/uploader";
import {
  EmptyState,
  GallerySkeleton,
  PageHeader,
} from "@/components/vault/section-ui";

export default function VideosPage() {
  const { stubs, loading } = useTimeline({ type: "video", trashed: false });

  return (
    <div className="px-3 sm:px-5">
      <PageHeader count={stubs.length} unit="videos">
        <UploadButton kind="video" label="Add videos" />
      </PageHeader>
      <DropZone kind="video">
        {loading ? (
          <GallerySkeleton />
        ) : (
          <PhotoGrid
            stubs={stubs}
            emptyState={
              <EmptyState
                icon={Video}
                title="No videos yet"
                subtitle="Videos are encrypted in chunks so they never load fully into memory — playback starts fast and stays private."
                action={<UploadButton kind="video" label="Add videos" />}
              />
            }
          />
        )}
      </DropZone>
    </div>
  );
}
