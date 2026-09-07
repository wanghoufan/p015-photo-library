import { useEffect, useCallback, useState, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MediaAsset } from '@/lib/types';

interface LightboxProps {
  media: MediaAsset[];
  initialIndex: number;
  onClose: () => void;
  onNavigate?: (index: number) => void;
}

export function Lightbox({ media, initialIndex, onClose, onNavigate }: LightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const current = media[currentIndex];
  const hasMultiple = media.length > 1;

  const goNext = useCallback(() => {
    if (currentIndex < media.length - 1) {
      setCurrentIndex(i => i + 1);
      onNavigate?.(currentIndex + 1);
    }
  }, [currentIndex, media.length, onNavigate]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1);
      onNavigate?.(currentIndex - 1);
    }
  }, [currentIndex, onNavigate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape': onClose(); break;
        case 'ArrowRight': goNext(); break;
        case 'ArrowLeft': goPrev(); break;
        case ' ': e.preventDefault(); setIsZoomed(z => !z); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose, goNext, goPrev]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = e.changedTouches[0].clientX - touchStart;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goPrev();
      else goNext();
    }
    setTouchStart(null);
  };

  if (!current) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      role="dialog"
      aria-modal="true"
      aria-label="图片灯箱"
    >
      <button
        onClick={onClose}
        className="focus-ring absolute right-4 top-4 z-10 rounded-full bg-gallery-900/80 p-2 text-gallery-300 hover:text-gallery-100"
        aria-label="关闭"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full bg-gallery-900/80 px-3 py-1 text-sm text-gallery-400">
        {currentIndex + 1} / {media.length}
      </div>

      <button
        onClick={() => setIsZoomed(z => !z)}
        className="focus-ring absolute bottom-4 right-4 z-10 rounded-full bg-gallery-900/80 p-2 text-gallery-300 hover:text-gallery-100"
        aria-label={isZoomed ? '缩小' : '放大'}
      >
        {isZoomed ? <ZoomOut className="h-5 w-5" /> : <ZoomIn className="h-5 w-5" />}
      </button>

      {hasMultiple && currentIndex > 0 && (
        <button
          onClick={goPrev}
          className="focus-ring absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-gallery-900/80 p-2 text-gallery-300 hover:text-gallery-100"
          aria-label="上一张"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}

      {hasMultiple && currentIndex < media.length - 1 && (
        <button
          onClick={goNext}
          className="focus-ring absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-gallery-900/80 p-2 text-gallery-300 hover:text-gallery-100"
          aria-label="下一张"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}

      <div className={cn(
        'flex h-full w-full items-center justify-center p-4 transition-transform duration-300',
        isZoomed && 'cursor-zoom-out scale-150',
        !isZoomed && 'cursor-zoom-in',
      )}>
        <img
          src={current.displayUrl}
          alt=""
          className="max-h-full max-w-full object-contain"
          onClick={() => setIsZoomed(z => !z)}
          draggable={false}
        />
      </div>
    </div>
  );
}
