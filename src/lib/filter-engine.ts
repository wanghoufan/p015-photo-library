import type { ActiveFilters, FilterResult, WorkWithRelations, Orientation } from './types';
import { FACET_DEFINITIONS, STYLE_OPTIONS, COMPOSITION_OPTIONS } from './facet-config';
import { getYearFromDate } from './utils';

function matchesSearch(work: WorkWithRelations, search: string): boolean {
  if (!search.trim()) return true;
  const q = search.toLowerCase();
  return (
    work.title.toLowerCase().includes(q) ||
    work.privateNote.toLowerCase().includes(q) ||
    (work.location?.name.toLowerCase().includes(q) ?? false) ||
    work.tags.some(t => t.toLowerCase().includes(q))
  );
}

function matchesLocation(work: WorkWithRelations, locationIds: string[]): boolean {
  if (locationIds.length === 0) return true;
  return work.locationId !== '' && locationIds.includes(work.locationId);
}

function matchesFacetValues(work: WorkWithRelations, facetKey: string, selectedIds: string[]): boolean {
  if (selectedIds.length === 0) return true;
  const def = FACET_DEFINITIONS.find(f => f.key === facetKey);
  if (!def) return true;

  if (def.valueSource === 'computed:year') {
    const year = getYearFromDate(work.shotAt);
    return def.mode === 'single' ? selectedIds.includes(year) : selectedIds.some(v => v === year);
  }

  if (def.valueSource === 'computed:orientation') {
    return def.mode === 'single'
      ? selectedIds.includes(work.media[0]?.orientation ?? '')
      : selectedIds.some(v => work.media.some(m => m.orientation === v));
  }

  if (def.valueSource === 'computed:favorite') {
    return work.isFavorite;
  }

  if (def.valueSource.startsWith('facet:')) {
    const dimKey = def.valueSource.replace('facet:', '');
    const workValues = work.facetValues
      .filter(fv => fv.dimensionId === dimKey)
      .map(fv => fv.id);
    if (def.operator === 'and') {
      return selectedIds.every(id => workValues.includes(id));
    }
    return selectedIds.some(id => workValues.includes(id));
  }

  return true;
}

function matchesOrientation(work: WorkWithRelations, orientation: Orientation | null): boolean {
  if (!orientation) return true;
  return work.media.some(m => m.orientation === orientation);
}

function matchesYear(work: WorkWithRelations, year: string | null): boolean {
  if (!year) return true;
  return getYearFromDate(work.shotAt) === year;
}

function matchesFavorite(work: WorkWithRelations, favoriteOnly: boolean): boolean {
  if (!favoriteOnly) return true;
  return work.isFavorite;
}

export function applyFilters(works: WorkWithRelations[], filters: ActiveFilters): WorkWithRelations[] {
  return works.filter(work => {
    if (!matchesSearch(work, filters.search)) return false;
    if (!matchesLocation(work, filters.locationIds)) return false;
    if (!matchesOrientation(work, filters.orientation)) return false;
    if (!matchesYear(work, filters.year)) return false;
    if (!matchesFavorite(work, filters.favoriteOnly)) return false;

    for (const [facetKey, selectedIds] of Object.entries(filters.facetSelections)) {
      if (selectedIds.length === 0) continue;
      if (!matchesFacetValues(work, facetKey, selectedIds)) return false;
    }

    return true;
  });
}

function computeWorkOrientation(work: WorkWithRelations): string | null {
  if (work.media.length === 0) return null;
  return work.media[0].orientation;
}

export function computeFacetCounts(
  works: WorkWithRelations[],
  currentFilters: ActiveFilters,
): FilterResult['facetCounts'] {
  const counts: Record<string, Record<string, number>> = {};

  for (const def of FACET_DEFINITIONS) {
    counts[def.key] = {};

    if (def.valueSource === 'computed:year') {
      const years = new Set(works.map(w => getYearFromDate(w.shotAt)));
      for (const year of years) {
        const filtered = works.filter(w => {
          const testFilters: ActiveFilters = {
            ...currentFilters,
            year: year === currentFilters.year ? null : year,
          };
          return applyFilters([w], testFilters).length > 0;
        });
        counts[def.key][year] = filtered.length;
      }
    } else if (def.valueSource === 'computed:orientation') {
      const orientations: Orientation[] = ['landscape', 'portrait', 'square'];
      for (const o of orientations) {
        const filtered = works.filter(w => {
          const testFilters: ActiveFilters = {
            ...currentFilters,
            orientation: o === currentFilters.orientation ? null : o,
          };
          return applyFilters([w], testFilters).length > 0;
        });
        counts[def.key][o] = filtered.length;
      }
    } else if (def.valueSource === 'computed:favorite') {
      const favCount = works.filter(w => {
        const testFilters: ActiveFilters = { ...currentFilters, favoriteOnly: !currentFilters.favoriteOnly };
        return applyFilters([w], testFilters).length > 0;
      }).length;
      counts[def.key]['favorite'] = favCount;
    } else if (def.valueSource.startsWith('facet:')) {
      const dimKey = def.valueSource.replace('facet:', '');
      const options = dimKey === 'style' ? STYLE_OPTIONS : COMPOSITION_OPTIONS;
      for (const opt of options) {
        const filtered = works.filter(w => {
          const hasValue = w.facetValues.some(fv => fv.dimensionId === dimKey && fv.name === opt);
          if (!hasValue) return false;
          const testFilters: ActiveFilters = {
            ...currentFilters,
            facetSelections: {
              ...currentFilters.facetSelections,
              [def.key]: currentFilters.facetSelections[def.key]?.includes(opt)
                ? currentFilters.facetSelections[def.key].filter(v => v !== opt)
                : [...(currentFilters.facetSelections[def.key] ?? []), opt],
            },
          };
          return applyFilters([w], testFilters).length > 0;
        });
        counts[def.key][opt] = filtered.length;
      }
    }
  }

  return counts;
}

export function computeLocationCounts(
  works: WorkWithRelations[],
  currentFilters: ActiveFilters,
  allLocationIds: string[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const locId of allLocationIds) {
    const filtered = works.filter(w => {
      const testFilters: ActiveFilters = {
        ...currentFilters,
        locationIds: currentFilters.locationIds.includes(locId)
          ? currentFilters.locationIds.filter(id => id !== locId)
          : [...currentFilters.locationIds, locId],
      };
      return applyFilters([w], testFilters).length > 0;
    });
    counts[locId] = filtered.length;
  }
  return counts;
}

export function getDisabledValues(
  counts: Record<string, Record<string, number>>,
): Record<string, Set<string>> {
  const disabled: Record<string, Set<string>> = {};
  for (const [facetKey, valueCounts] of Object.entries(counts)) {
    disabled[facetKey] = new Set();
    for (const [value, count] of Object.entries(valueCounts)) {
      if (count === 0) {
        disabled[facetKey].add(value);
      }
    }
  }
  return disabled;
}

export function filtersToSearchParams(filters: ActiveFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.search) params.set('q', filters.search);
  if (filters.locationIds.length > 0) params.set('loc', filters.locationIds.join(','));
  if (filters.orientation) params.set('orient', filters.orientation);
  if (filters.year) params.set('year', filters.year);
  if (filters.favoriteOnly) params.set('fav', '1');

  for (const [key, values] of Object.entries(filters.facetSelections)) {
    if (values.length > 0) params.set(key, values.join(','));
  }

  return params;
}

export function searchParamsToFilters(params: URLSearchParams): ActiveFilters {
  const facetSelections: Record<string, string[]> = {};
  for (const def of FACET_DEFINITIONS) {
    const val = params.get(def.key);
    if (val) {
      facetSelections[def.key] = val.split(',').filter(Boolean);
    }
  }

  return {
    search: params.get('q') ?? '',
    locationIds: params.get('loc')?.split(',').filter(Boolean) ?? [],
    facetSelections,
    favoriteOnly: params.get('fav') === '1',
    orientation: (params.get('orient') as Orientation | null) ?? null,
    year: params.get('year'),
  };
}

export function createEmptyFilters(): ActiveFilters {
  return {
    search: '',
    locationIds: [],
    facetSelections: {},
    favoriteOnly: false,
    orientation: null,
    year: null,
  };
}
