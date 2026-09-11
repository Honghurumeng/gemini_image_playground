import type { Content } from "@google/genai";
import { AppSettings, Part } from '../types';

export const OPENAI_DEFAULT_BASE = 'https://ai98pro.xyz/v1';

export const OPENAI_MODELS = [
  'gpt-image-2.5-flare',
  'gpt-image-2.5-sunburst',
] as const;

export type OpenAIModelId = (typeof OPENAI_MODELS)[number];

/** 是否为 OpenAI 兼容的图片模型（gpt-image-* 等） */
export function isOpenAIModel(modelName?: string): boolean {
  if (!modelName) return false;
  const m = modelName.trim().toLowerCase();
  const stripped = m.startsWith('openai/') ? m.slice('openai/'.length) : m;
  return (
    stripped.startsWith('gpt-image') ||
    stripped.includes('flare') ||
    stripped.includes('sunburst')
  );
}

/** 去掉 openai/ 前缀，返回真实 model id */
export function normalizeOpenAIModel(modelName: string): string {
  const trimmed = modelName.trim();
  if (trimmed.toLowerCase().startsWith('openai/')) {
    return trimmed.slice('openai/'.length);
  }
  return trimmed;
}

/** 解析 Base URL：去掉尾部 /；Google 默认地址时回退到 OpenAI 默认地址 */
export function resolveOpenAIBase(customEndpoint?: string): string {
  const ep = (customEndpoint || '').trim();
  if (!ep || ep.includes('generativelanguage.googleapis.com')) {
    return OPENAI_DEFAULT_BASE;
  }
  return ep.replace(/\/+$/, '');
}



/** App 分辨率+长宽比 -> OpenAI size（当前通道仅支持 3 档） */
export function mapOpenAISize(
  resolution: AppSettings['resolution'],
  aspectRatio: AppSettings['aspectRatio']
): string {
  // resolution 在 OpenAI 通道暂无对应参数，仅按长宽比映射（已实测 3 档均可用）
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

const formatOpenAIError = (error: any, status?: number): Error => {
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

const base64ToBlob = (base64Data: string, mimeType: string): Blob => {
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  return new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
};

interface OpenAIImageResponse {
  created?: number;
  data?: Array<{
    b64_json?: string;
    url?: string;
    revised_prompt?: string;
  }>;
  error?: any;
}

const extractB64FromResponse = async (json: OpenAIImageResponse): Promise<{ b64: string; revisedPrompt?: string }> => {
  if ((json as any)?.error) {
    throw new Error((json as any).error?.message || JSON.stringify((json as any).error).slice(0, 500));
  }
  const item = json.data?.[0];
  if (!item) throw new Error('上游未返回图片数据（data 为空）。');
  if (item.b64_json) {
    return { b64: item.b64_json, revisedPrompt: item.revised_prompt };
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
    return { b64, revisedPrompt: item.revised_prompt };
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
 * OpenAI 兼容通道：文生图 / 图生图（多图编辑）
 * - 无参考图 -> POST {base}/images/generations
 * - 有参考图 -> POST {base}/images/edits（multipart，多 image 字段）
 * 注意：该通道无思考过程、无流式、无历史记忆（history 仅用于 UI，不上传）。
 */
export const generateOpenAIImage = async (
  apiKey: string,
  _history: Content[],
  prompt: string,
  images: { base64Data: string; mimeType: string }[],
  settings: AppSettings,
  signal?: AbortSignal
) => {
  const base = resolveOpenAIBase(settings.customEndpoint);
  const model = normalizeOpenAIModel(settings.modelName || OPENAI_MODELS[0]);
  const size = mapOpenAISize(settings.resolution, settings.aspectRatio);
  const finalPrompt = prompt.trim() || (images.length > 0 ? 'Edit the image(s) as requested.' : 'Generate an image.');

  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  console.log('[OpenAI] 请求:', { base, model, size, refCount: images.length });

  try {
    let json: OpenAIImageResponse;

    if (images.length === 0) {
      const resp = await fetch(`${base}/images/generations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model, prompt: finalPrompt, size, n: 1 }),
        signal,
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        throw formatOpenAIError(text || `HTTP ${resp.status}`, resp.status);
      }
      json = await resp.json();
    } else {
      const form = new FormData();
      form.append('model', model);
      form.append('prompt', finalPrompt);
      form.append('size', size);
      images.forEach((img, idx) => {
        const blob = base64ToBlob(img.base64Data, img.mimeType || 'image/png');
        const ext = (img.mimeType || 'image/png').split('/')[1] || 'png';
        form.append('image', blob, `ref-${idx}.${ext}`);
      });
      const resp = await fetch(`${base}/images/edits`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}` },
        body: form,
        signal,
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        throw formatOpenAIError(text || `HTTP ${resp.status}`, resp.status);
      }
      json = await resp.json();
    }

    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    const { b64, revisedPrompt } = await extractB64FromResponse(json);
    const mimeType = guessMimeType(b64);

    const modelParts: Part[] = [];
    const displayText = revisedPrompt && revisedPrompt !== finalPrompt ? revisedPrompt : undefined;
    if (displayText) modelParts.push({ text: displayText });
    modelParts.push({ inlineData: { mimeType, data: b64 } });

    return {
      userContent: constructUserContent(prompt, images),
      modelParts,
    };
  } catch (error: any) {
    if (error?.name === 'AbortError') throw error;
    console.error('[OpenAI] Error:', error);
    if (error instanceof Error && (error as any).originalError !== undefined) throw error;
    throw formatOpenAIError(error);
  }
};

/** 为兼容 ChatInterface 流式调用：一次性 yield（该通道无真流式） */
export const streamOpenAIResponse = async function* (
  apiKey: string,
  history: Content[],
  prompt: string,
  images: { base64Data: string; mimeType: string }[],
  settings: AppSettings,
  signal?: AbortSignal
) {
  const result = await generateOpenAIImage(apiKey, history, prompt, images, settings, signal);
  yield result;
};
