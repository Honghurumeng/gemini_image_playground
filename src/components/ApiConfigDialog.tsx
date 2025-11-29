import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { X, Settings, Save, Trash2, Download, Upload } from 'lucide-react';

export const ApiConfigDialog: React.FC = () => {
  const {
    isApiConfigDialogOpen,
    closeApiConfigDialog,
    apiConfigs,
    saveApiConfig,
    applyApiConfig,
    deleteApiConfig,
    updateApiConfig,
    apiKey,
    settings
  } = useAppStore();

  const [showSaveForm, setShowSaveForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    apiKey: '',
    endpoint: '',
    model: ''
  });

  const resetForm = () => {
    setFormData({
      name: '',
      apiKey: '',
      endpoint: '',
      model: ''
    });
    setShowSaveForm(false);
    setEditingConfig(null);
  };

  const handleSaveConfig = () => {
    if (!formData.name.trim() || !formData.apiKey.trim()) return;

    if (editingConfig) {
      updateApiConfig(editingConfig, formData);
    } else {
      saveApiConfig(formData);
    }
    resetForm();
  };

  const handleApplyConfig = (configId: string) => {
    applyApiConfig(configId);
    closeApiConfigDialog();
  };

  const handleEditConfig = (configId: string) => {
    const config = apiConfigs.find(c => c.id === configId);
    if (config) {
      setFormData({
        name: config.name,
        apiKey: config.apiKey,
        endpoint: config.endpoint,
        model: config.model
      });
      setEditingConfig(configId);
      setShowSaveForm(true);
    }
  };

  const handleDeleteConfig = (configId: string) => {
    if (window.confirm('确定要删除此配置吗？')) {
      deleteApiConfig(configId);
    }
  };

  const handleSaveCurrentConfig = () => {
    setFormData({
      name: '',
      apiKey: apiKey || '',
      endpoint: settings.customEndpoint || '',
      model: ''
    });
    setShowSaveForm(true);
    setEditingConfig(null);
  };

  if (!isApiConfigDialogOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/80 backdrop-blur-sm px-4">
      <div className="w-full max-w-2xl max-h-[90vh] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">API 配置管理</h2>
          <button
            onClick={closeApiConfigDialog}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
          {/* 保存当前配置按钮 */}
          <div className="mb-6">
            <button
              onClick={handleSaveCurrentConfig}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 p-4 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-600 transition"
            >
              <Save className="h-4 w-4" />
              <span>保存当前配置</span>
            </button>
          </div>

          {/* 配置表单 */}
          {showSaveForm && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/50 rounded-lg">
              <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-3">
                {editingConfig ? '编辑配置' : '新增配置'}
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    配置名称
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: (e.target as HTMLInputElement).value })}
                    className="w-full rounded-md bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none"
                    placeholder="例如：默认配置"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    API Key
                  </label>
                  <input
                    type="password"
                    value={formData.apiKey}
                    onChange={(e) => setFormData({ ...formData, apiKey: (e.target as HTMLInputElement).value })}
                    className="w-full rounded-md bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none"
                    placeholder="AIzaSy..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    接口地址
                  </label>
                  <input
                    type="text"
                    value={formData.endpoint}
                    onChange={(e) => setFormData({ ...formData, endpoint: (e.target as HTMLInputElement).value })}
                    className="w-full rounded-md bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none"
                    placeholder="https://generativelanguage.googleapis.com"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveConfig}
                    disabled={!formData.name.trim() || !formData.apiKey.trim()}
                    className="flex-1 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    {editingConfig ? '更新' : '保存'}
                  </button>
                  <button
                    onClick={resetForm}
                    className="flex-1 rounded-md bg-gray-200 dark:bg-gray-800 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700 transition"
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 配置列表 */}
          {apiConfigs.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Settings className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>暂无保存的配置</p>
              <p className="text-sm mt-1">点击上方按钮保存当前配置</p>
            </div>
          ) : (
            <div className="space-y-3">
              {apiConfigs.map((config) => (
                <div
                  key={config.id}
                  className="p-4 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {config.name}
                    </h3>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEditConfig(config.id)}
                        className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition-colors"
                        title="编辑"
                      >
                        <Settings className="h-4 w-4 text-gray-500" />
                      </button>
                      <button
                        onClick={() => handleDeleteConfig(config.id)}
                        className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                        title="删除"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400 mb-3">
                    <p>接口: {config.endpoint}</p>
                    <p>API Key: {config.apiKey.substring(0, 10)}...</p>
                  </div>

                  <button
                    onClick={() => handleApplyConfig(config.id)}
                    className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500 transition"
                  >
                    应用此配置
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 当前状态信息 */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">当前配置</h3>
            <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
              <p>API Key: {apiKey ? `${apiKey.substring(0, 10)}...` : '未设置'}</p>
              <p>接口地址: {settings.customEndpoint || 'https://generativelanguage.googleapis.com'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};