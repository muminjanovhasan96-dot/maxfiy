"use client";
import { Image as ImageIcon } from "lucide-react";
import { useTimeline } from "@/components/gallery/use-timeline";
import { PhotoGrid } from "@/components/gallery/photo-grid";
import { DropZone } from "@/components/vault/drop-zone";
import { UploadButton } from "@/components/vault/uploader";
import {
  EmptyState,
  GallerySkeleton,
  PageHeader,
} from "@/components/vault/section-ui";

export default function PhotosPage() {
  const { stubs, loading } = useTimeline({ type: "photo", trashed: false });

  return (
    <div className="px-3 sm:px-5">
      <PageHeader count={stubs.length} unit="photos">
        <UploadButton kind="photo" label="Add photos" />
      </PageHeader>
      <DropZone kind="photo">
        {loading ? (
          <GallerySkeleton />
        ) : (
          <PhotoGrid
            stubs={stubs}
            emptyState={
              <EmptyState
                icon={ImageIcon}
                title="No photos yet"
                subtitle="Add photos and they’ll be encrypted on this device before they’re ever stored. Drag & drop works too."
                action={<UploadButton kind="photo" label="Add photos" />}
              />
            }
          />
        )}
      </DropZone>
    </div>
  );
}
