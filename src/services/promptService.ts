import { PromptItem } from '../types';

const GITHUB_PROMPT_URL = 'https://raw.githubusercontent.com/glidea/banana-prompt-quicker/main/prompts.json';
const API_PROMPT_URL = '/api/prompts';
const CACHE_KEY = 'prompt_library_cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24小时

interface CachedData {
  prompts: PromptItem[];
  timestamp: number;
}

/**
 * 从缓存或 API 获取提示词数据
 */
export async function fetchPrompts(): Promise<PromptItem[]> {
  try {
    // 尝试从缓存读取
    const cached = getCachedPrompts();
    if (cached) {
      return cached;
    }

    // 缓存过期或不存在,从 API 获取
    let response;
    try {
      // 优先尝试使用 Vercel Edge Function 代理 (国内访问更快)
      response = await fetch(API_PROMPT_URL);
      if (!response.ok) throw new Error('API request failed');
    } catch (e) {
      console.warn('Failed to fetch from API proxy, falling back to GitHub direct link:', e);
      // 如果 API 失败 (例如在本地开发环境且未配置代理, 或者 API 挂了), 回退到直接请求 GitHub
      response = await fetch(GITHUB_PROMPT_URL);
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // 先获取响应文本内容进行检查
    const responseText = await response.text();
    console.log('API 原始返回内容:', responseText);
    console.log('响应 Content-Type:', response.headers.get('content-type'));

    // 尝试解析为 JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('JSON 解析失败:', parseError);
      console.error('返回内容前100字符:', responseText.substring(0, 100));
      throw new Error(`Invalid JSON response: ${parseError.message}`);
    }

    // 验证数据格式
    if (!Array.isArray(data)) {
      throw new Error('Invalid data format: expected array');
    }

    // 过滤并验证每个提示词项
    const validPrompts: PromptItem[] = data.filter(isValidPromptItem);

    // 缓存数据
    cachePrompts(validPrompts);

    return validPrompts;
  } catch (error) {
    console.error('Failed to fetch prompts:', error);

    // 如果网络请求失败,尝试返回过期的缓存数据
    const staleCache = getStaleCache();
    if (staleCache) {
      return staleCache;
    }

    throw new Error('无法获取提示词数据,请检查网络连接后重试');
  }
}

/**
 * 从缓存读取提示词(仅返回未过期的数据)
 */
function getCachedPrompts(): PromptItem[] | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const data: CachedData = JSON.parse(cached);
    const now = Date.now();

    // 检查缓存是否过期
    if (now - data.timestamp > CACHE_DURATION) {
      return null;
    }

    return data.prompts;
  } catch (error) {
    console.error('Failed to read cache:', error);
    return null;
  }
}

/**
 * 获取过期的缓存数据(网络请求失败时的备选方案)
 */
function getStaleCache(): PromptItem[] | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const data: CachedData = JSON.parse(cached);
    return data.prompts;
  } catch (error) {
    return null;
  }
}

/**
 * 缓存提示词数据
 */
function cachePrompts(prompts: PromptItem[]): void {
  try {
    const data: CachedData = {
      prompts,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to cache prompts:', error);
    // 缓存失败不影响主流程,静默失败
  }
}

/**
 * 验证提示词项是否有效
 */
function isValidPromptItem(item: any): item is PromptItem {
  return (
    item &&
    typeof item === 'object' &&
    typeof item.title === 'string' &&
    typeof item.preview === 'string' &&
    typeof item.prompt === 'string' &&
    typeof item.author === 'string' &&
    typeof item.link === 'string' &&
    (item.mode === 'edit' || item.mode === 'generate') &&
    typeof item.category === 'string'
  );
}

/**
 * 获取所有唯一的分类
 */
export function getCategories(prompts: PromptItem[]): string[] {
  const categories = new Set<string>();
  prompts.forEach(p => { categories.add(p.category); });
  return ['全部', ...Array.from(categories).sort()];
}

/**
 * 清除缓存
 */
export function clearPromptsCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (error) {
    console.error('Failed to clear cache:', error);
  }
}
