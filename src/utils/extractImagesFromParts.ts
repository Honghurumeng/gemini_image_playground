import type { Part } from '../types';

export type ExtractedImage = {
  mimeType: string;
  base64Data: string;
  source: 'inlineData' | 'dataUrl';
};

const buildDedupeKey = (mimeType: string, base64Data: string) => {
  const head = base64Data.slice(0, 32);
  const tail = base64Data.slice(-32);
  return `${mimeType}:${base64Data.length}:${head}:${tail}`;
};

// Some Gemini responses embed images as inlineData parts, while others may embed
// them as data URLs inside markdown/text. We extract both so history stays in sync
// with what the user sees in the chat.
export const extractImagesFromParts = (parts: Part[]): ExtractedImage[] => {
  const out: ExtractedImage[] = [];
  const seen = new Set<string>();

  for (const part of parts) {
    if (part.thought) continue;

    if (part.inlineData?.data) {
      const mimeType = part.inlineData.mimeType || 'image/png';
      const base64Data = part.inlineData.data;
      const key = buildDedupeKey(mimeType, base64Data);
      if (!seen.has(key)) {
        seen.add(key);
        out.push({ mimeType, base64Data, source: 'inlineData' });
      }
    }

    if (part.text) {
      // Match data URLs in either markdown `![](...)` or raw text.
      const dataUrlRegex = /data:image\/[a-zA-Z0-9.+-]+;base64,[^)'"\s]+/g;
      const matches = part.text.match(dataUrlRegex);
      if (!matches) continue;

      for (const dataUrl of matches) {
        const [prefix, base64Data] = dataUrl.split(',');
        if (!prefix || !base64Data) continue;
        const mimeType = prefix.split(';')[0]?.split(':')[1] || 'image/png';
        const key = buildDedupeKey(mimeType, base64Data);
        if (!seen.has(key)) {
          seen.add(key);
          out.push({ mimeType, base64Data, source: 'dataUrl' });
        }
      }
    }
  }

  return out;
};
