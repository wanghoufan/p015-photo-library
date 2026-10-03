import { useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useWorkStore } from '@/stores/WorkStore';
import { GalleryGrid } from '@/components/GalleryGrid';
import { FacetSidebar } from '@/components/FacetSidebar';
import { FacetBar } from '@/components/FacetBar';
import { SearchInput } from '@/components/SearchInput';
import { ActiveFilterList } from '@/components/ActiveFilterList';
import { EmptyResults } from '@/components/EmptyResults';
import { computeFacetCounts, computeLocationCounts, searchParamsToFilters, filtersToSearchParams, createEmptyFilters } from '@/lib/filter-engine';
import type { WorkWithRelations, Orientation } from '@/lib/types';
import { debounce } from '@/lib/utils';
import { useEffect } from 'react';

export function Find() {
  const {
    works, filteredWorks, locations, filters, setFilters,
    viewMode, isLoading, toggleFavorite,
  } = useWorkStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const fromUrl = searchParamsToFilters(searchParams);
    if (JSON.stringify(fromUrl) !== JSON.stringify(filters)) {
      setFilters(fromUrl);
    }
  }, []);

  useEffect(() => {
    const params = filtersToSearchParams(filters);
    setSearchParams(params, { replace: true });
  }, [filters]);

  const facetCounts = useMemo(() => computeFacetCounts(works, filters), [works, filters]);
  const locationCounts = useMemo(() => computeLocationCounts(works, filters, locations.map(l => l.id)), [works, filters, locations]);

  const handleSearch = useCallback(
    debounce(((value: string) => {
      setFilters({ ...filters, search: value });
    }) as (...args: unknown[]) => void, 300),
    [filters, setFilters],
  );

  const handleWorkClick = (work: WorkWithRelations) => {
    navigate(`/work/${work.id}`);
  };

  const handleToggleLocation = (id: string) => {
    const newIds = filters.locationIds.includes(id)
      ? filters.locationIds.filter(lid => lid !== id)
      : [...filters.locationIds, id];
    setFilters({ ...filters, locationIds: newIds });
  };

  const handleToggleStyle = (style: string) => {
    const current = filters.facetSelections['style'] ?? [];
    const newValues = current.includes(style) ? current.filter(s => s !== style) : [...current, style];
    setFilters({ ...filters, facetSelections: { ...filters.facetSelections, style: newValues } });
  };

  const handleToggleComposition = (comp: string) => {
    const current = filters.facetSelections['composition'] ?? [];
    const newValues = current.includes(comp) ? current.filter(c => c !== comp) : [...current, comp];
    setFilters({ ...filters, facetSelections: { ...filters.facetSelections, composition: newValues } });
  };

  const handleSetYear = (year: string | null) => setFilters({ ...filters, year });
  const handleSetOrientation = (orient: Orientation | null) => setFilters({ ...filters, orientation: orient });
  const handleToggleFavorite = () => setFilters({ ...filters, favoriteOnly: !filters.favoriteOnly });

  const handleClearAll = () => setFilters(createEmptyFilters());

  const hasResults = filteredWorks.length > 0;
  const hasFilters = filters.search || filters.locationIds.length > 0 ||
    Object.values(filters.facetSelections).some(v => v.length > 0) ||
    filters.year || filters.orientation || filters.favoriteOnly;

  return (
    <div className="flex h-[calc(100vh-4rem)] lg:h-[calc(100vh-3.5rem)]">
      <FacetSidebar
        locations={locations}
        selectedLocationIds={filters.locationIds}
        locationCounts={locationCounts}
        onToggleLocation={handleToggleLocation}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-3 border-b border-gallery-800 px-3 py-3 md:px-4 lg:pr-24 xl:pl-6">
          <div className="flex-1">
            <SearchInput value={filters.search} onChange={handleSearch} />
          </div>
          <span className="hidden text-xs text-gallery-500 sm:block">
            {filteredWorks.length} 件结果
          </span>
        </div>

        <FacetBar
          filters={filters}
          facetCounts={facetCounts}
          onToggleStyle={handleToggleStyle}
          onToggleComposition={handleToggleComposition}
          onSetYear={handleSetYear}
          onSetOrientation={handleSetOrientation}
          onToggleFavorite={handleToggleFavorite}
        />

        <ActiveFilterList
          filters={filters}
          locations={locations}
          onRemoveLocation={id => setFilters({ ...filters, locationIds: filters.locationIds.filter(lid => lid !== id) })}
          onRemoveFacet={(key, val) => {
            const current = filters.facetSelections[key] ?? [];
            setFilters({ ...filters, facetSelections: { ...filters.facetSelections, [key]: current.filter(v => v !== val) } });
          }}
          onClearYear={() => setFilters({ ...filters, year: null })}
          onClearOrientation={() => setFilters({ ...filters, orientation: null })}
          onClearFavorite={() => setFilters({ ...filters, favoriteOnly: false })}
          onClearSearch={() => setFilters({ ...filters, search: '' })}
          onClearAll={handleClearAll}
        />

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {isLoading ? (
            <EmptyResults type="loading" />
          ) : hasResults ? (
            <GalleryGrid
              works={filteredWorks}
              viewMode={viewMode}
              onWorkClick={handleWorkClick}
              onToggleFavorite={toggleFavorite}
            />
          ) : hasFilters ? (
            <EmptyResults type="search" onClearFilters={handleClearAll} />
          ) : (
            <EmptyResults type="gallery" />
          )}
        </div>
      </div>
    </div>
  );
}
