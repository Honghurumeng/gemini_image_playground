import React, { useState } from 'react';
import { Scissors, Loader2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useUiStore } from '../store/useUiStore';
import { downloadImage } from '../utils/imageUtils';
import { removeImageBackground, isBackgroundRemovalSupported } from '../utils/backgroundRemoval';

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

/**
 * 一键抠图按钮：本地 AI 去背景 → 透明 PNG → 存历史 + 自动下载
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
  const [removing, setRemoving] = useState(false);
  const [progressText, setProgressText] = useState('');
  const { addImageToHistory } = useAppStore();
  const { addToast } = useUiStore();

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (removing) return;
    if (!base64Data) {
      addToast('找不到图片数据', 'error');
      return;
    }
    if (!isBackgroundRemovalSupported()) {
      addToast('当前浏览器不支持本地抠图（需要 WebAssembly）', 'error');
      return;
    }

    setRemoving(true);
    setProgressText('正在加载抠图模型…');
    try {
      const result = await removeImageBackground(base64Data, mimeType, (_p, stage) => {
        setProgressText(stage);
      });

      const id = `cutout-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      await addImageToHistory({
        id,
        mimeType: result.mimeType,
        base64Data: result.base64Data,
        prompt: prompt ? `${prompt}（透明背景）` : '抠图（透明背景）',
        timestamp: Date.now(),
        modelName: modelName || '本地抠图',
      });

      downloadImage(result.mimeType, result.base64Data, `cutout-transparent-${Date.now()}.png`);
      addToast('抠图完成：透明背景图已保存到历史并下载', 'success');
      onDone?.(result);
    } catch (err: any) {
      console.error('抠图失败', err);
      const msg = err?.message ? String(err.message) : '';
      if (/fetch|network|Failed to fetch|Load failed/i.test(msg)) {
        addToast('抠图模型下载失败，请检查网络后重试', 'error');
      } else {
        addToast(`抠图失败：${msg || '未知错误'}`, 'error');
      }
    } finally {
      setRemoving(false);
      setProgressText('');
    }
  };

  if (variant === 'button') {
    return (
      <button
        onClick={handleClick}
        disabled={removing}
        title="本地 AI 抠图，去掉背景变成透明底 PNG"
        className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition disabled:opacity-60 disabled:cursor-wait bg-purple-600 hover:bg-purple-500 text-white ${className}`}
      >
        {removing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scissors className="h-4 w-4" />}
        <span>{removing ? progressText || '抠图中…' : '一键抠图 · 透明背景'}</span>
      </button>
    );
  }

  // icon 模式：聊天图片右上角小按钮
  const opacity = visible || removing ? 'opacity-100' : 'opacity-0';
  return (
    <button
      onClick={handleClick}
      disabled={removing}
      title={removing ? progressText || '抠图中…' : '一键抠图：去掉背景，变成透明底'}
      className={`p-2.5 rounded-lg bg-black/60 hover:bg-black/80 text-white shadow-lg backdrop-blur-sm transition-all disabled:cursor-wait ${opacity} ${className}`}
    >
      {removing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Scissors className="h-5 w-5" />}
    </button>
  );
};
