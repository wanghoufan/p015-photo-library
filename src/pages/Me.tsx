import { useState, useEffect } from 'react';
import { Cloud, CloudOff, Database, Download, Trash2, Smartphone, Shield, Info } from 'lucide-react';
import { useWorkStore } from '@/stores/WorkStore';
import { getSyncState, subscribeSyncState, retryFailedSync, type SyncState } from '@/lib/sync';
import { isSupabaseConfigured } from '@/lib/supabase';
import { formatRelativeTime } from '@/lib/utils';

const APP_VERSION = '0.1.0';

export function Me() {
  const { works, clearDemoData } = useWorkStore();
  const [syncState, setSyncState] = useState<SyncState>(getSyncState());
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    return subscribeSyncState(setSyncState);
  }, []);

  const demoCount = works.filter(w => w.isDemo).length;
  const realCount = works.length - demoCount;
  const supabaseConfigured = isSupabaseConfigured();

  return (
    <div className="mx-auto max-w-lg px-4 py-6 lg:py-8">
      <h1 className="mb-6 text-xl font-medium text-gallery-100">我的</h1>

      <div className="space-y-4">
        {/* Sync Status */}
        <section className="rounded-lg border border-gallery-800 bg-gallery-900/50 p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-gallery-300">
            {syncState.isOnline ? <Cloud className="h-4 w-4 text-emerald-400" /> : <CloudOff className="h-4 w-4 text-gallery-500" />}
            同步状态
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gallery-500">网络</span>
              <span className={syncState.isOnline ? 'text-emerald-400' : 'text-gallery-400'}>
                {syncState.isOnline ? '在线' : '离线'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gallery-500">Supabase</span>
              <span className={supabaseConfigured ? 'text-emerald-400' : 'text-gallery-500'}>
                {supabaseConfigured ? '已配置' : '未配置'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gallery-500">待同步</span>
              <span className="text-gallery-300">{syncState.pendingCount} 项</span>
            </div>
            {syncState.lastSuccessAt && (
              <div className="flex justify-between">
                <span className="text-gallery-500">上次成功</span>
                <span className="text-gallery-400">{formatRelativeTime(syncState.lastSuccessAt)}</span>
              </div>
            )}
            {syncState.lastErrorMessage && (
              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm text-red-400">{syncState.lastErrorMessage}</span>
                <button
                  onClick={() => retryFailedSync()}
                  className="rounded border border-gallery-700 px-2 py-1 text-xs text-gallery-300 hover:bg-gallery-800"
                >
                  重试
                </button>
              </div>
            )}
            {!supabaseConfigured && (
              <p className="mt-2 text-xs text-gallery-600">
                Supabase 未配置。数据仅保存在本地浏览器中。配置环境变量后启用云端同步。
              </p>
            )}
          </div>
        </section>

        {/* Data */}
        <section className="rounded-lg border border-gallery-800 bg-gallery-900/50 p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-gallery-300">
            <Database className="h-4 w-4" />
            数据
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gallery-500">作品总数</span>
              <span className="text-gallery-300">{works.length} 件</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gallery-500">真实作品</span>
              <span className="text-gallery-300">{realCount} 件</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gallery-500">演示数据</span>
              <span className="text-gallery-300">{demoCount} 件</span>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button className="focus-ring flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gallery-700 py-2 text-xs text-gallery-300 hover:bg-gallery-800">
              <Download className="h-3.5 w-3.5" />
              导出数据
            </button>
            {demoCount > 0 && (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="focus-ring flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gallery-700 py-2 text-xs text-gallery-300 hover:bg-gallery-800"
              >
                <Trash2 className="h-3.5 w-3.5" />
                清除演示数据
              </button>
            )}
          </div>
        </section>

        {/* PWA */}
        <section className="rounded-lg border border-gallery-800 bg-gallery-900/50 p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-gallery-300">
            <Smartphone className="h-4 w-4" />
            PWA 安装
          </h2>
          <div className="space-y-1.5 text-xs text-gallery-500">
            <p><strong className="text-gallery-400">iOS Safari：</strong>点击分享按钮 → "添加到主屏幕"</p>
            <p><strong className="text-gallery-400">Android Chrome：</strong>点击菜单 → "安装应用"或"添加到主屏幕"</p>
            <p className="mt-2 text-gallery-600">
              iOS PWA 限制：不支持 Background Sync、Push Notification（有限支持）、Camera API 受限。
            </p>
          </div>
        </section>

        {/* Privacy */}
        <section className="rounded-lg border border-gallery-800 bg-gallery-900/50 p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-gallery-300">
            <Shield className="h-4 w-4" />
            隐私与存储
          </h2>
          <div className="space-y-1.5 text-xs text-gallery-500">
            <p>所有数据首先保存在浏览器 IndexedDB 中，登录 Supabase 后同步到云端。</p>
            <p>照片会在浏览器端压缩后上传展示图和缩略图，原图保留在你的设备上。</p>
            <p>演示数据不会上传到云端。</p>
          </div>
        </section>

        {/* Version */}
        <div className="flex items-center justify-center gap-1.5 py-4 text-xs text-gallery-600">
          <Info className="h-3 w-3" />
          <span>摄影作品库 v{APP_VERSION}</span>
        </div>
      </div>

      {showClearConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80">
          <div className="mx-4 w-full max-w-sm rounded-lg bg-gallery-900 p-6">
            <h3 className="mb-2 text-lg font-medium text-gallery-100">清除演示数据</h3>
            <p className="mb-6 text-sm text-gallery-400">
              将清除 {demoCount} 件演示作品。真实作品不受影响。
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="rounded-lg border border-gallery-700 px-4 py-2 text-sm text-gallery-300 hover:bg-gallery-800"
              >
                取消
              </button>
              <button
                onClick={() => { clearDemoData(); setShowClearConfirm(false); }}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
              >
                清除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
