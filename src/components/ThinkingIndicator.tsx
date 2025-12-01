import React, { useEffect, useState } from 'react';
import { Sparkles, BrainCircuit, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

interface Props {
    isThinking?: boolean;
    isExiting?: boolean;
}

export const ThinkingIndicator: React.FC<Props> = ({ isThinking = true, isExiting = false }) => {
  const [elapsed, setElapsed] = useState(0);
  const [phase, setPhase] = useState(0);
  const { settings } = useAppStore();
  const theme = settings.theme;
  const [isDark, setIsDark] = useState(true);

  const phases = [
    "思考中...",
    "分析上下文中...",
    "连接思路...",
    "生成回复中...",
    "完善细节..."
  ];

  useEffect(() => {
    // Check Theme
    const checkTheme = () => {
        if (theme === 'system') {
            setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
        } else {
            setIsDark(theme === 'dark');
        }
    };
    checkTheme();

    // Listen for system theme changes if needed
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = (e: MediaQueryListEvent) => {
        if (theme === 'system') setIsDark(e.matches);
    };
    mediaQuery.addEventListener('change', handleSystemChange);

    const timer = setInterval(() => {
      if (isThinking) {
        setElapsed(prev => prev + 0.1);
      }
    }, 100);

    const phaseTimer = setInterval(() => {
      if (isThinking) {
        setPhase(prev => (prev + 1) % phases.length);
      }
    }, 4000);

    return () => {
      clearInterval(timer);
      clearInterval(phaseTimer);
      mediaQuery.removeEventListener('change', handleSystemChange);
    };
  }, [theme, isThinking]);

  return (
    <div className={`flex w-full justify-center py-6 ${isExiting ? 'fade-out-down' : 'fade-in-up'}`}>
      <div className="relative w-full max-w-md group">
        {/* 简单的等待指示器 */}
        <div className={`relative flex items-center justify-center backdrop-blur-sm rounded-lg border transition-all duration-300 ${
            isDark
              ? 'bg-gray-900/80 border-gray-700/50'
              : 'bg-white/80 border-gray-200/50'
        }`}>
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="relative flex items-center justify-center h-6 w-6">
              {isThinking ? (
                <>
                  <div className={`absolute inset-0 rounded-full animate-ping opacity-50 ${isDark ? 'bg-blue-500/20' : 'bg-blue-400/30'}`}></div>
                  <Sparkles className={`h-4 w-4 animate-spin-slow ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
                </>
              ) : (
                <CheckCircle2 className={`h-5 w-5 ${isDark ? 'text-green-400' : 'text-green-500'}`} />
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium transition-all duration-500 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                {isThinking ? phases[phase] : "回复已就绪！"}
              </span>

              <div className={`flex items-center gap-1.5 px-2 py-1 rounded border ${
                  isDark ? 'bg-gray-800/50 border-gray-700/50' : 'bg-gray-100/50 border-gray-200/50'
              }`}>
                  <BrainCircuit className={`h-3 w-3 ${isDark ? 'text-purple-400' : 'text-purple-500'}`} />
                  <span className={`font-mono text-xs tabular-nums ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                     {elapsed.toFixed(1)}s
                  </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
