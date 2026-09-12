import type { Content } from "@google/genai";
import { AppSettings, Part } from '../types';

export const GROK_DEFAULT_BASE = 'https://api.x.ai/v1';

export const GROK_MODELS = [
  'grok-imagine-image-2.0',
  'grok-imagine-image',
  'grok-imagine-image-edit',
  'grok-imagine-image-lite',
  'grok-imagine-image-quality',
] as const;

export type GrokModelId = (typeof GROK_MODELS)[number];

/** 是否为 Grok 图片模型（grok-imagine-* / grok-*-image* 等） */
export function isGrokModel(modelName?: string): boolean {
  if (!modelName) return false;
  const m = modelName.trim().toLowerCase();
  // 兼容 xai/、grok/、openai/ 等前缀
  const stripped = m.includes('/') ? (m.split('/').pop() || m) : m;
  if (stripped.includes('grok-imagine') || stripped.includes('grok') && stripped.includes('image')) {
    return true;
  }
  // 兼容 bare imagine 命名
  if (stripped.includes('imagine-image')) {
    return true;
  }
  return false;
}

/** 去掉 xai/、grok/、openai/ 等前缀，返回真实 model id */
export function normalizeGrokModel(modelName: string): string {
  const trimmed = modelName.trim();
  const lower = trimmed.toLowerCase();
  for (const prefix of ['xai/', 'grok/', 'openai/']) {
    if (lower.startsWith(prefix)) {
      return trimmed.slice(prefix.length);
    }
  }
  // 兼容 org/model 形式：取最后一节（仅当最后一节像 grok 模型时）
  if (trimmed.includes('/')) {
    const last = trimmed.split('/').pop() || trimmed;
    if (isGrokModel(last)) return last;
  }
  return trimmed;
}

/** 解析 Base URL：去掉尾部 /；Google 默认地址时回退到 Grok 默认地址 */
export function resolveGrokBase(customEndpoint?: string): string {
  const ep = (customEndpoint || '').trim();
  if (!ep || ep.includes('generativelanguage.googleapis.com')) {
    return GROK_DEFAULT_BASE;
  }
  return ep.replace(/\/+$/, '');
}

/** App 分辨率+长宽比 -> Grok size（当前通道支持 3 档，与 OpenAI 通道一致） */
export function mapGrokSize(
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

const formatGrokError = (error: any, status?: number): Error => {
  let message = '发生了未知错误，请稍后重试。';
  const raw: string = error?.message || error?.error?.message || error?.toString() || '';

  if (status === 401 || raw.includes('401') || raw.toLowerCase().includes('invalid api key') || raw.toLowerCase().includes('incorrect api key')) {
    message = 'API Key 无效或过期，请检查您的设置。';
  } else if (status === 403 || raw.includes('403')) {
    message = '访问被拒绝（403）。请检查 Key 权限或切换节点。';
  } else if (status === 404 || raw.includes('404') || raw.toLowerCase().includes('model')) {
    message = `模型不存在或通道不支持（404）：${raw.slice(0, 200)}`;
  } else if (raw.includes('429')) {
    message = '请求过于频繁，请稍后再试（429）。';
  } else if (status === 400 || raw.includes('400')) {
    message = `请求参数无效 (400)：${raw.slice(0, 300)}`;
  } else if (raw.includes('503') || raw.includes('502') || raw.includes('500')) {
    message = '上游服务暂时不可用，请稍后重试。';
  } else if (raw.includes('Failed to fetch') || raw.includes('NetworkError') || raw.includes('TypeError') || raw.includes('Load failed')) {
    message = '浏览器直连失败：该供应商不支持跨域（CORS），请切换到支持浏览器直连的供应商。';
  } else if (raw) {
    message = `请求出错: ${raw.slice(0, 500)}`;
  }

  const newError = new Error(message);
  (newError as any).originalError = error;
  (newError as any).status = status;
  return newError;
};

const guessMimeType = (b64: string): string => {
  if (b64.startsWith('/9j/')) return 'image/jpeg';
  if (b64.startsWith('iVBOR')) return 'image/png';
  if (b64.startsWith('R0lGOD')) return 'image/gif';
  if (b64.startsWith('UklGR')) return 'image/webp';
  return 'image/png';
};

interface GrokImageResponse {
  created?: number;
  data?: Array<{
    b64_json?: string;
    b64?: string;
    url?: string;
    mime_type?: string;
    revised_prompt?: string;
  }>;
  error?: any;
}

const extractB64FromResponse = async (json: GrokImageResponse): Promise<{ b64: string; revisedPrompt?: string; mimeType?: string }> => {
  if ((json as any)?.error) {
    throw new Error((json as any).error?.message || JSON.stringify((json as any).error).slice(0, 500));
  }
  const item = json.data?.[0];
  if (!item) throw new Error('上游未返回图片数据（data 为空）。');
  if (item.b64_json) {
    return { b64: item.b64_json, revisedPrompt: item.revised_prompt, mimeType: item.mime_type };
  }
  if ((item as any).b64) {
    return { b64: (item as any).b64, revisedPrompt: item.revised_prompt, mimeType: item.mime_type };
  }
  if (item.url) {
    // 兼容只返回 url 的通道：下载后转 base64
    const resp = await fetch(item.url);
    if (!resp.ok) throw new Error(`图片 URL 下载失败: ${resp.status}`);
    const blob = await resp.blob();
    const b64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1] || '');
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    return { b64, revisedPrompt: item.revised_prompt, mimeType: item.mime_type || blob.type };
  }
  throw new Error('上游返回格式不支持（既无 b64_json 也无 url）。');
};

const constructUserContent = (prompt: string, images: { base64Data: string; mimeType: string }[]): Content => {
  const parts: Content['parts'] = [];
  images.forEach((img) => {
    parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64Data } } as any);
  });
  if (prompt.trim()) parts.push({ text: prompt } as any);
  return { role: 'user', parts: parts as any };
};

/**
 * Grok 图片通道：文生图 / 图生图统一走 POST {base}/images/generations（JSON）
 * - 无参考图 -> { model, prompt, size, n: 1, response_format: 'b64_json' }
 * - 有参考图 -> 同上 + image: 单张为 dataURL 字符串，多张为 dataURL 数组
 * 注意：该通道无思考过程、无流式、无历史记忆（history 仅用于 UI，不上传）。
 * 实测通道（wzw.pp.ua）返回 { data: [{ url, mime_type }] } 或 b64_json（当请求 response_format=b64_json 时）。
 */
export const generateGrokImage = async (
  apiKey: string,
  _history: Content[],
  prompt: string,
  images: { base64Data: string; mimeType: string }[],
  settings: AppSettings,
  signal?: AbortSignal
) => {
  const base = resolveGrokBase(settings.customEndpoint);
  const model = normalizeGrokModel(settings.modelName || GROK_MODELS[0]);
  const size = mapGrokSize(settings.resolution, settings.aspectRatio);
  const finalPrompt = prompt.trim() || (images.length > 0 ? 'Edit the image(s) as requested.' : 'Generate an image.');

  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  console.log('[Grok] 请求:', { base, model, size, refCount: images.length });

  try {
    const body: Record<string, any> = {
      model,
      prompt: finalPrompt,
      size,
      n: 1,
      response_format: 'b64_json',
    };
    if (images.length > 0) {
      const dataUrls = images.map(
        (img) => `data:${img.mimeType || 'image/png'};base64,${img.base64Data}`
      );
      body.image = dataUrls.length === 1 ? dataUrls[0] : dataUrls;
    }

    const resp = await fetch(`${base}/images/generations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal,
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw formatGrokError(text || `HTTP ${resp.status}`, resp.status);
    }
    const json = (await resp.json()) as GrokImageResponse;

    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    const { b64, revisedPrompt, mimeType } = await extractB64FromResponse(json);
    const finalMime = mimeType || guessMimeType(b64);

    const modelParts: Part[] = [];
    const displayText = revisedPrompt && revisedPrompt !== finalPrompt ? revisedPrompt : undefined;
    if (displayText) modelParts.push({ text: displayText });
    modelParts.push({ inlineData: { mimeType: finalMime, data: b64 } });

    return {
      userContent: constructUserContent(prompt, images),
      modelParts,
    };
  } catch (error: any) {
    if (error?.name === 'AbortError') throw error;
    console.error('[Grok] Error:', error);
    if (error instanceof Error && (error as any).originalError !== undefined) throw error;
    throw formatGrokError(error);
  }
};

/** 为兼容 ChatInterface 流式调用：一次性 yield（该通道无真流式） */
export const streamGrokResponse = async function* (
  apiKey: string,
  history: Content[],
  prompt: string,
  images: { base64Data: string; mimeType: string }[],
  settings: AppSettings,
  signal?: AbortSignal
) {
  const result = await generateGrokImage(apiKey, history, prompt, images, settings, signal);
  yield result;
};
