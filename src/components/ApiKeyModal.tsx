import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Key, ExternalLink, ChevronDown, ChevronRight, Settings2 } from 'lucide-react';

export const ApiKeyModal: React.FC = () => {
  const { setApiKey, updateSettings, settings } = useAppStore();
  const [inputKey, setInputKey] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [endpoint, setEndpoint] = useState(settings.customEndpoint || '');
  const [model, setModel] = useState(settings.modelName || 'gemini-3-pro-image-preview');

  // Sync local state with store settings (e.g. when updated via URL params)
  useEffect(() => {
    if (settings.customEndpoint) setEndpoint(settings.customEndpoint);
    if (settings.modelName) setModel(settings.modelName);
  }, [settings.customEndpoint, settings.modelName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputKey.trim()) return;
    
    updateSettings({
      customEndpoint: endpoint,
      modelName: model
    });
    setApiKey(inputKey);
    // TODO: 余额查询功能暂时禁用，等待重新实现
    // setTimeout(() => fetchBalance(), 0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/80 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl p-6 sm:p-8 transition-colors duration-200">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-blue-50 dark:bg-blue-500/10 p-4 ring-1 ring-blue-200 dark:ring-blue-500/50">
            <Key className="h-8 w-8 text-blue-600 dark:text-blue-500" />
          </div>
        </div>
        
        <h2 className="mb-2 text-center text-2xl font-bold text-gray-900 dark:text-white">输入 API Key</h2>
        <p className="mb-8 text-center text-gray-500 dark:text-gray-400">
          此应用 100% 在您的浏览器中运行。您的 Key 仅存储在本地设备上。
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="apiKey" className="sr-only">API Key</label>
            <input
              type="password"
              id="apiKey"
              value={inputKey}
              onChange={(e) => setInputKey(e.currentTarget.value)}
              className="w-full rounded-lg bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
              placeholder="AIzaSy..."
              autoFocus
            />
          </div>

          {/* Advanced Settings */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="group flex items-center gap-2 text-sm text-gray-500 dark:text-gray-500 transition-all"
            >
              <div className="flex items-center gap-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:underline">
                <Settings2 className="h-3 w-3" />
                <span>高级配置</span>
                {showAdvanced ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </div>
            </button>

            <div 
              className={`grid transition-all duration-300 ease-in-out ${
                showAdvanced ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
              }`}
            >
              <div className="overflow-hidden">
                <div className="mt-2 rounded-lg bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 p-4 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">自定义接口地址 (可选)</label>
                    <input
                      type="text"
                      value={endpoint}
                      onChange={(e) => setEndpoint(e.currentTarget.value)}
                      className="w-full rounded-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:border-blue-500 focus:outline-none"
                      placeholder="https://undyapi.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">模型名称</label>
                    <input
                      type="text"
                      value={model}
                      onChange={(e) => setModel(e.currentTarget.value)}
                      className="w-full rounded-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:border-blue-500 focus:outline-none"
                      placeholder="gemini-3-pro-image-preview"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={!inputKey.trim()}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            开始创作
          </button>
        </form>

        <div className="mt-6 flex justify-center">
          <a 
            href="https://vip.undyingapi.com/console/token" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center text-sm text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition"
          >
            <span>获取 Gemini API Key</span>
            <ExternalLink className="ml-1 h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
};
