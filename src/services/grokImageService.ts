import { AppSettings, Part } from '../types';
import type { Content } from '../types';
import {
  buildModelParts,
  constructUserContent,
  defaultPrompt,
  extractB64FromOpenAIResponse,
  formatImageApiError,
  guessMimeType,
  mapAspectToImageSize,
  resolveCustomBase,
  type OpenAIStyleImageResponse,
} from './image/utils';

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
  return resolveCustomBase(customEndpoint, GROK_DEFAULT_BASE);
}

/** App 分辨率+长宽比 -> Grok size（当前通道支持 3 档，与 OpenAI 通道一致） */
export function mapGrokSize(
  resolution: AppSettings['resolution'],
  aspectRatio: AppSettings['aspectRatio']
): string {
  return mapAspectToImageSize(resolution, aspectRatio);
}

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
  const finalPrompt = defaultPrompt(prompt, images.length);

  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  console.log('[Grok] 请求:', { base, model, size, refCount: images.length });

  try {
    const body: Record<string, unknown> = {
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
      throw formatImageApiError(text || `HTTP ${resp.status}`, resp.status);
    }
    const json = (await resp.json()) as OpenAIStyleImageResponse;

    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    const { b64, revisedPrompt, mimeType } = await extractB64FromOpenAIResponse(json);
    const finalMime = mimeType || guessMimeType(b64);
    const modelParts: Part[] = buildModelParts(b64, finalMime, finalPrompt, revisedPrompt);

    return {
      userContent: constructUserContent(prompt, images),
      modelParts,
    };
  } catch (error: unknown) {
    if ((error as { name?: string })?.name === 'AbortError') throw error;
    console.error('[Grok] Error:', error);
    if (error instanceof Error && 'originalError' in error) throw error;
    throw formatImageApiError(error);
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
