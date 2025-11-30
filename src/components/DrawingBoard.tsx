import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, Download } from 'lucide-react';
import { Excalidraw, exportToBlob } from '@excalidraw/excalidraw';
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import '@excalidraw/excalidraw/index.css';

interface DrawingBoardProps {
  isOpen: boolean;
  onClose: () => void;
  onImageComplete: (base64: string) => void;
}

export const DrawingBoard: React.FC<DrawingBoardProps> = ({
  isOpen,
  onClose,
  onImageComplete,
}) => {
  const excalidrawRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [hasDrawing, setHasDrawing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Track app theme by observing the root element's class list
  useEffect(() => {
    if (!isOpen) return;

    const root = document.documentElement;

    const updateTheme = () => {
      setTheme(root.classList.contains('dark') ? 'dark' : 'light');
    };

    updateTheme();

    const observer = new MutationObserver(updateTheme);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, [isOpen]);

  const handleChange = useCallback(
    (elements: readonly any[]) => {
      // Consider canvas "non-empty" only if there's at least one non-deleted element
      const hasNonDeleted = elements.some((el) => !(el as any).isDeleted);
      setHasDrawing(hasNonDeleted);
    },
    [],
  );

  const handleSave = useCallback(async () => {
    if (!excalidrawRef.current || isExporting) return;

    const api = excalidrawRef.current;
    const elements = api.getSceneElements();

    if (!elements || elements.length === 0) {
      return;
    }

    const appState = api.getAppState();
    const files = api.getFiles();

    try {
      setIsExporting(true);

      const blob = await exportToBlob({
        elements,
        appState: { ...appState, exportBackground: true },
        files,
        mimeType: 'image/png',
        quality: 1,
      });

      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string | null;
        if (dataUrl) {
          onImageComplete(dataUrl);
        }
        setIsExporting(false);
        onClose();
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error('Failed to export Excalidraw scene', error);
      setIsExporting(false);
    }
  }, [isExporting, onClose, onImageComplete]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50">
      <div className="w-full h-full bg-white dark:bg-gray-800 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            画板（Excalidraw）
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={!hasDrawing || isExporting}
              className="px-3 py-1.5 rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              {isExporting ? '导出中...' : '保存为图片'}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
            >
              <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Excalidraw Canvas */}
        <div className="flex-1 min-h-0">
          <div className="w-full h-full">
            <Excalidraw
              theme={theme}
              onChange={handleChange}
              excalidrawAPI={(api) => {
                excalidrawRef.current = api;
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
