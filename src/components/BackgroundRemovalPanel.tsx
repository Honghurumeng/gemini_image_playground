import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Upload, Scissors, Download, Trash2, Loader2, ImageIcon } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useUiStore } from '../store/useUiStore';
import { downloadImage } from '../utils/imageUtils';
import { removeImageBackground, isBackgroundRemovalSupported } from '../utils/backgroundRemoval';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface OriginalImage {
  base64Data: string;
  mimeType: string;
  fileName: string;
}

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const CHECKERBOARD_STYLE: React.CSSProperties = {
  backgroundImage: 'repeating-conic-gradient(#d1d5db 0% 25%, #ffffff 0% 50%)',
  backgroundSize: '20px 20px',
};

export const BackgroundRemovalPanel: React.FC<Props> = ({ isOpen, onClose }) => {
  const { addImageToHistory } = useAppStore();
  const { addToast } = useUiStore();
  const [original, setOriginal] = useState<OriginalImage | null>(null);
  const [resultBase64, setResultBase64] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith('image/')) {
      addToast('请选择图片文件（JPG / PNG / WebP）', 'error');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      addToast('图片超过 20MB，请先压缩一下', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64Data = dataUrl.split(',')[1] || '';
      if (!base64Data) {
        addToast('图片读取失败，请换一张试试', 'error');
        return;
      }
      setOriginal({
        base64Data,
        mimeType: file.type || 'image/png',
        fileName: file.name || '本地图片',
      });
      setResultBase64(null);
      setProgress(0);
      setStage('');
    };
    reader.onerror = () => addToast('图片读取失败，请换一张试试', 'error');
    reader.readAsDataURL(file);
  }, [addToast]);

  // 支持粘贴截图直接抠图
  useEffect(() => {
    if (!isOpen) return;
    const handlePaste = (e: ClipboardEvent) => {
      const files = e.clipboardData?.files;
      if (files && files.length > 0 && files[0].type.startsWith('image/')) {
        e.preventDefault();
        handleFiles(files);
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen, handleFiles]);

  // ESC 关闭
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isRemoving) onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, isRemoving, onClose]);

  const handleRemove = async () => {
    if (!original || isRemoving) return;
    if (!isBackgroundRemovalSupported()) {
      addToast('当前浏览器不支持本地抠图（需要 WebAssembly）', 'error');
      return;
    }
    setIsRemoving(true);
    setProgress(0.02);
    setStage('正在加载抠图模型…');
    try {
      const result = await removeImageBackground(original.base64Data, original.mimeType, (p, s) => {
        setProgress(p);
        setStage(s);
      });
      setResultBase64(result.base64Data);
      await addImageToHistory({
        id: `cutout-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        mimeType: result.mimeType,
        base64Data: result.base64Data,
        prompt: `${original.fileName}（透明背景）`,
        timestamp: Date.now(),
        modelName: '本地抠图',
      });
      addToast('抠图完成，已保存到图片历史', 'success');
    } catch (err: any) {
      console.error('抠图失败', err);
      const msg = err?.message ? String(err.message) : '';
      if (/fetch|network|Failed to fetch|Load failed/i.test(msg)) {
        addToast('抠图模型下载失败，请检查网络后重试', 'error');
      } else {
        addToast(`抠图失败：${msg || '未知错误'}`, 'error');
      }
    } finally {
      setIsRemoving(false);
    }
  };

  const handleDownload = () => {
    if (!resultBase64) return;
    downloadImage('image/png', resultBase64, `cutout-transparent-${Date.now()}.png`);
    addToast('透明背景图已下载', 'success');
  };

  const handleReset = () => {
    if (isRemoving) return;
    setOriginal(null);
    setResultBase64(null);
    setProgress(0);
    setStage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => !isRemoving && onClose()} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-950 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <Scissors className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">本地图片抠图</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">上传本地图片，本地 AI 去背景，转透明 PNG</p>
              </div>
            </div>
            <button
              onClick={() => !isRemoving && onClose()}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition"
              title="关闭"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-5 flex flex-col gap-4">
            {!original ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
                className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-12 text-center cursor-pointer transition ${
                  dragOver
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                    : 'border-gray-300 dark:border-gray-700 hover:border-purple-400 hover:bg-gray-50 dark:hover:bg-gray-900'
                }`}
              >
                <Upload className="h-10 w-10 text-gray-400" />
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">点击选择 / 拖拽图片到这里</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">支持 JPG / PNG / WebP（≤20MB），截图粘贴也可以</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const el = e.currentTarget; handleFiles(el.files); el.value = ''; }}
                />
              </div>
            ) : (
              <>
                <div className="grid sm:grid-cols-2 gap-4">
                  {/* 原图 */}
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate" title={original.fileName}>
                      原图 · {original.fileName}
                    </p>
                    <div className="flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-2 min-h-[160px]">
                      <img
                        src={`data:${original.mimeType};base64,${original.base64Data}`}
                        alt="原图"
                        className="max-w-full max-h-64 object-contain rounded-lg"
                      />
                    </div>
                  </div>
                  {/* 结果 */}
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">透明结果</p>
                    <div
                      className="flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700 p-2 min-h-[160px]"
                      style={CHECKERBOARD_STYLE}
                    >
                      {resultBase64 ? (
                        <img
                          src={`data:image/png;base64,${resultBase64}`}
                          alt="抠图结果"
                          className="max-w-full max-h-64 object-contain rounded-lg"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-gray-400 py-10">
                          {isRemoving ? (
                            <>
                              <Loader2 className="h-8 w-8 animate-spin" />
                              <span className="text-xs">{stage || '抠图中…'}</span>
                            </>
                          ) : (
                            <>
                              <ImageIcon className="h-8 w-8 opacity-40" />
                              <span className="text-xs">抠图结果会显示在这里</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 进度条 */}
                {isRemoving && (
                  <div className="flex flex-col gap-1.5">
                    <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-purple-600 transition-all duration-300"
                        style={{ width: `${Math.round(progress * 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{stage || '抠图中…'} {Math.round(progress * 100)}%</p>
                  </div>
                )}

                {/* 操作按钮 */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isRemoving}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition disabled:opacity-50 bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-white/10 dark:hover:bg-white/20 dark:text-gray-200"
                  >
                    <Upload className="h-4 w-4" />
                    <span>换一张</span>
                  </button>
                  <button
                    onClick={handleRemove}
                    disabled={isRemoving}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition disabled:opacity-60 disabled:cursor-wait bg-purple-600 hover:bg-purple-500 text-white"
                  >
                    {isRemoving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scissors className="h-4 w-4" />}
                    <span>{isRemoving ? (stage || '抠图中…') : resultBase64 ? '重新抠图' : '开始抠图'}</span>
                  </button>
                  {resultBase64 ? (
                    <button
                      onClick={handleDownload}
                      disabled={isRemoving}
                      className="col-span-2 sm:col-span-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition disabled:opacity-50 bg-blue-600 hover:bg-blue-500 text-white"
                    >
                      <Download className="h-4 w-4" />
                      <span>下载透明 PNG</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleReset}
                      disabled={isRemoving}
                      className="col-span-2 sm:col-span-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition disabled:opacity-50 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-500/10 dark:hover:bg-red-500/20 dark:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>清空</span>
                    </button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const el = e.currentTarget; handleFiles(el.files); el.value = ''; }}
                />
              </>
            )}

            <p className="text-[11px] leading-relaxed text-gray-400 dark:text-gray-500">
              纯本地运行，图片不会上传到服务器；首次抠图需下载约 40MB 模型（之后浏览器缓存）。结果会自动保存到「图片历史」。
            </p>
          </div>
        </div>
      </div>
    </>
  );
};
