import type { Orientation } from './types';

const THUMB_MAX_DIM = 400;
const DISPLAY_MAX_DIM = 1600;
const DEFAULT_QUALITY = 0.82;

export async function processImage(file: File): Promise<{
  thumbBlob: Blob;
  displayBlob: Blob;
  width: number;
  height: number;
  orientation: Orientation;
  mimeType: string;
  byteSize: number;
}> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;
  const orientation = width > height ? 'landscape' : width < height ? 'portrait' : 'square';

  const [thumbBlob, displayBlob] = await Promise.all([
    resizeImage(bitmap, THUMB_MAX_DIM, DEFAULT_QUALITY),
    resizeImage(bitmap, DISPLAY_MAX_DIM, DEFAULT_QUALITY),
  ]);

  bitmap.close();

  return {
    thumbBlob,
    displayBlob,
    width,
    height,
    orientation,
    mimeType: 'image/webp',
    byteSize: displayBlob.size,
  };
}

async function resizeImage(
  bitmap: ImageBitmap,
  maxDim: number,
  quality: number,
): Promise<Blob> {
  const { width, height } = bitmap;
  const scale = Math.min(1, maxDim / Math.max(width, height));
  const targetWidth = Math.round(width * scale);
  const targetHeight = Math.round(height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Cannot get canvas context');

  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      blob => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create blob'));
      },
      'image/webp',
      quality,
    );
  });
}

export function createObjectUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

export function revokeObjectUrl(url: string): void {
  if (url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
