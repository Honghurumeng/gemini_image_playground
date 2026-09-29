import React, { useState } from 'react';
import { Scissors, Loader2 } from 'lucide-react';
import { isBackgroundRemovalSupported } from '../utils/backgroundRemoval';
import { useUiStore } from '../store/useUiStore';

interface Props {
  base64Data: string;
  mimeType: string;
  /** 用于历史记录的提示词 */
  prompt?: string;
  modelName?: string;
  /** icon: 小图标按钮（聊天图片右上角）；button: 整宽大按钮（历史面板） */
  variant?: 'icon' | 'button';
  className?: string;
  /** 是否可见（hover 时才显示，icon 模式用） */
  visible?: boolean;
  onDone?: (result: { base64Data: string; mimeType: string }) => void;
}

const CutoutEditorLazy = React.lazy(() =>
  import('./CutoutEditor').then((m) => ({ default: m.CutoutEditor }))
);

/**
 * 抠图按钮（无 tooltip）：点击 -> 放大编辑器 -> 大图上框选 -> 抠图 -> 结果。
 */
export const RemoveBackgroundButton: React.FC<Props> = ({
  base64Data,
  mimeType,
  prompt,
  modelName,
  variant = 'icon',
  className = '',
  visible,
  onDone,
}) => {
  const [editorOpen, setEditorOpen] = useState(false);
  const { addToast } = useUiStore();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!base64Data) {
      addToast('找不到图片数据', 'error');
      return;
    }
    if (!isBackgroundRemovalSupported()) {
      addToast('当前浏览器不支持本地抠图（需要 WebAssembly）', 'error');
      return;
    }
    setEditorOpen(true);
  };

  return (
    <>
      {variant === 'button' ? (
        <button
          onClick={handleClick}
          className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition bg-purple-600 hover:bg-purple-500 text-white ${className}`}
        >
          <Scissors className="h-4 w-4" />
          <span>抠图 · 可框选</span>
        </button>
      ) : (
        <button
          onClick={handleClick}
          className={`p-2.5 rounded-lg bg-black/60 hover:bg-black/80 text-white shadow-lg backdrop-blur-sm transition-all ${visible ? 'opacity-100' : 'opacity-0'} ${className}`}
        >
          <Scissors className="h-5 w-5" />
        </button>
      )}

      {editorOpen && (
        <React.Suspense fallback={null}>
          <CutoutEditorLazy
            base64Data={base64Data}
            mimeType={mimeType}
            prompt={prompt}
            modelName={modelName}
            onClose={() => setEditorOpen(false)}
            onDone={onDone}
          />
        </React.Suspense>
      )}
    </>
  );
};
