import React, { useState } from 'react';
import { useUiStore } from '../store/useUiStore';
import { useAppStore } from '../store/useAppStore';
import { X, Palette, User, FileText, Plus, Trash2, History, Clock, ChevronDown, ChevronUp, Edit, Save, XCircle, Settings, RotateCcw } from 'lucide-react';

export const StylePanel: React.FC = () => {
  const {
    isStylePanelOpen,
    styleSettings,
    promptHistory,
    toggleStylePanel,
    closeStylePanel,
    updateStyleSettings,
    toggleCharacter,
    addCharacter,
    deleteCharacter,
    updateCharacter,
    addPromptHistory,
    deletePromptHistory,
    applyPromptHistory,
    addToast
  } = useUiStore();

  const { inputText, setInputText } = useAppStore();
  const [showHistory, setShowHistory] = useState(false);
  const [newCharacterName, setNewCharacterName] = useState('');
  const [newCharacterDescription, setNewCharacterDescription] = useState('');
  const [editingCharacterId, setEditingCharacterId] = useState<string | null>(null);
  const [editCharacterName, setEditCharacterName] = useState('');
  const [editCharacterDescription, setEditCharacterDescription] = useState('');

  const handleApply = () => {
    const enabledCharacters = styleSettings.characters
      .filter(char => char.enabled)
      .map(char => char.description ? `${char.name}: ${char.description}` : char.name);

    let prompt = '';

    if (styleSettings.artStyle) {
      prompt += `画风: ${styleSettings.artStyle}\n`;
    }

    if (enabledCharacters.length > 0) {
      prompt += `角色: ${enabledCharacters.join(', ')}\n`;
    }

    if (styleSettings.contentDescription) {
      prompt += `画面内容: ${styleSettings.contentDescription}`;
    }

    const finalPrompt = prompt.trim();
    setInputText(inputText ? `${inputText}\n\n${finalPrompt}` : finalPrompt);

    // 添加到历史记录
    addPromptHistory({
      prompt: finalPrompt,
      artStyle: styleSettings.artStyle,
      characters: styleSettings.characters.filter(char => char.enabled), // 保存完整的角色信息
      contentDescription: styleSettings.contentDescription
    });

    addToast('风格设置已应用到提示词', 'success');
    closeStylePanel();
  };

  const handleApplyHistory = (id: string) => {
    const success = applyPromptHistory(id);
    if (success) {
      addToast('已应用历史设置到风格保持面板', 'success');
    } else {
      addToast('应用历史设置失败', 'error');
    }
  };

  const handleAddCharacter = () => {
    if (!newCharacterName.trim()) {
      addToast('请输入角色名称', 'error');
      return;
    }

    addCharacter({
      name: newCharacterName.trim(),
      description: newCharacterDescription.trim()
    });

    setNewCharacterName('');
    setNewCharacterDescription('');
    addToast('角色添加成功', 'success');
  };

  const handleEditCharacter = (characterId: string) => {
    const character = styleSettings.characters.find(char => char.id === characterId);
    if (character) {
      setEditingCharacterId(characterId);
      setEditCharacterName(character.name);
      setEditCharacterDescription(character.description);
    }
  };

  const handleSaveCharacterEdit = () => {
    if (!editCharacterName.trim()) {
      addToast('角色名称不能为空', 'error');
      return;
    }

    updateCharacter(editingCharacterId!, {
      name: editCharacterName.trim(),
      description: editCharacterDescription.trim()
    });

    setEditingCharacterId(null);
    setEditCharacterName('');
    setEditCharacterDescription('');
    addToast('角色更新成功', 'success');
  };

  const handleCancelCharacterEdit = () => {
    setEditingCharacterId(null);
    setEditCharacterName('');
    setEditCharacterDescription('');
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <>
      {/* Backdrop */}
      {isStylePanelOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={closeStylePanel}
        />
      )}

      {/* Style Panel */}
      <div className={`
        fixed inset-y-0 right-0 w-full sm:w-96 bg-white dark:bg-gray-950 shadow-2xl z-50
        transform transition-transform duration-300 ease-in-out
        ${isStylePanelOpen ? 'translate-x-0' : 'translate-x-full'}
        border-l border-gray-200 dark:border-gray-800 flex flex-col
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Palette className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                风格保持
              </h2>
            </div>
            <button
              onClick={closeStylePanel}
              className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Art Style */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                <Palette className="w-4 h-4" />
                画风
              </label>
              <div className="relative">
                <textarea
                  value={styleSettings.artStyle}
                  onChange={(e) => updateStyleSettings({ artStyle: e.target.value })}
                  placeholder="请输入画风，如：写实风格、动漫风格、水彩风格等"
                  rows={4}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg
                           bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400
                           focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                />
                {styleSettings.artStyle && (
                  <button
                    onClick={() => updateStyleSettings({ artStyle: '' })}
                    className="absolute right-2 top-2 p-1
                             text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300
                             transition-colors"
                    title="清空"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Characters */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                <User className="w-4 h-4" />
                角色
              </label>

              {/* Existing Characters */}
              <div className="space-y-2 mb-4">
                {styleSettings.characters.map(character => (
                  <div
                    key={character.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-3"
                  >
                    {editingCharacterId === character.id ? (
                      // Edit Mode
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={editCharacterName}
                          onChange={(e) => setEditCharacterName(e.target.value)}
                          placeholder="角色名称"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                   bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400
                                   focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                        />
                        <input
                          type="text"
                          value={editCharacterDescription}
                          onChange={(e) => setEditCharacterDescription(e.target.value)}
                          placeholder="角色描述"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                   bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400
                                   focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleSaveCharacterEdit}
                            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
                          >
                            <Save className="w-3 h-3" />
                            保存
                          </button>
                          <button
                            onClick={handleCancelCharacterEdit}
                            className="flex items-center gap-1 px-3 py-1.5 bg-gray-500 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
                          >
                            <XCircle className="w-3 h-3" />
                            取消
                          </button>
                        </div>
                      </div>
                    ) : (
                      // View Mode
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <input
                            type="checkbox"
                            checked={character.enabled}
                            onChange={() => toggleCharacter(character.id)}
                            className="mt-0.5 w-4 h-4 text-purple-600 border-gray-300 dark:border-gray-600
                                   rounded focus:ring-purple-500 focus:ring-2"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 dark:text-white">
                              {character.name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              {character.description}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEditCharacter(character.id)}
                            className="p-1.5 text-gray-500 hover:text-blue-600 dark:text-gray-400
                                   dark:hover:text-blue-400 transition-colors"
                            title="编辑"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteCharacter(character.id)}
                            className="p-1.5 text-gray-500 hover:text-red-600 dark:text-gray-400
                                   dark:hover:text-red-400 transition-colors"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Add New Character */}
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-3">
                <div className="space-y-3">
                  <input
                    type="text"
                    value={newCharacterName}
                    onChange={(e) => setNewCharacterName(e.target.value)}
                    placeholder="新角色名称"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                             bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400
                             focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  />
                  <input
                    type="text"
                    value={newCharacterDescription}
                    onChange={(e) => setNewCharacterDescription(e.target.value)}
                    placeholder="新角色描述"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                             bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400
                             focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  />
                  <button
                    onClick={handleAddCharacter}
                    className="flex items-center gap-2 w-full px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    添加角色
                  </button>
                </div>
              </div>
            </div>

            {/* Content Description */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                <FileText className="w-4 h-4" />
                画面内容
              </label>
              <div className="relative">
                <textarea
                  value={styleSettings.contentDescription}
                  onChange={(e) => updateStyleSettings({ contentDescription: e.target.value })}
                  placeholder="描述你想要的画面内容、场景、元素等..."
                  rows={4}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg
                           bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400
                           focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                />
                {styleSettings.contentDescription && (
                  <button
                    onClick={() => updateStyleSettings({ contentDescription: '' })}
                    className="absolute right-2 top-2 p-1
                             text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300
                             transition-colors"
                    title="清空"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Prompt History */}
            <div>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center justify-between w-full text-sm font-medium
                         text-gray-700 dark:text-gray-300 mb-3 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4" />
                  提示词历史
                </div>
                {showHistory ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {showHistory && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {promptHistory.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                      暂无历史记录
                    </div>
                  ) : (
                    promptHistory.map(history => (
                      <div
                        key={history.id}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-3
                               hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <Clock className="w-3 h-3 text-gray-400" />
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {formatTimestamp(history.timestamp)}
                              </span>
                            </div>
                            <div className="text-sm text-gray-900 dark:text-white mb-1">
                              {truncateText(history.prompt, 60)}
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {history.artStyle && (
                                <span className="inline-block px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900/30
                                             text-purple-700 dark:text-purple-300 rounded">
                                  {history.artStyle}
                                </span>
                              )}
                              {history.characters.map(char => (
                                <span key={char.id} className="inline-block px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30
                                               text-blue-700 dark:text-blue-300 rounded">
                                  {char.name}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleApplyHistory(history.id)}
                              className="p-1.5 text-gray-500 hover:text-blue-600 dark:text-gray-400
                                     dark:hover:text-blue-400 transition-colors"
                              title="应用到风格保持面板"
                            >
                              <Settings className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deletePromptHistory(history.id)}
                              className="p-1.5 text-gray-500 hover:text-red-600 dark:text-gray-400
                                     dark:hover:text-red-400 transition-colors"
                              title="删除"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-800">
            <button
              onClick={handleApply}
              className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white
                       font-medium rounded-lg transition-colors focus:outline-none
                       focus:ring-2 focus:ring-purple-500 focus:ring-offset-2
                       dark:focus:ring-offset-gray-950"
            >
              应用到提示词
            </button>
          </div>
        </div>
      </div>
    </>
  );
};