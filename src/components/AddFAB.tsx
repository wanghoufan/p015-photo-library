import { useNavigate, useLocation } from 'react-router-dom';
import { Plus } from 'lucide-react';

export function AddFAB() {
  const navigate = useNavigate();
  const location = useLocation();

  if (location.pathname === '/me') return null;

  return (
    <button
      onClick={() => navigate('/add')}
      className="focus-ring fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gallery-200 text-gallery-900 shadow-lg transition-transform hover:scale-105 active:scale-95 lg:bottom-auto lg:top-20"
      aria-label="添加作品"
    >
      <Plus className="h-6 w-6" strokeWidth={2.5} />
    </button>
  );
}
