import type { WorkWithRelations, ViewMode } from '@/lib/types';
import { MediaCard } from './MediaCard';
import { cn } from '@/lib/utils';

interface GalleryGridProps {
  works: WorkWithRelations[];
  viewMode: ViewMode;
  onWorkClick: (work: WorkWithRelations) => void;
  onToggleFavorite: (id: string) => void;
}

export function GalleryGrid({ works, viewMode, onWorkClick, onToggleFavorite }: GalleryGridProps) {
  if (works.length === 0) return null;

  if (viewMode === 'masonry') {
    return (
      <div className="gallery-masonry px-3 py-3 md:px-4 md:py-4 xl:px-6">
        {works.map(work => (
          <MediaCard
            key={work.id}
            work={work}
            onClick={() => onWorkClick(work)}
            onToggleFavorite={() => onToggleFavorite(work.id)}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={cn(
      'grid gap-2 px-3 py-3 md:gap-3 md:px-4 md:py-4 xl:gap-4 xl:px-6',
      'grid-cols-2 md:grid-cols-3 xl:grid-cols-4',
    )}>
      {works.map(work => (
        <MediaCard
          key={work.id}
          work={work}
          aspect="square"
          onClick={() => onWorkClick(work)}
          onToggleFavorite={() => onToggleFavorite(work.id)}
        />
      ))}
    </div>
  );
}
