import { create } from 'zustand';

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

interface UiState {
  toasts: Toast[];
  dialog: DialogOptions | null;
  isPromptLibraryOpen: boolean;

  addToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
  showDialog: (options: DialogOptions) => void;
  closeDialog: () => void;
  togglePromptLibrary: () => void;
  closePromptLibrary: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  toasts: [],
  dialog: null,
  isPromptLibraryOpen: false,

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
}));
