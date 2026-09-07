import { useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, X, Image as ImageIcon } from 'lucide-react';
import { useWorkStore } from '@/stores/WorkStore';
import { STYLE_OPTIONS, COMPOSITION_OPTIONS, COMMON_TAGS } from '@/lib/facet-config';
import { processImage, createObjectUrl } from '@/lib/image';
import { cn, generateId, formatDate } from '@/lib/utils';
import type { MediaAsset, Orientation } from '@/lib/types';

export function AddWork() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getWorkById, addWork, updateWork, locations } = useWorkStore();

  const existingWork = id ? getWorkById(id) : undefined;
  const isEditing = !!existingWork;

  const [title, setTitle] = useState(existingWork?.title ?? '');
  const [note, setNote] = useState(existingWork?.privateNote ?? '');
  const [shotAt, setShotAt] = useState(existingWork?.shotAt?.split('T')[0] ?? new Date().toISOString().split('T')[0]);
  const [locationId, setLocationId] = useState(existingWork?.locationId ?? '');
  const [newLocationName, setNewLocationName] = useState('');
  const [selectedStyles, setSelectedStyles] = useState<string[]>(
    existingWork?.facetValues.filter(fv => fv.dimensionId === 'style').map(fv => fv.name) ?? [],
  );
  const [selectedComps, setSelectedComps] = useState<string[]>(
    existingWork?.facetValues.filter(fv => fv.dimensionId === 'composition').map(fv => fv.name) ?? [],
  );
  const [tags, setTags] = useState<string[]>(existingWork?.tags ?? []);
  const [newTag, setNewTag] = useState('');
  const [mediaItems, setMediaItems] = useState<Array<{ file: File; preview: string; orientation: Orientation; width: number; height: number }>>([]);
  const [coverIndex, setCoverIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files) return;
    setIsProcessing(true);
    const newItems: typeof mediaItems = [];

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      try {
        const result = await processImage(file);
        const preview = createObjectUrl(result.thumbBlob);
        newItems.push({
          file,
          preview,
          orientation: result.orientation,
          width: result.width,
          height: result.height,
        });
      } catch {
        // skip invalid files
      }
    }

    setMediaItems(prev => [...prev, ...newItems]);
    setIsProcessing(false);
  }, []);

  const removeMedia = (index: number) => {
    setMediaItems(prev => {
      const next = prev.filter((_, i) => i !== index);
      if (coverIndex >= next.length) setCoverIndex(Math.max(0, next.length - 1));
      return next;
    });
  };

  const handleAddTag = () => {
    const tag = newTag.trim();
    if (tag && !tags.includes(tag)) {
      setTags(prev => [...prev, tag]);
    }
    setNewTag('');
  };

  const handleSubmit = () => {
    if (!title.trim() || mediaItems.length === 0) return;

    const effectiveLocationId = locationId || (newLocationName.trim() ? `loc-new-${generateId()}` : '');

    const media: MediaAsset[] = mediaItems.map((item, i) => ({
      id: `media-${generateId()}`,
      workId: '',
      displayUrl: item.preview,
      thumbUrl: item.preview,
      mimeType: 'image/webp',
      byteSize: item.file.size,
      width: item.width,
      height: item.height,
      orientation: item.orientation,
      sortOrder: i,
      uploadStatus: 'pending' as const,
      displayPath: null,
      thumbPath: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    if (isEditing && existingWork) {
      updateWork(existingWork.id, {
        title: title.trim(),
        privateNote: note.trim(),
        shotAt,
        locationId: effectiveLocationId,
        coverMediaId: media[coverIndex]?.id ?? null,
        mediaCount: media.length,
        media,
        facetValues: [
          ...selectedStyles.map(s => ({ id: `fv-${s}`, dimensionId: 'style', parentId: null, name: s, sortOrder: 0, createdAt: '', updatedAt: '' })),
          ...selectedComps.map(c => ({ id: `fv-${c}`, dimensionId: 'composition', parentId: null, name: c, sortOrder: 0, createdAt: '', updatedAt: '' })),
        ],
        tags,
      });
    } else {
      addWork({
        title: title.trim(),
        privateNote: note.trim(),
        shotAt,
        locationId: effectiveLocationId,
        coverMediaId: media[coverIndex]?.id ?? null,
        isFavorite: false,
        mediaCount: media.length,
        location: newLocationName.trim() ? { id: effectiveLocationId, name: newLocationName.trim(), country: '', province: '', city: '', area: '', revision: 1, syncStatus: 'local' as const, isDemo: false, createdAt: '', updatedAt: '' } : null,
        media,
        facetValues: [
          ...selectedStyles.map(s => ({ id: `fv-${s}`, dimensionId: 'style', parentId: null, name: s, sortOrder: 0, createdAt: '', updatedAt: '' })),
          ...selectedComps.map(c => ({ id: `fv-${c}`, dimensionId: 'composition', parentId: null, name: c, sortOrder: 0, createdAt: '', updatedAt: '' })),
        ],
        tags,
      });
    }

    navigate('/');
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 lg:py-8">
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="focus-ring rounded-lg p-1 text-gallery-400 hover:text-gallery-200"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-medium text-gallery-100">
          {isEditing ? '编辑作品' : '添加作品'}
        </h1>
      </div>

      <div className="space-y-6">
        {/* Photos */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gallery-300">照片</label>
          <div className="flex flex-wrap gap-2">
            {mediaItems.map((item, i) => (
              <div key={i} className={cn(
                'group relative h-20 w-20 overflow-hidden rounded',
                i === coverIndex && 'ring-2 ring-gallery-400',
              )}>
                <img src={item.preview} alt="" className="h-full w-full object-cover" />
                <button
                  onClick={() => setCoverIndex(i)}
                  className={cn(
                    'absolute bottom-0.5 left-0.5 rounded bg-black/60 px-1 text-[10px]',
                    i === coverIndex ? 'text-gallery-200' : 'text-gallery-500',
                  )}
                >
                  封面
                </button>
                <button
                  onClick={() => removeMedia(i)}
                  className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white opacity-0 group-hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex h-20 w-20 items-center justify-center rounded border-2 border-dashed border-gallery-700 text-gallery-500 hover:border-gallery-500 hover:text-gallery-300"
            >
              {isProcessing ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-gallery-600 border-t-gallery-300" />
              ) : (
                <ImageIcon className="h-6 w-6" />
              )}
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => handleFileSelect(e.target.files)}
          />
        </div>

        {/* Title */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gallery-300">作品名</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="给作品取个名字"
            className="focus-ring w-full rounded-lg border border-gallery-800 bg-gallery-900 px-3 py-2 text-sm text-gallery-200 placeholder:text-gallery-600"
          />
        </div>

        {/* Note */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gallery-300">私人说明</label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="记录拍摄时的想法…"
            rows={3}
            className="focus-ring w-full resize-none rounded-lg border border-gallery-800 bg-gallery-900 px-3 py-2 text-sm text-gallery-200 placeholder:text-gallery-600"
          />
        </div>

        {/* Shot date */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gallery-300">拍摄日期</label>
          <input
            type="date"
            value={shotAt}
            onChange={e => setShotAt(e.target.value)}
            className="focus-ring w-full rounded-lg border border-gallery-800 bg-gallery-900 px-3 py-2 text-sm text-gallery-200"
          />
        </div>

        {/* Location */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gallery-300">地点</label>
          <select
            value={locationId}
            onChange={e => { setLocationId(e.target.value); setNewLocationName(''); }}
            className="focus-ring mb-2 w-full rounded-lg border border-gallery-800 bg-gallery-900 px-3 py-2 text-sm text-gallery-200"
          >
            <option value="">选择已有地点</option>
            {locations.map(loc => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
          <input
            type="text"
            value={newLocationName}
            onChange={e => { setNewLocationName(e.target.value); setLocationId(''); }}
            placeholder="或输入新地点名称"
            className="focus-ring w-full rounded-lg border border-gallery-800 bg-gallery-900 px-3 py-2 text-sm text-gallery-200 placeholder:text-gallery-600"
          />
        </div>

        {/* Style */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gallery-300">风格</label>
          <div className="flex flex-wrap gap-1.5">
            {STYLE_OPTIONS.map(style => (
              <button
                key={style}
                onClick={() => setSelectedStyles(prev =>
                  prev.includes(style) ? prev.filter(s => s !== style) : [...prev, style],
                )}
                className={cn('chip', selectedStyles.includes(style) && 'border-gallery-500 bg-gallery-700 text-gallery-100')}
                data-active={selectedStyles.includes(style)}
              >
                {style}
              </button>
            ))}
          </div>
        </div>

        {/* Composition */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gallery-300">构图</label>
          <div className="flex flex-wrap gap-1.5">
            {COMPOSITION_OPTIONS.map(comp => (
              <button
                key={comp}
                onClick={() => setSelectedComps(prev =>
                  prev.includes(comp) ? prev.filter(c => c !== comp) : [...prev, comp],
                )}
                className={cn('chip', selectedComps.includes(comp) && 'border-gallery-500 bg-gallery-700 text-gallery-100')}
                data-active={selectedComps.includes(comp)}
              >
                {comp}
              </button>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gallery-300">标签</label>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {tags.map(tag => (
              <span key={tag} className="inline-flex items-center gap-1 rounded-full border border-gallery-700 bg-gallery-800 px-2.5 py-0.5 text-xs text-gallery-300">
                {tag}
                <button onClick={() => setTags(prev => prev.filter(t => t !== tag))}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newTag}
              onChange={e => setNewTag(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
              placeholder="输入标签"
              className="focus-ring flex-1 rounded-lg border border-gallery-800 bg-gallery-900 px-3 py-2 text-sm text-gallery-200 placeholder:text-gallery-600"
            />
            <button
              onClick={handleAddTag}
              className="rounded-lg border border-gallery-700 px-3 py-2 text-sm text-gallery-300 hover:bg-gallery-800"
            >
              添加
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {COMMON_TAGS.filter(t => !tags.includes(t)).slice(0, 10).map(tag => (
              <button
                key={tag}
                onClick={() => setTags(prev => [...prev, tag])}
                className="rounded-full border border-gallery-800 px-2 py-0.5 text-xs text-gallery-500 hover:border-gallery-600 hover:text-gallery-300"
              >
                +{tag}
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={() => navigate(-1)}
            className="flex-1 rounded-lg border border-gallery-700 py-2.5 text-sm text-gallery-300 hover:bg-gallery-800"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || mediaItems.length === 0}
            className="flex-1 rounded-lg bg-gallery-200 py-2.5 text-sm font-medium text-gallery-900 hover:bg-gallery-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isEditing ? '保存修改' : '添加作品'}
          </button>
        </div>
      </div>
    </div>
  );
}
