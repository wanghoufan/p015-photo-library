import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { WorkWithRelations, ActiveFilters, Location, FacetValue, ViewMode } from '@/lib/types';
import { generateDemoWorks, generateDemoLocations, generateDemoFacetValues } from '@/lib/demo-data';
import { applyFilters, createEmptyFilters } from '@/lib/filter-engine';
import { generateId, sortBy } from '@/lib/utils';

interface WorkContextValue {
  works: WorkWithRelations[];
  filteredWorks: WorkWithRelations[];
  locations: Location[];
  facetValues: FacetValue[];
  filters: ActiveFilters;
  setFilters: (filters: ActiveFilters) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  isLoading: boolean;
  addWork: (work: Omit<WorkWithRelations, 'id' | 'createdAt' | 'updatedAt' | 'revision' | 'baseRevision' | 'syncStatus' | 'isDemo'>) => string;
  updateWork: (id: string, updates: Partial<WorkWithRelations>) => void;
  deleteWork: (id: string) => void;
  toggleFavorite: (id: string) => void;
  getWorkById: (id: string) => WorkWithRelations | undefined;
  clearDemoData: () => void;
}

const WorkContext = createContext<WorkContextValue | null>(null);

export function useWorkStore(): WorkContextValue {
  const ctx = useContext(WorkContext);
  if (!ctx) throw new Error('useWorkStore must be used within WorkProvider');
  return ctx;
}

export function WorkProvider({ children }: { children: ReactNode }) {
  const [works, setWorks] = useState<WorkWithRelations[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [facetValues, setFacetValues] = useState<FacetValue[]>([]);
  const [filters, setFilters] = useState<ActiveFilters>(createEmptyFilters());
  const [viewMode, setViewMode] = useState<ViewMode>('masonry');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const demoWorks = generateDemoWorks();
    const demoLocations = generateDemoLocations();
    const demoFacetValues = generateDemoFacetValues();
    setWorks(sortBy(demoWorks, w => w.shotAt, true));
    setLocations(demoLocations);
    setFacetValues(demoFacetValues);
    setIsLoading(false);
  }, []);

  const filteredWorks = applyFilters(works, filters);

  const addWork = useCallback((workData: Omit<WorkWithRelations, 'id' | 'createdAt' | 'updatedAt' | 'revision' | 'baseRevision' | 'syncStatus' | 'isDemo'>): string => {
    const id = generateId();
    const now = new Date().toISOString();
    const newWork: WorkWithRelations = {
      ...workData,
      id,
      revision: 1,
      baseRevision: 1,
      syncStatus: 'local_only',
      isDemo: false,
      createdAt: now,
      updatedAt: now,
    };
    setWorks(prev => [newWork, ...prev]);
    return id;
  }, []);

  const updateWork = useCallback((id: string, updates: Partial<WorkWithRelations>) => {
    setWorks(prev => prev.map(w =>
      w.id === id ? { ...w, ...updates, updatedAt: new Date().toISOString(), revision: w.revision + 1 } : w,
    ));
  }, []);

  const deleteWork = useCallback((id: string) => {
    setWorks(prev => prev.filter(w => w.id !== id));
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setWorks(prev => prev.map(w =>
      w.id === id ? { ...w, isFavorite: !w.isFavorite, updatedAt: new Date().toISOString() } : w,
    ));
  }, []);

  const getWorkById = useCallback((id: string) => {
    return works.find(w => w.id === id);
  }, [works]);

  const clearDemoData = useCallback(() => {
    setWorks(prev => prev.filter(w => !w.isDemo));
  }, []);

  return (
    <WorkContext.Provider value={{
      works,
      filteredWorks,
      locations,
      facetValues,
      filters,
      setFilters,
      viewMode,
      setViewMode,
      isLoading,
      addWork,
      updateWork,
      deleteWork,
      toggleFavorite,
      getWorkById,
      clearDemoData,
    }}>
      {children}
    </WorkContext.Provider>
  );
}
