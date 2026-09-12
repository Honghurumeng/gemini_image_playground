import type { AppSettings, Content, Part } from '../../types';
import type { RefImage } from './types';

/** b64 前缀猜测 mime（/9j/=jpeg，iVBOR=png，R0lGOD=gif，UklGR=webp） */
export function guessMimeType(b64: string): string {
  if (b64.startsWith('/9j/')) return 'image/jpeg';
  if (b64.startsWith('iVBOR')) return 'image/png';
  if (b64.startsWith('R0lGOD')) return 'image/gif';
  if (b64.startsWith('UklGR')) return 'image/webp';
  return 'image/png';
}

/**
 * 分块 base64 -> Blob，避免 `new Array(hugeLength)` 一次性分配导致大图 OOM。
 * openai/grok 服务 + imageUtils 原先都是同步大数组实现，这里统一替换。
 */
export function base64ToBlob(base64Data: string, mimeType: string): Blob {
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
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] || '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** OpenAI/Grok 共用的中文错误格式化（两家原本一字不差，抽到这里） */
export function formatImageApiError(error: unknown, status?: number): Error {
  let message = '发生了未知错误，请稍后重试。';
  const err = error as { message?: unknown; error?: { message?: unknown } };
  const raw: string =
    (typeof err?.message === 'string' ? err.message : '') ||
    (typeof err?.error?.message === 'string' ? (err.error.message as string) : '') ||
    (() => {
      try {
        return String(error);
      } catch {
        return '';
      }
    })();

  const lower = raw.toLowerCase();
  if (
    status === 401 ||
    raw.includes('401') ||
    lower.includes('invalid api key') ||
    lower.includes('incorrect api key')
  ) {
    message = 'API Key 无效或过期，请检查您的设置。';
  } else if (status === 403 || raw.includes('403')) {
    message = '访问被拒绝（403）。请检查 Key 权限或切换节点。';
  } else if (status === 404 || raw.includes('404') || lower.includes('model')) {
    message = `模型不存在或通道不支持（404）：${raw.slice(0, 200)}`;
  } else if (raw.includes('429')) {
    message = '请求过于频繁，请稍后再试（429）。';
  } else if (status === 400 || raw.includes('400')) {
    message = `请求参数无效 (400)：${raw.slice(0, 300)}`;
  } else if (raw.includes('503') || raw.includes('502') || raw.includes('500')) {
    message = '上游服务暂时不可用，请稍后重试。';
  } else if (
    raw.includes('Failed to fetch') ||
    raw.includes('NetworkError') ||
    raw.includes('TypeError') ||
    raw.includes('Load failed')
  ) {
    message = '浏览器直连失败：该供应商不支持跨域（CORS），请切换到支持浏览器直连的供应商。';
  } else if (raw) {
    message = `请求出错: ${raw.slice(0, 500)}`;
  }

  const newError = new Error(message);
  (newError as unknown as Record<string, unknown>).originalError = error;
  (newError as unknown as Record<string, unknown>).status = status;
  return newError;
}

/** 统一构造 userContent（Gemini/OpenAI/Grok 原先三份相同实现） */
export function constructUserContent(prompt: string, images: RefImage[]): Content {
  const parts: Part[] = [];
  images.forEach((img) => {
    parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64Data } });
  });
  if (prompt.trim()) parts.push({ text: prompt });
  return { role: 'user', parts };
}

/**
 * App 长宽比 -> OpenAI/Grok size（两家都是 3 档，逻辑完全一致）。
 * resolution 在图片通道暂无对应参数，仅按长宽比映射。
 */
export function mapAspectToImageSize(
  resolution: AppSettings['resolution'],
  aspectRatio: AppSettings['aspectRatio']
): string {
  void resolution;
  switch (aspectRatio) {
    case '3:4':
    case '9:16':
      return '1024x1536';
    case '4:3':
    case '16:9':
      return '1536x1024';
    case 'Auto':
    case '1:1':
    default:
      return '1024x1024';
  }
}

/** 解析自定义 Base：去尾部 /；空或 Google 地址时回退到 fallback */
export function resolveCustomBase(customEndpoint: string | undefined, fallback: string): string {
  const ep = (customEndpoint || '').trim();
  if (!ep || ep.includes('generativelanguage.googleapis.com')) {
    return fallback;
  }
  return ep.replace(/\/+$/, '');
}

export interface OpenAIStyleImageItem {
  b64_json?: string;
  b64?: string;
  url?: string;
  mime_type?: string;
  revised_prompt?: string;
}

export interface OpenAIStyleImageResponse {
  created?: number;
  data?: OpenAIStyleImageItem[];
  error?: unknown;
}

/**
 * 统一解析 OpenAI 风格返回：
 * - b64_json（Grok 带 response_format 时、部分 OpenAI 通道）
 * - b64（个别代理字段名）
 * - url（需二次下载；Grok media 域实测公网可直连）
 */
export async function extractB64FromOpenAIResponse(
  json: OpenAIStyleImageResponse
): Promise<{ b64: string; revisedPrompt?: string; mimeType?: string }> {
  const err = (json as { error?: { message?: string } })?.error;
  if (err) {
    const msg =
      err.message ||
      (() => {
        try {
          return JSON.stringify(err).slice(0, 500);
        } catch {
          return 'unknown error';
        }
      })();
    throw new Error(msg);
  }
  const item = json.data?.[0];
  if (!item) throw new Error('上游未返回图片数据（data 为空）。');
  if (item.b64_json) {
    return { b64: item.b64_json, revisedPrompt: item.revised_prompt, mimeType: item.mime_type };
  }
  if (item.b64) {
    return { b64: item.b64, revisedPrompt: item.revised_prompt, mimeType: item.mime_type };
  }
  if (item.url) {
    const resp = await fetch(item.url);
    if (!resp.ok) throw new Error(`图片 URL 下载失败: ${resp.status}`);
    const blob = await resp.blob();
    const b64 = await blobToBase64(blob);
    return { b64, revisedPrompt: item.revised_prompt, mimeType: item.mime_type || blob.type };
  }
  throw new Error('上游返回格式不支持（既无 b64_json 也无 url）。');
}

/** 无参考图/有参考图时的默认 prompt（两家原本相同） */
export function defaultPrompt(prompt: string, refCount: number): string {
  const trimmed = prompt.trim();
  if (trimmed) return trimmed;
  return refCount > 0 ? 'Edit the image(s) as requested.' : 'Generate an image.';
}

/** revised_prompt 与请求不一致时才展示，避免复读 */
export function buildModelParts(
  b64: string,
  mimeType: string,
  finalPrompt: string,
  revisedPrompt?: string
): Part[] {
  const parts: Part[] = [];
  if (revisedPrompt && revisedPrompt !== finalPrompt) parts.push({ text: revisedPrompt });
  parts.push({ inlineData: { mimeType, data: b64 } });
  return parts;
}
