import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, Heart, MapPin, Calendar, Tag } from 'lucide-react';
import { useWorkStore } from '@/stores/WorkStore';
import { Lightbox } from '@/components/Lightbox';
import { SyncBadge } from '@/components/SyncStatus';
import { cn, formatDate } from '@/lib/utils';

export function WorkDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getWorkById, deleteWork, toggleFavorite } = useWorkStore();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const work = id ? getWorkById(id) : undefined;

  if (!work) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gallery-500">
        <p className="mb-4">作品未找到</p>
        <button onClick={() => navigate('/')} className="text-gallery-300 hover:underline">
          返回画廊
        </button>
      </div>
    );
  }

  const handleDelete = () => {
    deleteWork(work.id);
    navigate('/');
  };

  const sortedMedia = [...work.media].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 lg:py-8">
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="focus-ring flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-gallery-400 hover:text-gallery-200"
        >
          <ArrowLeft className="h-4 w-4" />
          返回
        </button>
        <div className="flex items-center gap-2">
          <SyncBadge status={work.syncStatus} />
          <button
            onClick={() => toggleFavorite(work.id)}
            className={cn(
              'focus-ring rounded-lg p-2',
              work.isFavorite ? 'text-red-400' : 'text-gallery-500 hover:text-gallery-300',
            )}
            aria-label={work.isFavorite ? '取消收藏' : '收藏'}
          >
            <Heart className={cn('h-5 w-5', work.isFavorite && 'fill-current')} />
          </button>
          <button
            onClick={() => navigate(`/edit/${work.id}`)}
            className="focus-ring rounded-lg p-2 text-gallery-500 hover:text-gallery-300"
            aria-label="编辑"
          >
            <Edit className="h-5 w-5" />
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="focus-ring rounded-lg p-2 text-gallery-500 hover:text-red-400"
            aria-label="删除"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="mb-6 overflow-hidden rounded-lg bg-gallery-900">
        <div className="relative">
          {sortedMedia.length > 0 ? (
            <img
              src={sortedMedia[0].displayUrl}
              alt={work.title}
              className="w-full cursor-zoom-in object-contain"
              style={{ maxHeight: '70vh' }}
              onClick={() => setLightboxIndex(0)}
            />
          ) : (
            <div className="flex aspect-[4/3] items-center justify-center text-gallery-600">
              暂无图片
            </div>
          )}
        </div>

        {sortedMedia.length > 1 && (
          <div className="flex gap-2 overflow-x-auto p-3 hide-scrollbar">
            {sortedMedia.slice(1).map((m, i) => (
              <img
                key={m.id}
                src={m.thumbUrl}
                alt=""
                className="h-16 w-16 shrink-0 cursor-pointer rounded object-cover"
                onClick={() => setLightboxIndex(i + 1)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-medium text-gallery-100">{work.title}</h1>
          {work.privateNote && (
            <p className="mt-2 text-sm text-gallery-400">{work.privateNote}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-gallery-400">
          {work.location && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-gallery-500" />
              <span>{work.location.name}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-gallery-500" />
            <span>{formatDate(work.shotAt)}</span>
          </div>
        </div>

        {work.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Tag className="h-4 w-4 text-gallery-500" />
            {work.tags.map(tag => (
              <span key={tag} className="rounded-full border border-gallery-700 bg-gallery-800/50 px-2.5 py-0.5 text-xs text-gallery-400">
                {tag}
              </span>
            ))}
          </div>
        )}

        {work.facetValues.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {work.facetValues.map(fv => (
              <span key={fv.id} className="chip text-xs">
                {fv.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          media={sortedMedia}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80">
          <div className="mx-4 w-full max-w-sm rounded-lg bg-gallery-900 p-6">
            <h3 className="mb-2 text-lg font-medium text-gallery-100">确认删除</h3>
            <p className="mb-6 text-sm text-gallery-400">
              删除后无法恢复。确定要删除「{work.title}」吗？
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-lg border border-gallery-700 px-4 py-2 text-sm text-gallery-300 hover:bg-gallery-800"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
