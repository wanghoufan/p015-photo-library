import { Heart } from 'lucide-react';
import type { WorkWithRelations } from '@/lib/types';
import { cn, formatDate } from '@/lib/utils';

interface MediaCardProps {
  work: WorkWithRelations;
  aspect?: 'natural' | 'square';
  onClick: () => void;
  onToggleFavorite: () => void;
}

export function MediaCard({ work, aspect = 'natural', onClick, onToggleFavorite }: MediaCardProps) {
  const coverMedia = work.media.find(m => m.id === work.coverMediaId) ?? work.media[0];

  return (
    <div
      className="focus-ring group relative cursor-pointer overflow-hidden rounded-sm bg-gallery-900"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter') onClick(); }}
      aria-label={`查看作品：${work.title}`}
    >
      <div className={cn(
        'relative overflow-hidden',
        aspect === 'square' ? 'aspect-square' : '',
      )}>
        {coverMedia ? (
          <img
            src={coverMedia.thumbUrl}
            alt={work.title}
            className={cn(
              'h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]',
              aspect === 'natural' && 'w-full',
            )}
            loading="lazy"
            style={aspect === 'natural' ? { aspectRatio: `${coverMedia.width}/${coverMedia.height}` } : undefined}
          />
        ) : (
          <div className="flex aspect-[4/3] items-center justify-center bg-gallery-800 text-gallery-600">
            暂无图片
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 max-lg:opacity-100" />

        <button
          onClick={e => { e.stopPropagation(); onToggleFavorite(); }}
          className="focus-ring absolute right-2 top-2 rounded-full bg-black/40 p-1.5 text-white/70 opacity-0 transition-opacity hover:text-white group-hover:opacity-100"
          aria-label={work.isFavorite ? '取消收藏' : '收藏'}
        >
          <Heart className={cn('h-4 w-4', work.isFavorite && 'fill-red-400 text-red-400')} />
        </button>
      </div>

      {/* 桌面 hover 显示全部；手机常显日期地点一行（标题/标签仅桌面） */}
      <div className="absolute bottom-0 left-0 right-0 translate-y-full p-3 transition-transform duration-300 group-hover:translate-y-0 max-lg:translate-y-0 max-lg:p-2">
        <p className="truncate text-sm font-medium text-white max-lg:hidden">{work.title}</p>
        <div className="mt-0.5 flex items-center justify-end gap-2 text-xs text-white/70 max-lg:mt-0 max-lg:text-[11px]">
          {work.location && <span className="truncate">{work.location.name}</span>}
          <span className="shrink-0">{formatDate(work.shotAt)}</span>
        </div>
      </div>

      {work.tags.length > 0 && (
        <div className="absolute bottom-2 left-2 right-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 max-lg:hidden">
          {work.tags.slice(0, 3).map(tag => (
            <span key={tag} className="rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white/80">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
