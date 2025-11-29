import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Sparkles, ExternalLink, Loader2 } from 'lucide-react';
import { useUiStore } from '../store/useUiStore';
import { useAppStore } from '../store/useAppStore';
import { PromptItem } from '../types';
import { fetchPrompts, getCategories } from '../services/promptService';

interface PromptLibraryPanelProps {
  onSelectPrompt?: (prompt: string) => void;
}

export const PromptLibraryPanel: React.FC<PromptLibraryPanelProps> = ({ onSelectPrompt }) => {
  const { isPromptLibraryOpen, closePromptLibrary, addToast } = useUiStore();
  const { setInputText, inputText } = useAppStore();

  const [prompts, setPrompts] = useState<PromptItem[]>([]);
  const [filteredPrompts, setFilteredPrompts] = useState<PromptItem[]>([]);
  const [categories, setCategories] = useState<string[]>(['全部']);
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 加载提示词数据
  const loadPrompts = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchPrompts();
      setPrompts(data);
      setFilteredPrompts(data);
      setCategories(getCategories(data));
    } catch (err) {
      const message = err instanceof Error ? err.message : '加载失败';
      setError(message);
      addToast(message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 面板打开时加载数据
  useEffect(() => {
    if (isPromptLibraryOpen && prompts.length === 0) {
      loadPrompts();
    }
  }, [isPromptLibraryOpen]);

  // 分类筛选
  useEffect(() => {
    if (selectedCategory === '全部') {
      setFilteredPrompts(prompts);
    } else {
      setFilteredPrompts(prompts.filter(p => p.category === selectedCategory));
    }
  }, [selectedCategory, prompts]);

  // 选择提示词
  const handleSelectPrompt = (prompt: PromptItem) => {
    if (onSelectPrompt) {
      onSelectPrompt(prompt.prompt);
    } else {
      // 默认行为：追加到输入框
      const newText = inputText ? `${inputText}\n\n${prompt.prompt}` : prompt.prompt;
      setInputText(newText);
    }

    addToast(`已应用提示词：${prompt.title}`, 'success');
    closePromptLibrary();
  };

  if (!isPromptLibraryOpen) return null;

  return (
    <>
      {/* 遮罩层 */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity duration-300"
        onClick={closePromptLibrary}
      />

      {/* 面板主体 */}
      <div className="fixed right-0 top-0 z-50 h-full w-full sm:w-[600px] bg-white dark:bg-gray-900 shadow-2xl transform transition-transform duration-300 ease-out overflow-hidden flex flex-col">

        {/* 头部 */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 bg-linear-to-r from-purple-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 px-6 py-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">提示词库</h2>
          </div>
          <button
            onClick={closePromptLibrary}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-white/50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 分类筛选 */}
        <div className="border-b border-gray-200 dark:border-gray-800 px-6 py-3 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition ${
                  selectedCategory === cat
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            // 加载状态
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <Loader2 className="h-10 w-10 text-purple-600 dark:text-purple-400 animate-spin" />
              <p className="text-sm text-gray-500 dark:text-gray-400">加载提示词中...</p>
            </div>
          ) : error ? (
            // 错误状态
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="text-center">
                <p className="text-red-600 dark:text-red-400 font-medium mb-2">加载失败</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
              </div>
              <button
                onClick={loadPrompts}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition"
              >
                <RefreshCw className="h-4 w-4" />
                重试
              </button>
            </div>
          ) : filteredPrompts.length === 0 ? (
            // 空状态
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <Sparkles className="h-12 w-12 text-gray-300 dark:text-gray-600" />
              <p className="text-sm text-gray-500 dark:text-gray-400">该分类暂无提示词</p>
            </div>
          ) : (
            // 提示词列表
            <div className="grid gap-4 grid-cols-1">
              {filteredPrompts.map((prompt, index) => (
                <PromptCard
                  key={`${prompt.title}-${prompt.author ?? index}`}
                  prompt={prompt}
                  onSelect={handleSelectPrompt}
                />
              ))}
            </div>
          )}
        </div>

        {/* 底部说明 */}
        <div className="border-t border-gray-200 dark:border-gray-800 px-6 py-3 bg-gray-50 dark:bg-gray-800/50">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            提示词来源：
            <a
              href="https://github.com/glidea/banana-prompt-quicker"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-600 dark:text-purple-400 hover:underline ml-1"
            >
              banana-prompt-quicker
            </a>
          </p>
        </div>
      </div>
    </>
  );
};

// 提示词卡片组件
interface PromptCardProps {
  prompt: PromptItem;
  onSelect: (prompt: PromptItem) => void;
}

const PromptCard: React.FC<PromptCardProps> = ({ prompt, onSelect }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  return (
    <div
      onClick={() => onSelect(prompt)}
      className="group cursor-pointer rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-purple-400 dark:hover:border-purple-600 hover:shadow-lg transition-all duration-200 overflow-hidden"
    >
      {/* 预览图 */}
      <div className="relative aspect-video bg-gray-100 dark:bg-gray-700 overflow-hidden">
        {!imageError ? (
          <>
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
              </div>
            )}
            <img
              src={prompt.preview}
              alt={prompt.title}
              loading="lazy"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
            />
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            <Sparkles className="h-8 w-8" />
          </div>
        )}

        {/* 分类标签 */}
        <div className="absolute top-2 left-2">
          <span className="px-2 py-1 rounded-md text-xs font-medium bg-black/60 text-white backdrop-blur-sm">
            {prompt.category}
          </span>
        </div>

        {/* 模式标签 */}
        <div className="absolute top-2 right-2">
          <span className="px-2 py-1 rounded-md text-xs font-medium bg-purple-600/90 text-white backdrop-blur-sm">
            {prompt.mode === 'edit' ? '编辑' : '生成'}
          </span>
        </div>
      </div>

      {/* 内容区 */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-1">
          {prompt.title}
        </h3>

        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
          {prompt.prompt}
        </p>

        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <span>作者：</span>
            <span className="font-medium">{prompt.author}</span>
          </span>

          {prompt.link && (
            <a
              href={prompt.link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-purple-600 dark:text-purple-400 hover:underline"
            >
              查看详情
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
