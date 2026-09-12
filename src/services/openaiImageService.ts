import { AppSettings, Part } from '../types';
import type { Content } from '../types';
import {
  base64ToBlob,
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
  return resolveCustomBase(customEndpoint, OPENAI_DEFAULT_BASE);
}

/** App 分辨率+长宽比 -> OpenAI size（当前通道仅支持 3 档） */
export function mapOpenAISize(
  resolution: AppSettings['resolution'],
  aspectRatio: AppSettings['aspectRatio']
): string {
  return mapAspectToImageSize(resolution, aspectRatio);
}

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
  const finalPrompt = defaultPrompt(prompt, images.length);

  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  console.log('[OpenAI] 请求:', { base, model, size, refCount: images.length });

  try {
    let json: OpenAIStyleImageResponse;

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
        throw formatImageApiError(text || `HTTP ${resp.status}`, resp.status);
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
        throw formatImageApiError(text || `HTTP ${resp.status}`, resp.status);
      }
      json = await resp.json();
    }

    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    const { b64, revisedPrompt } = await extractB64FromOpenAIResponse(json);
    const mimeType = guessMimeType(b64);
    const modelParts: Part[] = buildModelParts(b64, mimeType, finalPrompt, revisedPrompt);

    return {
      userContent: constructUserContent(prompt, images),
      modelParts,
    };
  } catch (error: unknown) {
    if ((error as { name?: string })?.name === 'AbortError') throw error;
    console.error('[OpenAI] Error:', error);
    if (error instanceof Error && 'originalError' in error) throw error;
    throw formatImageApiError(error);
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
