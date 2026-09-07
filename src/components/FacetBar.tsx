import { cn, getOrientationLabel } from '@/lib/utils';
import type { ActiveFilters, Orientation } from '@/lib/types';
import { STYLE_OPTIONS, COMPOSITION_OPTIONS } from '@/lib/facet-config';

interface FacetBarProps {
  filters: ActiveFilters;
  facetCounts: Record<string, Record<string, number>>;
  onToggleStyle: (style: string) => void;
  onToggleComposition: (comp: string) => void;
  onSetYear: (year: string | null) => void;
  onSetOrientation: (orient: Orientation | null) => void;
  onToggleFavorite: () => void;
}

const ORIENTATION_OPTIONS: Array<{ value: Orientation; label: string }> = [
  { value: 'landscape', label: '横向' },
  { value: 'portrait', label: '竖向' },
  { value: 'square', label: '方形' },
];

export function FacetBar({
  filters,
  facetCounts,
  onToggleStyle,
  onToggleComposition,
  onSetYear,
  onSetOrientation,
  onToggleFavorite,
}: FacetBarProps) {
  const years = Object.keys(facetCounts['year'] ?? {}).sort((a, b) => b.localeCompare(a));
  const selectedStyles = filters.facetSelections['style'] ?? [];
  const selectedComps = filters.facetSelections['composition'] ?? [];

  return (
    <div className="space-y-3 border-b border-gallery-800 px-3 py-3 md:px-4 xl:px-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-gallery-500">风格</span>
        <div className="hide-scrollbar flex gap-1.5 overflow-x-auto">
          {STYLE_OPTIONS.map(style => {
            const isSelected = selectedStyles.includes(style);
            const count = facetCounts['style']?.[style] ?? 0;
            const isDisabled = count === 0 && !isSelected;
            return (
              <button
                key={style}
                onClick={() => !isDisabled && onToggleStyle(style)}
                className={cn('chip shrink-0', isSelected && 'border-gallery-500 bg-gallery-700 text-gallery-100')}
                data-active={isSelected}
                data-disabled={isDisabled}
                disabled={isDisabled}
              >
                {style}
                <span className="text-gallery-500">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-gallery-500">构图</span>
        <div className="hide-scrollbar flex gap-1.5 overflow-x-auto">
          {COMPOSITION_OPTIONS.map(comp => {
            const isSelected = selectedComps.includes(comp);
            const count = facetCounts['composition']?.[comp] ?? 0;
            const isDisabled = count === 0 && !isSelected;
            return (
              <button
                key={comp}
                onClick={() => !isDisabled && onToggleComposition(comp)}
                className={cn('chip shrink-0', isSelected && 'border-gallery-500 bg-gallery-700 text-gallery-100')}
                data-active={isSelected}
                data-disabled={isDisabled}
                disabled={isDisabled}
              >
                {comp}
                <span className="text-gallery-500">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-gallery-500">年份</span>
          <div className="flex gap-1">
            {years.map(year => (
              <button
                key={year}
                onClick={() => onSetYear(filters.year === year ? null : year)}
                className={cn(
                  'chip shrink-0',
                  filters.year === year && 'border-gallery-500 bg-gallery-700 text-gallery-100',
                )}
                data-active={filters.year === year}
              >
                {year}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-gallery-500">方向</span>
          <div className="flex gap-1">
            {ORIENTATION_OPTIONS.map(opt => {
              const count = facetCounts['orientation']?.[opt.value] ?? 0;
              const isDisabled = count === 0 && filters.orientation !== opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => !isDisabled && onSetOrientation(filters.orientation === opt.value ? null : opt.value)}
                  className={cn(
                    'chip shrink-0',
                    filters.orientation === opt.value && 'border-gallery-500 bg-gallery-700 text-gallery-100',
                  )}
                  data-active={filters.orientation === opt.value}
                  data-disabled={isDisabled}
                  disabled={isDisabled}
                >
                  {opt.label}
                  <span className="text-gallery-500">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={onToggleFavorite}
          className={cn(
            'chip shrink-0',
            filters.favoriteOnly && 'border-gallery-500 bg-gallery-700 text-gallery-100',
          )}
          data-active={filters.favoriteOnly}
        >
          收藏
        </button>
      </div>
    </div>
  );
}
