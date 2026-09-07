import { X } from 'lucide-react';
import type { ActiveFilters, Location } from '@/lib/types';
import { getOrientationLabel } from '@/lib/utils';

interface ActiveFilterListProps {
  filters: ActiveFilters;
  locations: Location[];
  onRemoveLocation: (id: string) => void;
  onRemoveFacet: (facetKey: string, value: string) => void;
  onClearYear: () => void;
  onClearOrientation: () => void;
  onClearFavorite: () => void;
  onClearSearch: () => void;
  onClearAll: () => void;
}

export function ActiveFilterList({
  filters,
  locations,
  onRemoveLocation,
  onRemoveFacet,
  onClearYear,
  onClearOrientation,
  onClearFavorite,
  onClearSearch,
  onClearAll,
}: ActiveFilterListProps) {
  const hasFilters =
    filters.search ||
    filters.locationIds.length > 0 ||
    Object.values(filters.facetSelections).some(v => v.length > 0) ||
    filters.year ||
    filters.orientation ||
    filters.favoriteOnly;

  if (!hasFilters) return null;

  const chips: Array<{ key: string; label: string; onRemove: () => void }> = [];

  if (filters.search) {
    chips.push({ key: 'search', label: `"${filters.search}"`, onRemove: onClearSearch });
  }

  for (const locId of filters.locationIds) {
    const loc = locations.find(l => l.id === locId);
    if (loc) {
      chips.push({ key: `loc-${locId}`, label: loc.name, onRemove: () => onRemoveLocation(locId) });
    }
  }

  for (const [facetKey, values] of Object.entries(filters.facetSelections)) {
    for (const val of values) {
      chips.push({
        key: `${facetKey}-${val}`,
        label: val,
        onRemove: () => onRemoveFacet(facetKey, val),
      });
    }
  }

  if (filters.year) {
    chips.push({ key: 'year', label: filters.year, onRemove: onClearYear });
  }

  if (filters.orientation) {
    chips.push({ key: 'orientation', label: getOrientationLabel(filters.orientation), onRemove: onClearOrientation });
  }

  if (filters.favoriteOnly) {
    chips.push({ key: 'favorite', label: '收藏', onRemove: onClearFavorite });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-gallery-800 px-3 py-2 md:px-4 xl:px-6">
      {chips.map(chip => (
        <span
          key={chip.key}
          className="inline-flex items-center gap-1 rounded-full border border-gallery-600 bg-gallery-800 px-2.5 py-1 text-xs text-gallery-300"
        >
          {chip.label}
          <button
            onClick={chip.onRemove}
            className="rounded-full p-0.5 hover:text-gallery-100"
            aria-label={`移除筛选：${chip.label}`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      {chips.length > 1 && (
        <button
          onClick={onClearAll}
          className="text-xs text-gallery-500 hover:text-gallery-300"
        >
          清除全部
        </button>
      )}
    </div>
  );
}
