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
import { useT } from "@/lib/i18n";

export default function PhotosPage() {
  const t = useT();
  const { stubs, loading } = useTimeline({ type: "photo", trashed: false });

  return (
    <div className="px-3 sm:px-5">
      <PageHeader count={stubs.length} unit={t("unit.photos")}>
        <UploadButton kind="photo" label={t("upload.photos")} />
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
                title={t("empty.photos.t")}
                subtitle={t("empty.photos.s")}
                action={<UploadButton kind="photo" label={t("upload.photos")} />}
              />
            }
          />
        )}
      </DropZone>
    </div>
  );
}
