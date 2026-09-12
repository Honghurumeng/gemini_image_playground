import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { useUiStore } from '../store/useUiStore';
import { X, Settings } from 'lucide-react';
import { channelLabel, isNonGeminiModel } from '../services/image/channel';

export const SettingsPanel: React.FC = () => {
  const { apiKey, settings, updateSettings, toggleSettings, openApiConfigDialog, apiConfigs, applyApiConfig } = useAppStore();
  const { showDialog } = useUiStore();
  const isActiveConfig = (c: { apiKey: string; endpoint: string; model?: string }) =>
    c.apiKey === apiKey &&
    c.endpoint === (settings.customEndpoint || '') &&
    (c.model || 'gemini-3-pro-image-preview') === (settings.modelName || 'gemini-3-pro-image-preview');

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">设置</h2>
        <button onClick={toggleSettings} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg sm:hidden">
          <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
        </button>
      </div>

      <div className="space-y-8 flex-1">

        {/* Config switch */}
        <section>
          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">配置方案</label>
          {apiConfigs.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-500">暂无已保存方案，请点击下方「编辑 API 配置」新增。</p>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {apiConfigs.map((c) => {
                const active = isActiveConfig(c);
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      applyApiConfig(c.id);
                      if (isNonGeminiModel(c.model)) {
                        updateSettings({ useGrounding: false, enableThinking: false });
                      }
                    }}
                    className={`rounded-lg border px-3 py-2 text-left text-sm font-medium transition ${active ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-700'}`}
                  >
                    <span className="block truncate">{c.name}{active ? '（使用中）' : ''}</span>
                    <span className="block truncate text-[10px] font-normal opacity-60">{c.model || '默认模型'} · {channelLabel(c.model)}</span>
                  </button>
                );
              })}
            </div>
          )}
          <p className="mt-2 text-[10px] text-gray-400 dark:text-gray-500">切换方案自动识别模型类型（OpenAI / Grok / Gemini）。增改请点「编辑 API 配置」。当前：{settings.modelName || 'gemini-3-pro-image-preview'}</p>
        </section>

        {/* Image Settings Group */}
        <div className="space-y-8">
            {/* Resolution */}
            <section className="mb-4">
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">图像分辨率</label>
              <div className="grid grid-cols-3 gap-2">
                {(['1K', '2K', '4K'] as const).map((res) => (
                  <button
                    key={res}
                    onClick={() => {
                      if (res === '2K' || res === '4K') {
                        updateSettings({ resolution: res, streamResponse: false });
                      } else {
                        updateSettings({ resolution: res });
                      }
                    }}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                      settings.resolution === res
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'
                        : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-700'
                    }`}
                  >
                    {res}
                  </button>
                ))}
              </div>
            </section>

            {/* Aspect Ratio */}
            <section>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">长宽比</label>
              <div className="grid grid-cols-3 gap-2">
                {(['Auto', '1:1', '3:4', '4:3', '9:16', '16:9'] as const).map((ratio) => {
                  const isActive = settings.aspectRatio === ratio;
                  const ratioPreviewStyles: Record<string, string> = {
                    'Auto': 'w-6 h-6 border-dashed',
                    '1:1': 'w-6 h-6',
                    '3:4': 'w-5 h-7',
                    '4:3': 'w-7 h-5',
                    '9:16': 'w-4 h-7',
                    '16:9': 'w-7 h-4',
                  };

                  return (
                    <button
                      key={ratio}
                      onClick={() => updateSettings({ aspectRatio: ratio })}
                      className={`flex flex-col items-center justify-center gap-2 rounded-lg border p-3 transition ${
                        isActive
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'
                          : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900'
                      }`}
                    >
                      <div
                        className={`rounded-sm border-2 ${
                          isActive ? 'border-blue-400 bg-blue-100 dark:bg-blue-400/20' : 'border-gray-400 dark:border-gray-600 bg-gray-200 dark:bg-gray-800'
                        } ${ratioPreviewStyles[ratio]}`}
                      />
                      <span className="text-xs font-medium">{ratio}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Grounding */}
            <section className={isNonGeminiModel(settings.modelName) ? 'opacity-50 pointer-events-none' : ''}>
              <label className="flex items-center justify-between cursor-pointer group">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300">Google 搜索定位{isNonGeminiModel(settings.modelName) ? `（${channelLabel(settings.modelName)}不支持）` : ''}</span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={settings.useGrounding}
                    onChange={(e) => updateSettings({ useGrounding: (e.target as HTMLInputElement).checked })}
                    className="sr-only peer"
                  />
                  <div className="h-6 w-11 rounded-full bg-gray-200 dark:bg-gray-800 peer-focus:ring-2 peer-focus:ring-blue-500/50 peer-checked:bg-blue-600 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full"></div>
                </div>
              </label>
              <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                允许 Gemini 通过 Google 搜索获取实时信息。
              </p>
            </section>

            {/* Thinking Process */}
            <section className={isNonGeminiModel(settings.modelName) ? 'opacity-50 pointer-events-none' : ''}>
              <label className="flex items-center justify-between cursor-pointer group">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300">显示思考过程{isNonGeminiModel(settings.modelName) ? `（${channelLabel(settings.modelName)}不支持）` : ''}</span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={settings.enableThinking}
                    onChange={(e) => updateSettings({ enableThinking: (e.target as HTMLInputElement).checked })}
                    className="sr-only peer"
                  />
                  <div className="h-6 w-11 rounded-full bg-gray-200 dark:bg-gray-800 peer-focus:ring-2 peer-focus:ring-blue-500/50 peer-checked:bg-blue-600 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full"></div>
                </div>
              </label>
            </section>
          </div>

        {/* Streaming */}
        <section>
          <label className="flex items-center justify-between cursor-pointer group">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300">流式响应</span>
            <div className="relative">
              <input
                type="checkbox"
                checked={settings.streamResponse}
                onChange={(e) => {
                  const checked = (e.target as HTMLInputElement).checked;
                  if (checked && (settings.resolution === '2K' || settings.resolution === '4K')) {
                    showDialog({
                        type: 'confirm',
                        title: '潜在问题',
                        message: "警告：2K 或 4K 分辨率配合流式传输可能会导致内容不完整。是否继续？",
                        confirmLabel: "仍然启用",
                        onConfirm: () => updateSettings({ streamResponse: true })
                    });
                  } else {
                    updateSettings({ streamResponse: checked });
                  }
                }}
                 className="sr-only peer"
              />
              <div className="h-6 w-11 rounded-full bg-gray-200 dark:bg-gray-800 peer-focus:ring-2 peer-focus:ring-blue-500/50 peer-checked:bg-blue-600 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full"></div>
            </div>
          </label>
          <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
             逐个 token 流式传输模型的响应。对于一次性响应请禁用。{isNonGeminiModel(settings.modelName) ? `${channelLabel(settings.modelName)}无真流式，开关仅决定调用路径，效果一致。` : ''}
          </p>
        </section>
  
  
        {/* Data Management */}
        <section className="pt-4 border-t border-gray-200 dark:border-gray-800">

            <button
                onClick={() => {
                    openApiConfigDialog();
                }}
                className="w-full flex items-center justify-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 p-3 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            >
                <Settings className="h-4 w-4" />
                <span>编辑 API 配置</span>
            </button>
        </section>

        {/* Info */}
        <div className="mt-1 pb-4 text-center text-[10px] text-gray-400 dark:text-gray-600 space-y-1">
           <p className="truncate px-4">接口地址: {settings.customEndpoint || 'https://generativelanguage.googleapis.com'}</p>
           <p className="truncate px-4">模型: {settings.modelName || 'gemini-3-pro-image-preview'}</p>
        </div>
      </div>
    </div>
  );
};
