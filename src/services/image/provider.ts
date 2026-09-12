import { generateContent, streamGeminiResponse } from '../geminiService';
import { generateGrokImage } from '../grokImageService';
import { generateOpenAIImage } from '../openaiImageService';
import { getImageChannel } from './channel';
import type { GenerateArgs, GenerateResult, ImageStreamChunk } from './types';

/**
 * 统一非流式入口：按模型名路由到 gemini / openai / grok。
 * ChatInterface 不再需要写三层 if/else。
 */
export async function generateImage(args: GenerateArgs): Promise<GenerateResult> {
  const channel = getImageChannel(args.settings.modelName);
  if (channel === 'openai') {
    return generateOpenAIImage(
      args.apiKey,
      args.history,
      args.prompt,
      args.images,
      args.settings,
      args.signal
    );
  }
  if (channel === 'grok') {
    return generateGrokImage(
      args.apiKey,
      args.history,
      args.prompt,
      args.images,
      args.settings,
      args.signal
    );
  }
  return (await generateContent(
    args.apiKey,
    args.history as unknown as Parameters<typeof generateContent>[1],
    args.prompt,
    args.images,
    args.settings,
    args.signal
  )) as unknown as GenerateResult;
}

/**
 * 统一流式入口：
 * - gemini：真流式（逐 chunk yield）
 * - openai / grok：无真流式，一次性 yield（保持调用方循环不变）
 */
export async function* streamImage(args: GenerateArgs): AsyncGenerator<ImageStreamChunk> {
  const channel = getImageChannel(args.settings.modelName);
  if (channel === 'gemini') {
    const stream = streamGeminiResponse(
      args.apiKey,
      args.history as unknown as Parameters<typeof streamGeminiResponse>[1],
      args.prompt,
      args.images,
      args.settings,
      args.signal
    );
    for await (const chunk of stream) {
      yield chunk as unknown as ImageStreamChunk;
    }
    return;
  }
  const result =
    channel === 'openai'
      ? await generateOpenAIImage(
          args.apiKey,
          args.history,
          args.prompt,
          args.images,
          args.settings,
          args.signal
        )
      : await generateGrokImage(
          args.apiKey,
          args.history,
          args.prompt,
          args.images,
          args.settings,
          args.signal
        );
  yield result;
}
