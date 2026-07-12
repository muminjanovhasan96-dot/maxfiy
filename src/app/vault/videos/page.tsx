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
import { useT } from "@/lib/i18n";

export default function VideosPage() {
  const t = useT();
  const { stubs, loading } = useTimeline({ type: "video", trashed: false });

  return (
    <div className="px-3 sm:px-5">
      <PageHeader count={stubs.length} unit={t("unit.videos")}>
        <UploadButton kind="video" label={t("upload.videos")} />
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
                title={t("empty.videos.t")}
                subtitle={t("empty.videos.s")}
                action={<UploadButton kind="video" label={t("upload.videos")} />}
              />
            }
          />
        )}
      </DropZone>
    </div>
  );
}
