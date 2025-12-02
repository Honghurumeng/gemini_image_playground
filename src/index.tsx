import { render } from 'preact';
import './index.css';
import App from './App';
import VersionChecker from './utils/versionChecker';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

render(<App />, rootElement);

// Remove splash screen with a fade-out effect
const splashScreen = document.getElementById('app-loading');
if (splashScreen) {
  // Wait for the next frame to ensure the app has started rendering
  requestAnimationFrame(() => {
    splashScreen.style.opacity = '0';
    setTimeout(() => {
      splashScreen.remove();
    }, 300); // Match CSS transition duration
  });
}

// 初始化版本检查器
const versionChecker = new VersionChecker({
  checkInterval: 5 * 60 * 1000, // 5分钟检查一次
  showToast: true, // 显示更新提示
  autoRefresh: false // 不自动刷新，让用户选择
});

// 应用启动后开始版本检查
requestAnimationFrame(() => {
  // 延迟启动版本检查，避免影响应用初始化
  setTimeout(() => {
    versionChecker.start();
    console.log('✅ 版本检查器已启动');
  }, 2000);
});

// 页面卸载时清理
window.addEventListener('beforeunload', () => {
  versionChecker.stop();
});

// 暴露到全局，方便调试
(window as any).__versionChecker = versionChecker;
