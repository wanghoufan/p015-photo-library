import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin} 分钟前`;
  if (diffHr < 24) return `${diffHr} 小时前`;
  if (diffDay < 30) return `${diffDay} 天前`;
  return formatDate(dateStr);
}

export function getOrientationLabel(orientation: string): string {
  switch (orientation) {
    case 'landscape': return '横向';
    case 'portrait': return '竖向';
    case 'square': return '方形';
    default: return orientation;
  }
}

export function getSyncStatusLabel(status: string): string {
  switch (status) {
    case 'local_only': return '仅本机';
    case 'syncing': return '正在同步';
    case 'synced': return '已同步';
    case 'sync_failed': return '同步失败';
    case 'conflict': return '冲突待处理';
    default: return status;
  }
}

export function getSyncStatusColor(status: string): string {
  switch (status) {
    case 'local_only': return 'text-gallery-400';
    case 'syncing': return 'text-amber-400';
    case 'synced': return 'text-emerald-400';
    case 'sync_failed': return 'text-red-400';
    case 'conflict': return 'text-orange-400';
    default: return 'text-gallery-400';
  }
}

export function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: unknown[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}

export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '…';
}

export function groupBy<T>(items: T[], keyFn: (item: T) => string): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  for (const item of items) {
    const key = keyFn(item);
    if (!result[key]) result[key] = [];
    result[key].push(item);
  }
  return result;
}

export function sortBy<T>(items: T[], keyFn: (item: T) => string | number, desc = true): T[] {
  return [...items].sort((a, b) => {
    const ka = keyFn(a);
    const kb = keyFn(b);
    if (ka < kb) return desc ? 1 : -1;
    if (ka > kb) return desc ? -1 : 1;
    return 0;
  });
}

export function getYearFromDate(dateStr: string): string {
  return new Date(dateStr).getFullYear().toString();
}
