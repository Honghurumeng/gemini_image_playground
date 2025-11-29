import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { get as getVal, set as setVal } from 'idb-keyval';

// 复用 App Store 的 IndexedDB 存储配置
const storage = {
  getItem: async (name: string): Promise<string | null> => {
    return await getVal(name) || null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await setVal(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    // 这里可以实现删除逻辑，但为了简单起见，我们暂时不实现
  },
};

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

export interface DialogOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  type?: 'confirm' | 'alert';
}

export interface StyleCharacter {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

export interface StyleSettings {
  artStyle: string;
  characters: StyleCharacter[];
  contentDescription: string;
}

export interface PromptHistory {
  id: string;
  prompt: string;
  timestamp: number;
  artStyle: string;
  characters: StyleCharacter[]; // 保存完整的角色信息
  contentDescription: string;
}

interface UiState {
  toasts: Toast[];
  dialog: DialogOptions | null;
  isPromptLibraryOpen: boolean;
  isStylePanelOpen: boolean;
  styleSettings: StyleSettings;
  promptHistory: PromptHistory[];

  addToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
  showDialog: (options: DialogOptions) => void;
  closeDialog: () => void;
  togglePromptLibrary: () => void;
  closePromptLibrary: () => void;
  toggleStylePanel: () => void;
  closeStylePanel: () => void;
  updateStyleSettings: (settings: Partial<StyleSettings>) => void;
  toggleCharacter: (id: string) => void;
  addCharacter: (character: Omit<StyleCharacter, 'id' | 'enabled'>) => void;
  deleteCharacter: (id: string) => void;
  updateCharacter: (id: string, updates: Partial<StyleCharacter>) => void;
  addPromptHistory: (history: Omit<PromptHistory, 'id' | 'timestamp'>) => void;
  deletePromptHistory: (id: string) => void;
  applyPromptHistory: (id: string) => boolean;
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
  toasts: [],
  dialog: null,
  isPromptLibraryOpen: false,
  isStylePanelOpen: false,
  styleSettings: {
    artStyle: '',
    characters: [],
    contentDescription: ''
  },
  promptHistory: [],

  addToast: (message, type = 'info') => {
    const id = Date.now().toString();
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }]
    }));

    // Auto remove after 3 seconds
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id)
      }));
    }, 3000);
  },

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id)
    })),

  showDialog: (options) => set({ dialog: options }),

  closeDialog: () => set({ dialog: null }),

  togglePromptLibrary: () =>
    set((state) => ({ isPromptLibraryOpen: !state.isPromptLibraryOpen })),

  closePromptLibrary: () => set({ isPromptLibraryOpen: false }),

  toggleStylePanel: () =>
    set((state) => ({ isStylePanelOpen: !state.isStylePanelOpen })),

  closeStylePanel: () => set({ isStylePanelOpen: false }),

  updateStyleSettings: (newSettings) =>
    set((state) => ({
      styleSettings: { ...state.styleSettings, ...newSettings }
    })),

  toggleCharacter: (id) =>
    set((state) => ({
      styleSettings: {
        ...state.styleSettings,
        characters: state.styleSettings.characters.map(char =>
          char.id === id ? { ...char, enabled: !char.enabled } : char
        )
      }
    })),

  addCharacter: (character) =>
    set((state) => ({
      styleSettings: {
        ...state.styleSettings,
        characters: [
          ...state.styleSettings.characters,
          {
            ...character,
            id: `character-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            enabled: false
          }
        ]
      }
    })),

  deleteCharacter: (id) =>
    set((state) => ({
      styleSettings: {
        ...state.styleSettings,
        characters: state.styleSettings.characters.filter(char => char.id !== id)
      }
    })),

  updateCharacter: (id, updates) =>
    set((state) => ({
      styleSettings: {
        ...state.styleSettings,
        characters: state.styleSettings.characters.map(char =>
          char.id === id ? { ...char, ...updates } : char
        )
      }
    })),

  addPromptHistory: (history) => {
    const id = Date.now().toString();
    const newHistory = {
      id,
      ...history,
      timestamp: Date.now()
    };

    set((state) => {
      // 最多保留50条历史记录
      const newPromptHistory = [newHistory, ...state.promptHistory].slice(0, 50);
      return { promptHistory: newPromptHistory };
    });
  },

  deletePromptHistory: (id) =>
    set((state) => ({
      promptHistory: state.promptHistory.filter((h) => h.id !== id)
    })),

  applyPromptHistory: (id) => {
    const { promptHistory } = get();
    const history = promptHistory.find(h => h.id === id);

    if (history) {
      // 更新风格保持面板的设置
      set((state) => {
        // 禁用所有现有角色
        const disabledExistingCharacters = state.styleSettings.characters.map(char => ({
          ...char,
          enabled: false
        }));

        // 应用历史记录中的角色
        const historyCharacters = history.characters.map(historicalChar => {
          // 检查现有角色中是否有相同名称的
          const existingChar = disabledExistingCharacters.find(char => char.name === historicalChar.name);

          if (existingChar) {
            // 如果存在，更新其状态和历史信息
            return {
              ...existingChar,
              enabled: true,
              description: historicalChar.description
            };
          } else {
            // 如果不存在，创建新角色
            return {
              ...historicalChar,
              enabled: true,
              id: `character-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            };
          }
        });

        // 合并角色：历史角色 + 未在历史中启用的现有角色
        const mergedCharacters = [...historyCharacters, ...disabledExistingCharacters.filter(
          existingChar => !historyCharacters.some(historyChar => historyChar.name === existingChar.name)
        )];

        return {
          styleSettings: {
            ...state.styleSettings,
            artStyle: history.artStyle,
            characters: mergedCharacters,
            contentDescription: history.contentDescription
          }
        };
      });

      return true; // 返回成功状态
    }
    return false; // 返回失败状态
  },
  }),
  {
    name: 'ui-storage',
    storage: createJSONStorage(() => storage),
    partialize: (state) => ({
      // 只持久化需要保存的字段
      styleSettings: state.styleSettings,
      promptHistory: state.promptHistory,
    }),
  }
));
