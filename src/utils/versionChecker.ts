interface VersionInfo {
  version: string;
  buildTime: string;
  buildNumber: number;
}

interface UpdateCheckerOptions {
  checkInterval?: number; // 检查间隔（毫秒）
  showToast?: boolean; // 是否显示更新提示
  autoRefresh?: boolean; // 是否自动刷新
}

class VersionChecker {
  private currentVersion: string | null = null;
  private checkInterval: number;
  private showToast: boolean;
  private autoRefresh: boolean;
  private intervalId: NodeJS.Timeout | null = null;
  private hasUpdate = false;

  constructor(options: UpdateCheckerOptions = {}) {
    this.checkInterval = options.checkInterval || 5 * 60 * 1000; // 默认5分钟检查一次
    this.showToast = options.showToast !== false; // 默认显示提示
    this.autoRefresh = options.autoRefresh || false; // 默认不自动刷新
  }

  // 获取当前本地版本（从构建时注入）
  private getCurrentVersion(): string | null {
    if (this.currentVersion) return this.currentVersion;

    // 从 meta 标签或全局变量获取当前版本
    const versionMeta = document.querySelector('meta[name="app-version"]');
    if (versionMeta) {
      this.currentVersion = versionMeta.getAttribute('content');
    }

    return this.currentVersion;
  }

  // 获取服务器版本信息
  private async fetchServerVersion(): Promise<VersionInfo | null> {
    try {
      const response = await fetch('/version.json?' + Date.now(), {
        method: 'GET',
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        }
      });

      if (!response.ok) {
        console.warn('版本检查失败:', response.status);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.warn('获取服务器版本失败:', error);
      return null;
    }
  }

  // 检查是否有更新
  private async checkForUpdate(): Promise<boolean> {
    const currentVersion = this.getCurrentVersion();
    if (!currentVersion) {
      console.warn('无法获取当前版本');
      return false;
    }

    const serverVersion = await this.fetchServerVersion();
    if (!serverVersion) {
      return false;
    }

    const hasUpdate = serverVersion.version !== currentVersion;

    if (hasUpdate && !this.hasUpdate) {
      this.hasUpdate = true;
      console.log(`🆕 发现新版本: ${serverVersion.version} (当前: ${currentVersion})`);
      console.log(`🕐 构建时间: ${serverVersion.buildTime}`);

      if (this.showToast) {
        this.showUpdateNotification(serverVersion);
      }

      if (this.autoRefresh) {
        this.scheduleAutoRefresh();
      }
    }

    return hasUpdate;
  }

  // 显示更新通知
  private showUpdateNotification(serverVersion: VersionInfo): void {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.id = 'update-notification';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 16px 20px;
      border-radius: 12px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.2);
      z-index: 10000;
      max-width: 350px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      animation: slideInRight 0.3s ease-out;
    `;

    notification.innerHTML = `
      <div style="display: flex; align-items: start; gap: 12px;">
        <div style="font-size: 20px;">🆕</div>
        <div style="flex: 1;">
          <div style="font-weight: 600; margin-bottom: 4px;">发现新版本</div>
          <div style="font-size: 12px; opacity: 0.9; margin-bottom: 12px;">
            构建时间: ${new Date(serverVersion.buildTime).toLocaleString('zh-CN')}
          </div>
          <div style="display: flex; gap: 8px;">
            <button id="refresh-btn" style="
              background: white;
              color: #667eea;
              border: none;
              padding: 6px 12px;
              border-radius: 6px;
              font-size: 12px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s;
            ">立即刷新</button>
            <button id="dismiss-btn" style="
              background: transparent;
              color: white;
              border: 1px solid rgba(255,255,255,0.3);
              padding: 6px 12px;
              border-radius: 6px;
              font-size: 12px;
              cursor: pointer;
              transition: all 0.2s;
            ">稍后</button>
          </div>
        </div>
      </div>
    `;

    // 添加样式动画
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideInRight {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      #refresh-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      }
      #dismiss-btn:hover {
        background: rgba(255,255,255,0.1);
      }
    `;
    document.head.appendChild(style);

    // 添加事件监听
    notification.querySelector('#refresh-btn')?.addEventListener('click', () => {
      this.refreshPage();
    });

    notification.querySelector('#dismiss-btn')?.addEventListener('click', () => {
      this.dismissNotification();
    });

    document.body.appendChild(notification);
  }

  // 刷新页面
  private refreshPage(): void {
    console.log('🔄 正在刷新页面以获取最新版本...');
    window.location.reload();
  }

  // 忽略通知
  private dismissNotification(): void {
    const notification = document.getElementById('update-notification');
    if (notification) {
      notification.style.animation = 'slideInRight 0.3s ease-out reverse';
      setTimeout(() => {
        notification.remove();
      }, 300);
    }
  }

  // 计划自动刷新
  private scheduleAutoRefresh(): void {
    console.log('⏰ 10秒后将自动刷新页面...');
    setTimeout(() => {
      this.refreshPage();
    }, 10000);
  }

  // 开始版本检查
  public start(): void {
    if (this.intervalId) {
      console.warn('版本检查已在运行中');
      return;
    }

    console.log('🔍 开始版本检查，间隔:', this.checkInterval / 1000, '秒');

    // 立即检查一次
    this.checkForUpdate();

    // 设置定期检查
    this.intervalId = setInterval(() => {
      this.checkForUpdate();
    }, this.checkInterval);
  }

  // 停止版本检查
  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('⏹️ 版本检查已停止');
    }
  }

  // 手动检查更新
  public async manualCheck(): Promise<boolean> {
    console.log('🔍 手动检查更新...');
    return await this.checkForUpdate();
  }

  // 获取更新状态
  public getHasUpdate(): boolean {
    return this.hasUpdate;
  }
}

export default VersionChecker;
export type { VersionInfo, UpdateCheckerOptions };