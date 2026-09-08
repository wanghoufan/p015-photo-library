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
  // 首选：解码 → webp 缩略图/展示图（体积小、显示快）
  try {
    const bitmap = await createImageBitmap(file);
    try {
      const { width, height } = bitmap;
      const orientation = width > height ? 'landscape' : width < height ? 'portrait' : 'square';

      const [thumbBlob, displayBlob] = await Promise.all([
        resizeImage(bitmap, THUMB_MAX_DIM, DEFAULT_QUALITY),
        resizeImage(bitmap, DISPLAY_MAX_DIM, DEFAULT_QUALITY),
      ]);

      return {
        thumbBlob,
        displayBlob,
        width,
        height,
        orientation,
        mimeType: 'image/webp',
        byteSize: displayBlob.size,
      };
    } finally {
      bitmap.close();
    }
  } catch {
    // 降级：浏览器解码不了（如部分 HEIC）→ 用 <img> 只读尺寸，原文件直存
    return await processOriginal(file);
  }
}

/** 不转码：原文件直存，仅读取尺寸定向。尺寸都读不出则抛可展示错误。 */
async function processOriginal(file: File): Promise<{
  thumbBlob: Blob;
  displayBlob: Blob;
  width: number;
  height: number;
  orientation: Orientation;
  mimeType: string;
  byteSize: number;
}> {
  const dims = await readDimensions(file);
  if (!dims) {
    throw new Error(`无法读取图片「${file.name}」：浏览器不支持该格式，请先转为 JPG 再上传`);
  }
  const { width, height } = dims;
  const orientation = width > height ? 'landscape' : width < height ? 'portrait' : 'square';
  return {
    thumbBlob: file,
    displayBlob: file,
    width,
    height,
    orientation,
    mimeType: file.type || 'image/*',
    byteSize: file.size,
  };
}

function readDimensions(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise(resolve => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    const done = (ok: boolean) => {
      URL.revokeObjectURL(url);
      resolve(ok ? { width: img.naturalWidth, height: img.naturalHeight } : null);
    };
    img.onload = () => done(img.naturalWidth > 0);
    img.onerror = () => done(false);
    img.src = url;
  });
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
