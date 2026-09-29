import { base64ToBlob } from './imageUtils';

export type BgRemovalProgress = (percent: number, stage: string) => void;

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      resolve(url.split(',')[1] || '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

/**
 * 纯前端本地抠图（透明背景）。
 * 基于 @imgly/background-removal，模型首次运行时从 CDN 下载（约 40MB），之后浏览器缓存。
 * 动态 import，避免首屏 bundle 膨胀。
 *
 * @param base64Data 原图 base64（不带前缀）
 * @param mimeType 原图 mime
 * @param onProgress 进度回调 0~1
 * @returns PNG 透明背景图的 base64（不带前缀）
 */
export const removeImageBackground = async (
  base64Data: string,
  mimeType: string,
  onProgress?: BgRemovalProgress
): Promise<{ base64Data: string; mimeType: 'image/png' }> => {
  if (!base64Data) throw new Error('图片数据为空');

  const srcBlob = base64ToBlob(base64Data, mimeType || 'image/png');

  // 动态加载，首屏不受 onnxruntime (~10MB) 影响
  const { removeBackground } = await import('@imgly/background-removal');

  onProgress?.(0.02, '正在加载抠图模型…');

  const resultBlob: Blob = await removeBackground(srcBlob, {
    output: { format: 'image/png', quality: 1 },
    progress: (key: string, current: number, total: number) => {
      // key 形如 fetch:/... / compute:inference
      const ratio = total > 0 ? current / total : 0;
      // fetch 阶段占 0~90%，compute 阶段占 90%~99%
      let percent = 0.05;
      let stage = '正在处理…';
      if (key.startsWith('fetch')) {
        percent = 0.05 + ratio * 0.85;
        stage = '正在下载抠图模型（首次约40MB）…';
      } else if (key.startsWith('compute')) {
        percent = 0.9 + ratio * 0.09;
        stage = 'AI 正在抠图…';
      }
      onProgress?.(Math.min(0.99, percent), stage);
    },
  } as any);

  onProgress?.(0.99, '正在导出透明 PNG…');
  const outBase64 = await blobToBase64(resultBlob);
  if (!outBase64) throw new Error('抠图结果为空');
  onProgress?.(1, '完成');
  return { base64Data: outBase64, mimeType: 'image/png' };
};

/** 归一化框选矩形（相对原图 0~1） */
export interface CropRectNorm {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * 按归一化矩形裁剪原图，返回 PNG base64（不带前缀）。
 * 用于“只抠选中区域”：先裁剪再送入抠图模型。
 */
export const cropImageRegion = (
  base64Data: string,
  mimeType: string,
  rect: CropRectNorm
): Promise<{ base64Data: string; mimeType: 'image/png'; width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    if (!base64Data) {
      reject(new Error('图片数据为空'));
      return;
    }
    const img = new Image();
    img.onload = () => {
      try {
        const natW = img.naturalWidth || img.width;
        const natH = img.naturalHeight || img.height;
        if (!natW || !natH) {
          reject(new Error('图片尺寸无效'));
          return;
        }
        // 钳制到 0~1，防止越界
        const x = Math.min(1, Math.max(0, rect.x));
        const y = Math.min(1, Math.max(0, rect.y));
        const w = Math.min(1 - x, Math.max(0, rect.w));
        const h = Math.min(1 - y, Math.max(0, rect.h));
        const sx = Math.round(x * natW);
        const sy = Math.round(y * natH);
        const sw = Math.round(w * natW);
        const sh = Math.round(h * natH);
        if (sw < 8 || sh < 8) {
          reject(new Error('框选区域太小，请框大一点'));
          return;
        }
        const canvas = document.createElement('canvas');
        canvas.width = sw;
        canvas.height = sh;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('浏览器不支持 Canvas 裁剪'));
          return;
        }
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
        const dataUrl = canvas.toDataURL('image/png');
        const out = dataUrl.split(',')[1] || '';
        if (!out) {
          reject(new Error('裁剪结果为空'));
          return;
        }
        resolve({ base64Data: out, mimeType: 'image/png', width: sw, height: sh });
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error('图片解码失败，无法裁剪'));
    img.src = `data:${mimeType || 'image/png'};base64,${base64Data}`;
  });
};

export const isBackgroundRemovalSupported = (): boolean => {
  try {
    return typeof WebAssembly !== 'undefined' && typeof Worker !== 'undefined';
  } catch {
    return false;
  }
};
