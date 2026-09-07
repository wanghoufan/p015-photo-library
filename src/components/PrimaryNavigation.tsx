import { useLocation, useNavigate } from 'react-router-dom';
import { Image, Search, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { path: '/', label: '画廊', icon: Image },
  { path: '/find', label: '筛选', icon: Search },
  { path: '/me', label: '我的', icon: User },
];

export function PrimaryNavigation() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gallery-800 bg-gallery-950/95 backdrop-blur-sm lg:top-0 lg:bottom-auto lg:border-t-0 lg:border-b">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-around px-4 lg:h-14 lg:justify-start lg:gap-8">
        {NAV_ITEMS.map(item => {
          const isActive = location.pathname === item.path ||
            (item.path !== '/' && location.pathname.startsWith(item.path));
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'focus-ring flex flex-1 flex-col items-center gap-0.5 rounded-lg px-3 py-2 text-xs transition-colors lg:flex-row lg:gap-2 lg:px-4 lg:py-1.5 lg:text-sm',
                isActive
                  ? 'text-gallery-100'
                  : 'text-gallery-500 hover:text-gallery-300',
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={isActive ? 2 : 1.5} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
