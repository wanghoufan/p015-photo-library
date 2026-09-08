import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, X, Image as ImageIcon } from 'lucide-react';
import { useWorkStore, type NewMediaInput } from '@/stores/WorkStore';
import { STYLE_OPTIONS, COMPOSITION_OPTIONS, COMMON_TAGS } from '@/lib/facet-config';
import { processImage } from '@/lib/image';
import { cn, generateId } from '@/lib/utils';
import type { Orientation } from '@/lib/types';
import { BatchImportPanel } from '@/components/BatchImportPanel';

interface MediaItem {
  key: string;
  existingId: string | null;
  preview: string;
  file: File | null;
  thumbBlob: Blob | null;
  displayBlob: Blob | null;
  orientation: Orientation;
  width: number;
  height: number;
}

export function AddWork() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getWorkById, addWork, updateWorkFull, locations } = useWorkStore();

  // 编辑态的既有行来自 store（IDB 异步加载；直连 /edit/:id 时首渲染为空，
  // 数据到达后用 seedKey 触发一次回填；seedKey 绑定 id+updatedAt，避免覆盖用户输入）
  const existingWork = id ? getWorkById(id) : undefined;
  const isEditing = !!existingWork;
  const seedKey = existingWork ? `${existingWork.id}:${existingWork.updatedAt}` : 'new';

  const [title, setTitle] = useState(existingWork?.title ?? '');
  const [note, setNote] = useState(existingWork?.privateNote ?? '');
  const [shotAt, setShotAt] = useState(existingWork?.shotAt?.split('T')[0] ?? new Date().toISOString().split('T')[0]);
  const [locationId, setLocationId] = useState(existingWork?.locationId ?? '');
  const [newLocationName, setNewLocationName] = useState('');
  const [selectedStyles, setSelectedStyles] = useState<string[]>(
    existingWork?.facetValues.map(fv => fv.name).filter(n => STYLE_OPTIONS.includes(n)) ?? [],
  );
  const [selectedComps, setSelectedComps] = useState<string[]>(
    existingWork?.facetValues.map(fv => fv.name).filter(n => COMPOSITION_OPTIONS.includes(n)) ?? [],
  );
  const [tags, setTags] = useState<string[]>(existingWork?.tags ?? []);
  const [newTag, setNewTag] = useState('');
  const [mediaItems, setMediaItems] = useState<MediaItem[]>(() =>
    (existingWork?.media ?? []).map(m => ({
      key: `existing-${m.id}`,
      existingId: m.id,
      preview: m.displayUrl || m.thumbUrl,
      file: null,
      thumbBlob: null,
      displayBlob: null,
      orientation: m.orientation,
      width: m.width,
      height: m.height,
    })),
  );
  const [coverIndex, setCoverIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  // 新增页单张/批量切换（编辑态固定单张）
  const [batchMode, setBatchMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlsRef = useRef<Set<string>>(new Set());
  const seededKeyRef = useRef<string>('new');

  // IDB 数据到达后回填表单（仅 seedKey 变化时，避免覆盖用户输入）
  useEffect(() => {
    if (!existingWork || seededKeyRef.current === seedKey) return;
    seededKeyRef.current = seedKey;
    setTitle(existingWork.title);
    setNote(existingWork.privateNote);
    setShotAt(existingWork.shotAt?.split('T')[0] ?? new Date().toISOString().split('T')[0]);
    setLocationId(existingWork.locationId);
    setNewLocationName('');
    setSelectedStyles(existingWork.facetValues.map(fv => fv.name).filter(n => STYLE_OPTIONS.includes(n)));
    setSelectedComps(existingWork.facetValues.map(fv => fv.name).filter(n => COMPOSITION_OPTIONS.includes(n)));
    setTags(existingWork.tags);
    setMediaItems(existingWork.media.map(m => ({
      key: `existing-${m.id}`,
      existingId: m.id,
      preview: m.displayUrl || m.thumbUrl,
      file: null,
      thumbBlob: null,
      displayBlob: null,
      orientation: m.orientation,
      width: m.width,
      height: m.height,
    })));
    setCoverIndex(0);
  }, [seedKey, existingWork]);

  // 组件卸载时回收本页创建的预览 URL（store 会为入库图片另建 URL）
  useEffect(() => {
    const urls = previewUrlsRef.current;
    return () => {
      for (const url of urls) {
        if (url.startsWith('blob:')) {
          try { URL.revokeObjectURL(url); } catch { /* ignore */ }
        }
      }
      urls.clear();
    };
  }, []);

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files) return;
    setIsProcessing(true);
    setFileErrors([]);
    const newItems: MediaItem[] = [];
    const errors: string[] = [];

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/') && file.type !== '') continue;
      try {
        const result = await processImage(file);
        const preview = URL.createObjectURL(result.thumbBlob);
        previewUrlsRef.current.add(preview);
        newItems.push({
          key: `new-${generateId()}`,
          existingId: null,
          preview,
          file,
          thumbBlob: result.thumbBlob,
          displayBlob: result.displayBlob,
          orientation: result.orientation,
          width: result.width,
          height: result.height,
        });
      } catch (err) {
        errors.push(err instanceof Error ? err.message : `无法读取「${file.name}」`);
      }
    }

    setMediaItems(prev => [...prev, ...newItems]);
    setFileErrors(errors);
    setIsProcessing(false);
  }, []);

  const removeMedia = (index: number) => {
    setMediaItems(prev => {
      const removed = prev[index];
      if (removed && removed.preview.startsWith('blob:') && !removed.existingId) {
        try { URL.revokeObjectURL(removed.preview); } catch { /* ignore */ }
        previewUrlsRef.current.delete(removed.preview);
      }
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

  // 标题/说明均为可选：标题空则取首图文件名（去扩展名），再空则“未命名作品”
  const resolvedTitle = (): string => {
    if (title.trim()) return title.trim();
    const firstFile = mediaItems.find(m => m.file)?.file;
    if (firstFile) {
      const base = firstFile.name.replace(/\.[^.]+$/, '').trim();
      if (base) return base;
    }
    return '未命名作品';
  };

  const canSubmit = mediaItems.length > 0 && !isSaving;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSaving(true);
    try {
      const finalTitle = isEditing && existingWork ? (title.trim() || existingWork.title) : resolvedTitle();
      const newInputs: NewMediaInput[] = [];
      const keepMediaIds: string[] = [];
      for (const item of mediaItems) {
        if (item.existingId) {
          keepMediaIds.push(item.existingId);
        }
      }
      for (const item of mediaItems) {
        if (!item.existingId && item.file && item.thumbBlob && item.displayBlob) {
          newInputs.push({
            file: item.file,
            thumbBlob: item.thumbBlob,
            displayBlob: item.displayBlob,
            orientation: item.orientation,
            width: item.width,
            height: item.height,
          });
        }
      }

      if (isEditing && existingWork) {
        // 列表顺序恒为“保留（原相对顺序）+ 新增（追加顺序）”，与 store 内
        // allKeptIds 一致，coverIndex 可直接透传。
        await updateWorkFull(existingWork.id, {
          title: finalTitle,
          privateNote: note.trim(),
          shotAt,
          locationId,
          newLocationName,
          styles: selectedStyles,
          comps: selectedComps,
          tags,
          media: newInputs,
          coverIndex,
          keepMediaIds,
        });
      } else {
        await addWork({
          title: finalTitle,
          privateNote: note.trim(),
          shotAt,
          locationId,
          newLocationName,
          styles: selectedStyles,
          comps: selectedComps,
          tags,
          media: newInputs,
          coverIndex,
        });
      }
      navigate('/');
    } finally {
      setIsSaving(false);
    }
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
        {!isEditing && (
          <div className="ml-auto flex rounded-lg border border-gallery-800 p-0.5 text-xs">
            <button
              onClick={() => setBatchMode(false)}
              className={cn(
                'rounded-md px-3 py-1.5',
                !batchMode ? 'bg-gallery-700 text-gallery-100' : 'text-gallery-500 hover:text-gallery-300',
              )}
            >
              单张
            </button>
            <button
              onClick={() => setBatchMode(true)}
              className={cn(
                'rounded-md px-3 py-1.5',
                batchMode ? 'bg-gallery-700 text-gallery-100' : 'text-gallery-500 hover:text-gallery-300',
              )}
            >
              批量导入
            </button>
          </div>
        )}
      </div>

      {batchMode && !isEditing ? <BatchImportPanel /> : (
      <div className="space-y-6">
        {/* Photos */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gallery-300">
            照片 <span className="font-normal text-gallery-600">（可一次多选）</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {mediaItems.map((item, i) => (
              <div key={item.key} className={cn(
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
          {fileErrors.length > 0 && (
            <div className="mt-2 space-y-1">
              {fileErrors.map((err, i) => (
                <p key={i} className="text-xs text-red-400">{err}</p>
              ))}
            </div>
          )}
        </div>

        {/* Title */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gallery-300">
            作品名 <span className="font-normal text-gallery-600">（可选，空则用文件名）</span>
          </label>
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
          <label className="mb-1.5 block text-sm font-medium text-gallery-300">
            私人说明 <span className="font-normal text-gallery-600">（可选）</span>
          </label>
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
            disabled={!canSubmit}
            className="flex-1 rounded-lg bg-gallery-200 py-2.5 text-sm font-medium text-gallery-900 hover:bg-gallery-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? '保存中…' : isEditing ? '保存修改' : '添加作品'}
          </button>
        </div>
      </div>
      )}
    </div>
  );
}
