import { Camera, SearchX } from 'lucide-react';

interface EmptyResultsProps {
  type: 'gallery' | 'search' | 'loading';
  onClearFilters?: () => void;
}

export function EmptyResults({ type, onClearFilters }: EmptyResultsProps) {
  if (type === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gallery-500">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-gallery-700 border-t-gallery-400" />
        <p className="text-sm">加载中…</p>
      </div>
    );
  }

  if (type === 'search') {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
        <SearchX className="mb-4 h-10 w-10 text-gallery-600" />
        <h3 className="mb-1 text-base font-medium text-gallery-300">未找到匹配的作品</h3>
        <p className="mb-4 text-sm text-gallery-500">
          尝试调整筛选条件或搜索关键词
        </p>
        {onClearFilters && (
          <button
            onClick={onClearFilters}
            className="rounded-lg border border-gallery-700 px-4 py-2 text-sm text-gallery-300 hover:bg-gallery-800"
          >
            清除全部筛选
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <Camera className="mb-4 h-10 w-10 text-gallery-600" />
      <h3 className="mb-1 text-base font-medium text-gallery-300">作品库还是空的</h3>
      <p className="text-sm text-gallery-500">
        点击右下角的 + 按钮添加你的第一件摄影作品
      </p>
    </div>
  );
}
