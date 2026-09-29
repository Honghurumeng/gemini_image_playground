import React, { useState, useRef } from 'react';
import { X, Scissors, Download, Loader2, ImageIcon, BoxSelect, Eraser, ArrowLeft } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useUiStore } from '../store/useUiStore';
import { downloadImage } from '../utils/imageUtils';
import { removeImageBackground, cropImageRegion, isBackgroundRemovalSupported, type CropRectNorm } from '../utils/backgroundRemoval';

interface Props {
  base64Data: string;
  mimeType: string;
  fileName?: string;
  prompt?: string;
  modelName?: string;
  onClose: () => void;
  onDone?: (result: { base64Data: string; mimeType: string }) => void;
}

const CHECKERBOARD_STYLE: React.CSSProperties = {
  backgroundImage: 'repeating-conic-gradient(#d1d5db 0% 25%, #ffffff 0% 50%)',
  backgroundSize: '20px 20px',
};

const toPercentStyle = (r: CropRectNorm): React.CSSProperties => ({
  left: `${r.x * 100}%`,
  top: `${r.y * 100}%`,
  width: `${r.w * 100}%`,
  height: `${r.h * 100}%`,
});

/**
 * 放大抠图编辑器：大图上框选 -> 抠图 -> 结果（无任何 title tooltip）。
 * 给聊天图 / 历史图的抠图按钮使用。
 */
export const CutoutEditor: React.FC<Props> = ({
  base64Data,
  mimeType,
  fileName,
  prompt,
  modelName,
  onClose,
  onDone,
}) => {
  const { addImageToHistory } = useAppStore();
  const { addToast } = useUiStore();
  const [selection, setSelection] = useState<CropRectNorm | null>(null);
  const [draft, setDraft] = useState<CropRectNorm | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [resultBase64, setResultBase64] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');
  const dragStartRef = useRef<{ sx: number; sy: number } | null>(null);
  const selectBoxRef = useRef<HTMLDivElement>(null);

  const posFromEvent = (e: any): { nx: number; ny: number } => {
    const el = selectBoxRef.current;
    if (!el) return { nx: 0, ny: 0 };
    const rect = el.getBoundingClientRect();
    const nx = rect.width > 0 ? (e.clientX - rect.left) / rect.width : 0;
    const ny = rect.height > 0 ? (e.clientY - rect.top) / rect.height : 0;
    return { nx: Math.min(1, Math.max(0, nx)), ny: Math.min(1, Math.max(0, ny)) };
  };

  const handleSelectStart = (e: any) => {
    if (isRemoving || resultBase64) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    const { nx, ny } = posFromEvent(e);
    dragStartRef.current = { sx: nx, sy: ny };
    setDraft({ x: nx, y: ny, w: 0, h: 0 });
  };

  const handleSelectMove = (e: any) => {
    const s = dragStartRef.current;
    if (!s) return;
    e.preventDefault();
    const { nx, ny } = posFromEvent(e);
    setDraft({
      x: Math.min(s.sx, nx),
      y: Math.min(s.sy, ny),
      w: Math.abs(nx - s.sx),
      h: Math.abs(ny - s.sy),
    });
  };

  const handleSelectEnd = (e: any) => {
    const s = dragStartRef.current;
    if (!s) return;
    const { nx, ny } = posFromEvent(e);
    const rect: CropRectNorm = {
      x: Math.min(s.sx, nx),
      y: Math.min(s.sy, ny),
      w: Math.abs(nx - s.sx),
      h: Math.abs(ny - s.sy),
    };
    dragStartRef.current = null;
    setDraft(null);
    if (rect.w < 0.01 || rect.h < 0.01) return;
    setSelection(rect);
  };

  const selectionPixelText =
    selection && naturalSize
      ? `${Math.round(selection.w * naturalSize.w)}×${Math.round(selection.h * naturalSize.h)}px`
      : selection
        ? `${Math.round(selection.w * 100)}% × ${Math.round(selection.h * 100)}%`
        : '';

  const handleRemove = async () => {
    if (isRemoving) return;
    if (!isBackgroundRemovalSupported()) {
      addToast('当前浏览器不支持本地抠图（需要 WebAssembly）', 'error');
      return;
    }
    setIsRemoving(true);
    setProgress(0.02);
    setStage(selection ? '正在裁剪选中区域…' : '正在加载抠图模型…');
    try {
      let inputBase64 = base64Data;
      let inputMime = mimeType;
      let cropped = false;
      if (selection) {
        const cut = await cropImageRegion(base64Data, mimeType, selection);
        inputBase64 = cut.base64Data;
        inputMime = cut.mimeType;
        cropped = true;
      }
      const result = await removeImageBackground(inputBase64, inputMime, (p, s) => {
        setProgress(p);
        setStage(s);
      });
      setResultBase64(result.base64Data);
      await addImageToHistory({
        id: `cutout-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        mimeType: result.mimeType,
        base64Data: result.base64Data,
        prompt: cropped
          ? `${prompt || fileName || '图片'}（局部抠图 ${selectionPixelText}）`
          : `${prompt || fileName || '图片'}（透明背景）`,
        timestamp: Date.now(),
        modelName: modelName || '本地抠图',
      });
      addToast(cropped ? '选中区域抠图完成，已保存到图片历史' : '抠图完成，已保存到图片历史', 'success');
      onDone?.(result);
    } catch (err: any) {
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

  const activeRect = draft || selection;

  return (
    <>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[70]" onClick={() => !isRemoving && onClose()} />
      <div className="fixed inset-0 z-[71] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-white dark:bg-gray-950 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <Scissors className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                  {resultBase64 ? '抠图结果' : '框选抠图'}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {resultBase64
                    ? '左侧原图，右侧透明结果'
                    : '在大图上拖拽框选，只抠选中区域；不框选则抠整图'}
                </p>
              </div>
            </div>
            <button
              onClick={() => !isRemoving && onClose()}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-5 flex flex-col gap-4">
            {!resultBase64 ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate">
                    {fileName || '原图'}
                    {selectionPixelText ? ` · 已框选 ${selectionPixelText}` : ''}
                  </p>
                  {selection && (
                    <button
                      onClick={() => !isRemoving && setSelection(null)}
                      disabled={isRemoving}
                      className="shrink-0 flex items-center gap-1 text-[11px] px-2 py-1 rounded-md bg-purple-50 hover:bg-purple-100 text-purple-600 dark:bg-purple-500/10 dark:hover:bg-purple-500/20 dark:text-purple-300 transition disabled:opacity-50"
                    >
                      <Eraser className="h-3 w-3" />
                      清除框选
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-3 min-h-[300px]">
                  <div className="relative inline-block max-w-full">
                    <img
                      src={`data:${mimeType};base64,${base64Data}`}
                      alt="待抠图大图"
                      draggable={false}
                      onLoad={(e) => {
                        const img = e.currentTarget;
                        if (img.naturalWidth && img.naturalHeight) {
                          setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
                        }
                      }}
                      className="block max-w-full max-h-[62vh] w-auto object-contain rounded-lg select-none"
                    />
                    <div
                      ref={selectBoxRef}
                      onPointerDown={handleSelectStart}
                      onPointerMove={handleSelectMove}
                      onPointerUp={handleSelectEnd}
                      onPointerCancel={() => { dragStartRef.current = null; setDraft(null); }}
                      className="absolute inset-0 rounded-lg cursor-crosshair touch-none select-none"
                    >
                      {activeRect && (
                        <>
                          <div className="absolute inset-x-0 top-0 bg-black/40 pointer-events-none" style={{ height: `${activeRect.y * 100}%` }} />
                          <div className="absolute inset-x-0 bottom-0 bg-black/40 pointer-events-none" style={{ top: `${(activeRect.y + activeRect.h) * 100}%` }} />
                          <div className="absolute bg-black/40 pointer-events-none" style={{ left: 0, width: `${activeRect.x * 100}%`, top: `${activeRect.y * 100}%`, height: `${activeRect.h * 100}%` }} />
                          <div className="absolute bg-black/40 pointer-events-none" style={{ left: `${(activeRect.x + activeRect.w) * 100}%`, right: 0, top: `${activeRect.y * 100}%`, height: `${activeRect.h * 100}%` }} />
                          <div
                            className={`absolute rounded-[2px] pointer-events-none border-2 ${draft ? 'border-purple-400 bg-purple-400/10' : 'border-purple-500 bg-transparent'} shadow-[0_0_0_1px_rgba(255,255,255,0.65)]`}
                            style={toPercentStyle(activeRect)}
                          >
                            <span className="absolute -left-1 -top-1 h-2 w-2 rounded-sm bg-purple-500 border border-white" />
                            <span className="absolute -right-1 -top-1 h-2 w-2 rounded-sm bg-purple-500 border border-white" />
                            <span className="absolute -left-1 -bottom-1 h-2 w-2 rounded-sm bg-purple-500 border border-white" />
                            <span className="absolute -right-1 -bottom-1 h-2 w-2 rounded-sm bg-purple-500 border border-white" />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-1.5 text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
                  <BoxSelect className="h-3.5 w-3.5 mt-[1px] shrink-0 text-purple-500" />
                  {selection ? (
                    <span>
                      已框选 <span className="font-mono font-medium text-purple-600 dark:text-purple-300">{selectionPixelText}</span>，只抠该区域；拖拽可重新框选。
                    </span>
                  ) : (
                    <span>可选：在大图上按住拖拽框选目标，只抠选中区域；<span className="font-medium">不框选则抠整图</span>。</span>
                  )}
                </div>

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

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => !isRemoving && onClose()}
                    disabled={isRemoving}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition disabled:opacity-50 bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-white/10 dark:hover:bg-white/20 dark:text-gray-200"
                  >
                    <span>取消</span>
                  </button>
                  <button
                    onClick={handleRemove}
                    disabled={isRemoving}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition disabled:opacity-60 disabled:cursor-wait bg-purple-600 hover:bg-purple-500 text-white"
                  >
                    {isRemoving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scissors className="h-4 w-4" />}
                    <span>{isRemoving ? (stage || '抠图中…') : selection ? '抠选中区域' : '抠整图'}</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">原图{selection ? ' · 选中区域' : ' · 整图'}</p>
                    <div className="flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-2 min-h-[160px]">
                      <img
                        src={`data:${mimeType};base64,${base64Data}`}
                        alt="原图"
                        className="max-w-full max-h-64 object-contain rounded-lg"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">透明结果</p>
                    <div
                      className="flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700 p-2 min-h-[160px]"
                      style={CHECKERBOARD_STYLE}
                    >
                      <img
                        src={`data:image/png;base64,${resultBase64}`}
                        alt="抠图结果"
                        className="max-w-full max-h-64 object-contain rounded-lg"
                      />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <button
                    onClick={() => !isRemoving && setResultBase64(null)}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-white/10 dark:hover:bg-white/20 dark:text-gray-200"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>返回重框</span>
                  </button>
                  <button
                    onClick={handleRemove}
                    disabled={isRemoving}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition disabled:opacity-60 bg-purple-600 hover:bg-purple-500 text-white"
                  >
                    {isRemoving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scissors className="h-4 w-4" />}
                    <span>重新抠图</span>
                  </button>
                  <button
                    onClick={handleDownload}
                    className="col-span-2 sm:col-span-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition bg-blue-600 hover:bg-blue-500 text-white"
                  >
                    <Download className="h-4 w-4" />
                    <span>下载透明 PNG</span>
                  </button>
                </div>
                <button
                  onClick={onClose}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-100"
                >
                  <span>完成</span>
                </button>
              </>
            )}

            {!resultBase64 && (
              <p className="text-[11px] leading-relaxed text-gray-400 dark:text-gray-500">
                纯本地运行，图片不会上传到服务器；首次抠图需下载约 40MB 模型（之后浏览器缓存）。结果会自动保存到「图片历史」。
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default CutoutEditor;
