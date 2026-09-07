import { Wifi, WifiOff, RefreshCw, Cloud, CloudOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSyncState, subscribeSyncState, retryFailedSync, type SyncState } from '@/lib/sync';
import { useState, useEffect } from 'react';

export function SyncStatusIndicator() {
  const [state, setState] = useState<SyncState>(getSyncState());

  useEffect(() => {
    return subscribeSyncState(setState);
  }, []);

  return (
    <div className="flex items-center gap-2 text-xs text-gallery-500">
      {state.isOnline ? (
        <Wifi className="h-3.5 w-3.5 text-emerald-400" />
      ) : (
        <WifiOff className="h-3.5 w-3.5 text-gallery-600" />
      )}
      {state.isSyncing && <RefreshCw className="h-3.5 w-3.5 animate-spin text-amber-400" />}
      {state.pendingCount > 0 && (
        <span>{state.pendingCount} 项待同步</span>
      )}
      {state.lastErrorMessage && (
        <button
          onClick={() => retryFailedSync()}
          className="text-red-400 hover:text-red-300"
        >
          重试
        </button>
      )}
    </div>
  );
}

export function SyncBadge({ status }: { status: string }) {
  const config: Record<string, { icon: typeof Cloud; color: string; label: string }> = {
    local_only: { icon: CloudOff, color: 'text-gallery-500', label: '仅本机' },
    syncing: { icon: RefreshCw, color: 'text-amber-400', label: '同步中' },
    synced: { icon: Cloud, color: 'text-emerald-400', label: '已同步' },
    sync_failed: { icon: CloudOff, color: 'text-red-400', label: '同步失败' },
    conflict: { icon: RefreshCw, color: 'text-orange-400', label: '冲突' },
  };

  const { icon: Icon, color, label } = config[status] ?? config['local_only'];

  return (
    <span className={cn('inline-flex items-center gap-1 text-xs', color)}>
      <Icon className={cn('h-3 w-3', status === 'syncing' && 'animate-spin')} />
      {label}
    </span>
  );
}
