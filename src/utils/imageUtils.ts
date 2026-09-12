/**
 * 将 Base64 字符串转换为 Blob 对象（分块解码，大图不会 OOM）。
 * 与 src/services/image/utils.ts 中的同名函数保持行为一致。
 */
export const base64ToBlob = (base64Data: string, mimeType: string): Blob => {
  const CHUNK = 0x8000;
  const byteCharacters = atob(base64Data);
  const chunks: Uint8Array[] = [];
  for (let i = 0; i < byteCharacters.length; i += CHUNK) {
    const slice = byteCharacters.slice(i, i + CHUNK);
    const bytes = new Uint8Array(slice.length);
    for (let j = 0; j < slice.length; j++) {
      bytes[j] = slice.charCodeAt(j);
    }
    chunks.push(bytes);
  }
  return new Blob(chunks as BlobPart[], { type: mimeType });
};

/** 上传前压缩约束：最长边 2048px，JPEG/WebP 质量 0.85 */
export const MAX_UPLOAD_DIMENSION = 2048;
export const UPLOAD_IMAGE_QUALITY = 0.85;
/** 小于该体积且尺寸不超限的图片直接原图上传，保画质 */
const PASSTHROUGH_BYTES = 2 * 1024 * 1024;

const loadImageElement = (objectUrl: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = objectUrl;
  });

const canvasToBlob = (
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number
): Promise<Blob | null> =>
  new Promise((resolve) => {
    try {
      canvas.toBlob((b) => resolve(b), type, quality);
    } catch {
      resolve(null);
    }
  });

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

/**
 * 发往图片通道前的统一压缩：
 * - 最长边超过 2048 则等比缩小，否则保持原尺寸
 * - JPEG/WebP 用 0.85 质量重编码；PNG 保持 PNG（保透明，仅做尺寸收缩）
 * - 解码/编码失败时抛错，由调用方回退到原图
 */
export const compressImageBlob = async (
  blob: Blob,
  originalMime: string
): Promise<{ blob: Blob; mimeType: string; width: number; height: number }> => {
  const objectUrl = URL.createObjectURL(blob);
  try {
    const img = await loadImageElement(objectUrl);
    const srcW = img.naturalWidth || img.width;
    const srcH = img.naturalHeight || img.height;
    if (!srcW || !srcH) throw new Error('invalid image size');

    // 小图直接透传
    if (blob.size <= PASSTHROUGH_BYTES && Math.max(srcW, srcH) <= MAX_UPLOAD_DIMENSION) {
      return { blob, mimeType: originalMime || blob.type || 'image/png', width: srcW, height: srcH };
    }

    const scale = Math.min(1, MAX_UPLOAD_DIMENSION / Math.max(srcW, srcH));
    const width = Math.max(1, Math.round(srcW * scale));
    const height = Math.max(1, Math.round(srcH * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no canvas context');
    ctx.drawImage(img, 0, 0, width, height);

    const isPng = (originalMime || blob.type || '').includes('png');
    const exportType = isPng ? 'image/png' : (originalMime || 'image/jpeg');
    const exportQuality = isPng ? undefined : UPLOAD_IMAGE_QUALITY;
    const out = await canvasToBlob(canvas, exportType, exportQuality);
    if (!out) throw new Error('encode failed');
    // 压缩后反而更大（常见于 PNG 线稿）则回退原图
    if (out.size >= blob.size) {
      return { blob, mimeType: originalMime || blob.type || 'image/png', width: srcW, height: srcH };
    }
    return { blob: out, mimeType: out.type || exportType, width, height };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

/** File -> 压缩后的上传附件（preview/base64Data 均为压缩结果） */
export const fileToCompressedAttachment = async (
  file: File
): Promise<{ preview: string; base64Data: string; mimeType: string; file: File }> => {
  try {
    const { blob, mimeType } = await compressImageBlob(file, file.type || 'image/png');
    const dataUrl = await blobToDataUrl(blob);
    const base64Data = dataUrl.split(',')[1] || '';
    if (!base64Data) throw new Error('empty base64');
    const outFile =
      blob === file
        ? file
        : new File([blob], file.name || 'image', { type: mimeType });
    return { preview: dataUrl, base64Data, mimeType, file: outFile };
  } catch {
    // 压缩失败（HEIC 等浏览器解不了的格式）回退原图直传
    const dataUrl = await blobToDataUrl(file);
    return {
      preview: dataUrl,
      base64Data: dataUrl.split(',')[1] || '',
      mimeType: file.type || 'image/png',
      file,
    };
  }
};

/** dataURL（画板导出等）-> 压缩后的 base64 */
export const compressDataUrl = async (
  dataUrl: string,
  mimeType: string
): Promise<{ base64Data: string; mimeType: string }> => {
  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const { blob: out, mimeType: outMime } = await compressImageBlob(blob, mimeType);
    const outUrl = await blobToDataUrl(out);
    return { base64Data: outUrl.split(',')[1] || '', mimeType: outMime };
  } catch {
    return { base64Data: dataUrl.split(',')[1] || '', mimeType };
  }
};

/**
 * 创建图片缩略图
 * @param base64Data 原图 Base64
 * @param mimeType MIME 类型
 * @param maxWidth 最大宽度，默认 200px
 * @returns Promise<string> 缩略图 Base64
 */
export const createThumbnail = (base64Data: string, mimeType: string, maxWidth: number = 200): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      // 使用较低质量导出 JPEG 缩略图，或者保持原格式
      // 这里统一用 JPEG 以减小体积，除非是 PNG 透明图
      const exportType = mimeType === 'image/png' ? 'image/png' : 'image/jpeg';
      resolve(canvas.toDataURL(exportType, 0.7).split(',')[1]); // 返回不带前缀的 base64
    };
    img.onerror = reject;
    img.src = `data:${mimeType};base64,${base64Data}`;
  });
};

/**
 * 下载图片
 * @param mimeType 图片的 MIME 类型
 * @param base64Data 图片的 Base64 数据
 * @param filename 可选的文件名，如果不提供则自动生成
 */
export const downloadImage = (mimeType: string, base64Data: string, filename?: string) => {
  const blob = base64ToBlob(base64Data, mimeType);
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  
  if (filename) {
    link.download = filename;
  } else {
    const extension = mimeType.split('/')[1] || 'png';
    link.download = `gemini-image-${Date.now()}.${extension}`;
  }
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/**
 * 在新标签页中打开图片
 * @param mimeType 图片的 MIME 类型
 * @param base64Data 图片的 Base64 数据
 */
export const openImageInNewTab = (mimeType: string, base64Data: string) => {
  const blob = base64ToBlob(base64Data, mimeType);
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  
  // 延长 revoke 时间以确保图片在新标签页加载完成
  setTimeout(() => URL.revokeObjectURL(url), 60000);
};
