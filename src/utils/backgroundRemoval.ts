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

export const isBackgroundRemovalSupported = (): boolean => {
  try {
    return typeof WebAssembly !== 'undefined' && typeof Worker !== 'undefined';
  } catch {
    return false;
  }
};
