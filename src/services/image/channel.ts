import { OPENAI_DEFAULT_BASE, isOpenAIModel } from '../openaiImageService';
import { GROK_DEFAULT_BASE, isGrokModel } from '../grokImageService';
import type { ImageChannel } from './types';

export type { ImageChannel };

/** 模型名 -> 通道（grok 优先判，避免将来命名重叠时误判） */
export function getImageChannel(modelName?: string): ImageChannel {
  if (isGrokModel(modelName)) return 'grok';
  if (isOpenAIModel(modelName)) return 'openai';
  return 'gemini';
}

export function isNonGeminiModel(modelName?: string): boolean {
  return getImageChannel(modelName) !== 'gemini';
}

/** UI 展示用：Grok 通道 / OpenAI 通道 / Gemini 通道 */
export function channelLabel(modelName?: string): string {
  const c = getImageChannel(modelName);
  return c === 'grok' ? 'Grok 通道' : c === 'openai' ? 'OpenAI 通道' : 'Gemini 通道';
}

/** 空态标题用：优先显示模型名，回退到通道默认名 */
export function channelDisplayName(modelName?: string): string {
  const c = getImageChannel(modelName);
  if (modelName?.trim()) return modelName.trim();
  return c === 'grok' ? 'Grok Imagine' : c === 'openai' ? 'GPT Image' : 'Gemini 3 Pro';
}

export const CHANNEL_DEFAULT_BASE: Record<ImageChannel, string> = {
  gemini: 'https://generativelanguage.googleapis.com',
  openai: OPENAI_DEFAULT_BASE,
  grok: GROK_DEFAULT_BASE,
};
