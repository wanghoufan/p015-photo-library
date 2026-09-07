import { MapPin } from 'lucide-react';
import type { Location } from '@/lib/types';
import { cn } from '@/lib/utils';

interface FacetSidebarProps {
  locations: Location[];
  selectedLocationIds: string[];
  locationCounts: Record<string, number>;
  onToggleLocation: (id: string) => void;
}

export function FacetSidebar({ locations, selectedLocationIds, locationCounts, onToggleLocation }: FacetSidebarProps) {
  return (
    <aside className="hidden w-56 shrink-0 border-r border-gallery-800 lg:block xl:w-64">
      <div className="sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto scrollbar-thin p-4">
        <h2 className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-gallery-500">
          <MapPin className="h-3.5 w-3.5" />
          地点
        </h2>
        <ul className="space-y-0.5">
          {locations.map(loc => {
            const isSelected = selectedLocationIds.includes(loc.id);
            const count = locationCounts[loc.id] ?? 0;
            const isDisabled = count === 0 && !isSelected;
            return (
              <li key={loc.id}>
                <button
                  onClick={() => !isDisabled && onToggleLocation(loc.id)}
                  className={cn(
                    'focus-ring flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-sm transition-colors',
                    isSelected
                      ? 'bg-gallery-800 text-gallery-100'
                      : 'text-gallery-400 hover:bg-gallery-800/50 hover:text-gallery-200',
                    isDisabled && 'cursor-not-allowed opacity-40',
                  )}
                  disabled={isDisabled}
                >
                  <span className="truncate">{loc.name}</span>
                  <span className="ml-2 shrink-0 text-xs text-gallery-600">{count}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
