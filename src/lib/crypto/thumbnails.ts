/**
 * Client-side thumbnail + placeholder generation. Runs before encryption so that
 * thumbnails are themselves encrypted at rest. The server never sees the pixels.
 */

export interface ThumbnailResult {
  blob: Blob; // JPEG/WebP thumbnail bytes (to be encrypted by the caller)
  width: number;
  height: number;
  /** Average color as #rrggbb, used for an instant blur-up placeholder. */
  avgColor: string;
}

export interface VideoThumbnailResult extends ThumbnailResult {
  durationMs: number;
}

function pickCanvas(w: number, h: number): {
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  toBlob: (type: string, quality: number) => Promise<Blob>;
} {
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext("2d")!;
    return {
      ctx,
      toBlob: (type, quality) => canvas.convertToBlob({ type, quality }),
    };
  }
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  return {
    ctx,
    toBlob: (type, quality) =>
      new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
          type,
          quality,
        ),
      ),
  };
}

function scaledSize(w: number, h: number, maxEdge: number) {
  const scale = Math.min(1, maxEdge / Math.max(w, h));
  return { tw: Math.max(1, Math.round(w * scale)), th: Math.max(1, Math.round(h * scale)) };
}

function averageColor(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  w: number,
  h: number,
): string {
  try {
    const { data } = ctx.getImageData(0, 0, w, h);
    let r = 0, g = 0, b = 0, count = 0;
    // Sample sparsely for speed.
    const step = Math.max(1, Math.floor(data.length / 4 / 2048)) * 4;
    for (let i = 0; i < data.length; i += step) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      count++;
    }
    const hex = (n: number) =>
      Math.round(n / count).toString(16).padStart(2, "0");
    return `#${hex(r)}${hex(g)}${hex(b)}`;
  } catch {
    return "#1c1c1e";
  }
}

/**
 * A neutral solid-color thumbnail, used when a real thumbnail can't be generated
 * (e.g. a HEIC/unsupported image the browser can't decode). Keeps the upload from
 * failing — the item is still stored and encrypted.
 */
export async function placeholderThumbnail(color = "#2c2c2e"): Promise<ThumbnailResult> {
  const { ctx, toBlob } = pickCanvas(64, 64);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 64, 64);
  const blob = await toBlob("image/webp", 0.8);
  return { blob, width: 64, height: 64, avgColor: color };
}

/**
 * Downscale a large photo before upload so it transfers quickly over mobile
 * networks. Keeps ~2560px on the longest edge at good JPEG quality (typically
 * 1–2 MB vs 5–10 MB originals). Returns the original file if compression
 * wouldn't help or isn't possible.
 */
export async function compressImage(
  file: Blob,
  maxEdge = 2560,
  quality = 0.85,
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const longest = Math.max(bitmap.width, bitmap.height);
  if (longest <= maxEdge && file.size < 1_500_000) {
    bitmap.close?.();
    return file;
  }
  const { tw, th } = scaledSize(bitmap.width, bitmap.height, maxEdge);
  const { ctx, toBlob } = pickCanvas(tw, th);
  ctx.drawImage(bitmap, 0, 0, tw, th);
  bitmap.close?.();
  const out = await toBlob("image/jpeg", quality);
  return out.size < file.size ? out : file;
}

export async function generateImageThumbnail(
  file: Blob,
  maxEdge = 512,
  quality = 0.82,
): Promise<ThumbnailResult> {
  const bitmap = await createImageBitmap(file);
  const { tw, th } = scaledSize(bitmap.width, bitmap.height, maxEdge);
  const { ctx, toBlob } = pickCanvas(tw, th);
  ctx.drawImage(bitmap, 0, 0, tw, th);
  const avgColor = averageColor(ctx, tw, th);
  bitmap.close?.();
  // WebP where supported gives smaller thumbnails; fall back happens automatically.
  const blob = await toBlob("image/webp", quality);
  return { blob, width: bitmap.width, height: bitmap.height, avgColor };
}

export async function generateVideoThumbnail(
  file: Blob,
  atSeconds = 0.1,
  maxEdge = 512,
  quality = 0.82,
): Promise<VideoThumbnailResult> {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.src = url;

    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("Cannot read video metadata"));
    });

    const seekTo = Math.min(atSeconds, (video.duration || 1) / 2);
    await new Promise<void>((resolve, reject) => {
      video.onseeked = () => resolve();
      video.onerror = () => reject(new Error("Cannot seek video"));
      video.currentTime = seekTo;
    });

    const vw = video.videoWidth || 1;
    const vh = video.videoHeight || 1;
    const { tw, th } = scaledSize(vw, vh, maxEdge);
    const { ctx, toBlob } = pickCanvas(tw, th);
    ctx.drawImage(video, 0, 0, tw, th);
    const avgColor = averageColor(ctx, tw, th);
    const blob = await toBlob("image/webp", quality);
    return {
      blob,
      width: vw,
      height: vh,
      avgColor,
      durationMs: Math.round((video.duration || 0) * 1000),
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}
