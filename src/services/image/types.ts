import type { AppSettings, Content, Part } from '../../types';

export type ImageChannel = 'gemini' | 'openai' | 'grok';

export interface RefImage {
  base64Data: string;
  mimeType: string;
}

export interface GenerateArgs {
  apiKey: string;
  history: Content[];
  prompt: string;
  images: RefImage[];
  settings: AppSettings;
  signal?: AbortSignal;
}

export interface GenerateResult {
  userContent: Content;
  modelParts: Part[];
}

export type ImageStreamChunk = GenerateResult;
