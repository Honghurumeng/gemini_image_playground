/**
 * 将 Base64 字符串转换为 Blob 对象
 * @param base64Data Base64 编码的数据
 * @param mimeType MIME 类型
 * @returns Blob 对象
 */
export const base64ToBlob = (base64Data: string, mimeType: string): Blob => {
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
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
