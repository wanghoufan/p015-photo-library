import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import type {
  WorkWithRelations, ActiveFilters, Location, FacetValue, FacetDimension,
  ViewMode, MediaAsset, Orientation,
} from '@/lib/types';
import { generateDemoWorks, generateDemoLocations, generateDemoFacetValues } from '@/lib/demo-data';
import { applyFilters, createEmptyFilters } from '@/lib/filter-engine';
import { generateId, sortBy } from '@/lib/utils';
import {
  getAllWorks, putWork, getAllLocations, putLocation,
  getAllMedia, putMedia, getMediaByWork, getMediaBlob, putMediaBlob,
  getAllFacetDimensions, putFacetDimension, getAllFacetValues, putFacetValue,
  getAllWorkFacetValues, putWorkFacetValue, getWorkFacetValues,
  getMeta, setMeta,
  deleteWork as idbDeleteWork, deleteMedia as idbDeleteMedia,
  deleteLocation as idbDeleteLocation,
  deleteMediaBlobsByWork, deleteOutboxByEntity, getDB,
} from '@/lib/idb';
import {
  enqueueSave, enqueueDelete, wfvEntityId,
  processOutbox, pullRemote, processPendingUploads,
  getRemoteMediaUrl, refreshPendingCount,
} from '@/lib/sync';
import { onAuthStateChange, currentUserId } from '@/lib/supabase';

export interface NewMediaInput {
  file: File;
  thumbBlob: Blob;
  displayBlob: Blob;
  orientation: Orientation;
  width: number;
  height: number;
}

export interface AddWorkInput {
  title: string;
  privateNote: string;
  shotAt: string;
  locationId: string;
  newLocationName: string;
  styles: string[];
  comps: string[];
  tags: string[];
  media: NewMediaInput[];
  coverIndex: number;
}

export interface EditWorkInput extends AddWorkInput {
  /** 保留的既有媒体 id（不在此列的既有媒体将被删除） */
  keepMediaIds: string[];
}

export interface BatchItemInput {
  file: File;
  thumbBlob: Blob;
  displayBlob: Blob;
  orientation: Orientation;
  width: number;
  height: number;
  title?: string;
  tags?: string[];
  styles?: string[];
  comps?: string[];
  location?: string;
  shotAt?: string;
}

export interface BatchImportResult {
  created: number;
  workIds: string[];
  unmatched: string[];
}

interface WorkContextValue {
  works: WorkWithRelations[];
  filteredWorks: WorkWithRelations[];
  locations: Location[];
  facetValues: FacetValue[];
  facetDimensions: FacetDimension[];
  filters: ActiveFilters;
  setFilters: (filters: ActiveFilters) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  isLoading: boolean;
  uid: string | null;
  addWork: (input: AddWorkInput) => Promise<string>;
  batchImport: (items: BatchItemInput[]) => Promise<BatchImportResult>;
  renameCustomTag: (oldName: string, newName: string) => Promise<void>;
  deleteCustomTag: (name: string) => Promise<void>;
  renameLocationEntry: (id: string, newName: string) => Promise<void>;
  deleteLocationEntry: (id: string) => Promise<void>;
  addLocationEntry: (name: string) => Promise<string | null>;
  addFacetValueItem: (dimensionKey: string, name: string, parentId?: string | null) => Promise<void>;
  renameFacetValue: (id: string, newName: string) => Promise<void>;
  deleteFacetValueItem: (id: string) => Promise<void>;
  updateWorkFull: (id: string, input: EditWorkInput) => Promise<void>;
  updateWork: (id: string, updates: Partial<WorkWithRelations>) => Promise<void>;
  deleteWork: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  getWorkById: (id: string) => WorkWithRelations | undefined;
  clearDemoData: () => Promise<void>;
  syncNow: () => Promise<void>;
}

const WorkContext = createContext<WorkContextValue | null>(null);

export function useWorkStore(): WorkContextValue {
  const ctx = useContext(WorkContext);
  if (!ctx) throw new Error('useWorkStore must be used within WorkProvider');
  return ctx;
}

/** 为分面 key 取中文维度名（种子用） */
function dimensionNameForKey(key: string): string {
  return key === 'style' ? '风格' : key === 'composition' ? '构图' : key;
}

export function WorkProvider({ children }: { children: ReactNode }) {
  const [works, setWorks] = useState<WorkWithRelations[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [facetValues, setFacetValues] = useState<FacetValue[]>([]);
  const [facetDimensions, setFacetDimensions] = useState<FacetDimension[]>([]);
  const [filters, setFilters] = useState<ActiveFilters>(createEmptyFilters());
  const [viewMode, setViewMode] = useState<ViewMode>('masonry');
  const [isLoading, setIsLoading] = useState(true);
  const [uid, setUid] = useState<string | null>(null);
  // 本会话创建的 object URL，reload 前统一回收防泄漏
  const objectUrlsRef = useRef<Set<string>>(new Set());
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      for (const url of objectUrlsRef.current) {
        try { URL.revokeObjectURL(url); } catch { /* ignore */ }
      }
      objectUrlsRef.current.clear();
    };
  }, []);

  const trackUrl = useCallback((url: string): string => {
    if (url.startsWith('blob:')) objectUrlsRef.current.add(url);
    return url;
  }, []);

  /** 从 IDB 重建关系视图（含 blob 重 hydration） */
  const reload = useCallback(async () => {
    const [workRows, locationRows, mediaRows, wfvRows, facetValueRows, facetDimensionRows] = await Promise.all([
      getAllWorks(),
      getAllLocations(),
      getAllMedia(),
      getAllWorkFacetValues(),
      getAllFacetValues(),
      getAllFacetDimensions(),
    ]);

    // blob → object URL（刷新后图片可继续显示）
    const urlByMedia = new Map<string, { display: string; thumb: string }>();
    for (const m of mediaRows) {
      if (m.displayUrl.startsWith('blob:') || m.thumbUrl.startsWith('blob:')) continue;
      if (!m.displayUrl && !m.thumbUrl) {
        const blobs = await getMediaBlob(m.id).catch(() => undefined);
        if (blobs) {
          urlByMedia.set(m.id, {
            display: URL.createObjectURL(blobs.display),
            thumb: URL.createObjectURL(blobs.thumb),
          });
        }
      }
    }

    const locationById = new Map(locationRows.map(l => [l.id, l]));
    const mediaByWork = new Map<string, MediaAsset[]>();
    for (const m of mediaRows) {
      const patched = urlByMedia.get(m.id);
      const withUrl: MediaAsset = patched
        ? { ...m, displayUrl: patched.display, thumbUrl: patched.thumb }
        : m;
      const list = mediaByWork.get(m.workId) ?? [];
      list.push(withUrl);
      mediaByWork.set(m.workId, list);
    }
    for (const list of mediaByWork.values()) {
      list.sort((a, b) => a.sortOrder - b.sortOrder);
    }

    const valueById = new Map(facetValueRows.map(v => [v.id, v]));
    const valuesByWork = new Map<string, FacetValue[]>();
    for (const link of wfvRows) {
      const v = valueById.get(link.facetValueId);
      if (!v) continue;
      const list = valuesByWork.get(link.workId) ?? [];
      list.push(v);
      valuesByWork.set(link.workId, list);
    }

    const relations: WorkWithRelations[] = workRows.map(w => ({
      ...w,
      location: (w.locationId && locationById.get(w.locationId)) || null,
      media: mediaByWork.get(w.id) ?? [],
      facetValues: valuesByWork.get(w.id) ?? [],
      tags: w.tags ?? [],
    }));

    if (!mountedRef.current) return;
    // 回收旧 blob URL，重建追踪
    for (const url of objectUrlsRef.current) {
      try { URL.revokeObjectURL(url); } catch { /* ignore */ }
    }
    objectUrlsRef.current.clear();
    for (const m of mediaRows) {
      if (m.displayUrl.startsWith('blob:')) objectUrlsRef.current.add(m.displayUrl);
      if (m.thumbUrl.startsWith('blob:') && m.thumbUrl !== m.displayUrl) {
        objectUrlsRef.current.add(m.thumbUrl);
      }
    }
    for (const patched of urlByMedia.values()) {
      objectUrlsRef.current.add(patched.display);
      objectUrlsRef.current.add(patched.thumb);
    }

    setWorks(sortBy(relations, w => w.shotAt, true));
    setLocations(sortBy(locationRows, l => l.name, false));
    setFacetValues(facetValueRows);
    setFacetDimensions(facetDimensionRows);
    setIsLoading(false);

    // 远端媒体（无本地 blob）：按需取 signedUrl 补到内存态（不写 IDB，URL 会过期）
    void hydrateRemoteUrls(mediaRows);
  }, []);

  /** 远端 signedUrl 补水（仅内存态） */
  const hydrateRemoteUrls = useCallback(async (mediaRows: MediaAsset[]) => {
    const missing = mediaRows.filter(
      m => !m.isDemo && !m.displayUrl && !m.thumbUrl && (m.displayPath || m.thumbPath),
    );
    if (missing.length === 0) return;
    let changed = false;
    const patches = new Map<string, { displayUrl: string; thumbUrl: string }>();
    for (const m of missing) {
      const [displayUrl, thumbUrl] = await Promise.all([
        getRemoteMediaUrl(m, 'display'),
        getRemoteMediaUrl(m, 'thumb'),
      ]);
      if (displayUrl || thumbUrl) {
        patches.set(m.id, { displayUrl: displayUrl ?? '', thumbUrl: thumbUrl ?? '' });
        changed = true;
      }
    }
    if (changed && mountedRef.current) {
      setWorks(prev => prev.map(w => ({
        ...w,
        media: w.media.map(m => {
          const p = patches.get(m.id);
          return p ? { ...m, ...p } : m;
        }),
      })));
    }
  }, []);

  const syncNow = useCallback(async () => {
    await processPendingUploads().catch(() => undefined);
    await pullRemote().catch(() => undefined);
    await processOutbox().catch(() => undefined);
    await refreshPendingCount().catch(() => undefined);
    await reload();
  }, [reload]);

  // 启动：种子演示数据（一次）→ 加载；登录态联动同步
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const seeded = await getMeta('demo_seeded').catch(() => null);
      if (!seeded) {
        await seedDemoData();
        await setMeta('demo_seeded', 'true').catch(() => undefined);
      }
      if (!cancelled) {
        await reload();
        await refreshPendingCount().catch(() => undefined);
      }
    })();
    const unsubscribeAuth = onAuthStateChange(nextUid => {
      setUid(nextUid);
      if (nextUid) {
        void syncNow();
      }
    });
    currentUserId().then(setUid).catch(() => undefined);
    return () => {
      cancelled = true;
      unsubscribeAuth();
    };
  }, [reload, syncNow]);

  const filteredWorks = applyFilters(works, filters);

  /** 确保用户自有维度/值行存在（demo 行不复用），返回值 id 表。
   * demoMode：只复用同名 demo 行，不建行、不入队。 */
  const ensureFacetRows = useCallback(async (
    owner: string, dimensionKey: string, names: string[],
    demoMode = false,
  ): Promise<string[]> => {
    const ids: string[] = [];
    if (names.length === 0) return ids;
    const dims = await getAllFacetDimensions();
    const allValues = await getAllFacetValues();
    if (demoMode) {
      const dim = dims.find(d => d.key === dimensionKey && d.isDemo)
        ?? dims.find(d => d.key === dimensionKey);
      if (!dim) return ids;
      for (const name of names) {
        const found = allValues.find(v => v.dimensionId === dim.id && v.name === name);
        if (found) ids.push(found.id);
      }
      return ids;
    }
    let dim = dims.find(d => d.key === dimensionKey && d.owner_user_id === owner && !d.isDemo);
    if (!dim) {
      const now = new Date().toISOString();
      dim = {
        id: generateId(),
        key: dimensionKey,
        name: dimensionNameForKey(dimensionKey),
        sortOrder: 0,
        selectionMode: 'multi',
        owner_user_id: owner,
        revision: 1,
        syncStatus: 'local',
        isDemo: false,
        createdAt: now,
        updatedAt: now,
      };
      await putFacetDimension(dim);
      await enqueueSave('facet_dimension', dim.id, null);
    }
    const values = await getAllFacetValues();
    for (const name of names) {
      const found = values.find(
        v => v.dimensionId === dim.id && v.name === name && v.owner_user_id === owner && !v.isDemo,
      );
      if (found) {
        ids.push(found.id);
        continue;
      }
      const now = new Date().toISOString();
      const value: FacetValue = {
        id: generateId(),
        dimensionId: dim.id,
        parentId: null,
        name,
        sortOrder: 0,
        owner_user_id: owner,
        revision: 1,
        syncStatus: 'local',
        isDemo: false,
        createdAt: now,
        updatedAt: now,
      };
      await putFacetValue(value);
      await enqueueSave('facet_value', value.id, null);
      ids.push(value.id);
    }
    return ids;
  }, []);

  /** 同步某作品的分面关联（删建语义） */
  const syncWorkFacets = useCallback(async (
    workId: string, styles: string[], comps: string[], owner: string,
    demoMode = false,
  ): Promise<FacetValue[]> => {
    const styleIds = await ensureFacetRows(owner, 'style', styles, demoMode);
    const compIds = await ensureFacetRows(owner, 'composition', comps, demoMode);
    const desired = new Set([...styleIds, ...compIds]);
    const existing = await getAllWorkFacetValues();
    const current = existing.filter(l => l.workId === workId);
    const db = await getDB();
    for (const link of current) {
      if (!desired.has(link.facetValueId)) {
        await db.delete('work_facet_values', [workId, link.facetValueId]);
        if (!demoMode) {
          await enqueueDelete('work_facet_value', wfvEntityId(workId, link.facetValueId));
        }
      }
    }
    for (const valueId of desired) {
      if (!current.some(l => l.facetValueId === valueId)) {
        await putWorkFacetValue({ workId, facetValueId: valueId });
        if (!demoMode) {
          await enqueueSave('work_facet_value', wfvEntityId(workId, valueId), null);
        }
      }
    }
    const allValues = await getAllFacetValues();
    return allValues.filter(v => desired.has(v.id));
  }, []);

  /** 解析生效地点：沿用已有 id，或按新名称建行（demoMode 下建 demo 行、不入队） */
  const resolveLocation = useCallback(async (
    locationId: string, newLocationName: string, owner: string,
    demoMode = false,
  ): Promise<string> => {
    if (locationId) return locationId;
    const name = newLocationName.trim();
    if (!name) return '';
    const now = new Date().toISOString();
    const location: Location = {
      id: generateId(),
      name,
      country: '',
      province: '',
      city: '',
      area: '',
      revision: 1,
      syncStatus: demoMode ? 'synced' : 'local',
      isDemo: demoMode,
      createdAt: now,
      updatedAt: now,
    };
    await putLocation(location);
    if (!demoMode) {
      await enqueueSave('location', location.id, null);
    }
    return location.id;
  }, []);

  /** 新作品落盘核心（单作品；批量导入循环调用） */
  const persistNewWork = useCallback(async (args: {
    title: string; privateNote: string; shotAt: string; locationId: string;
    styles: string[]; comps: string[]; tags: string[];
    media: NewMediaInput[]; coverIndex: number; owner: string;
  }): Promise<string> => {
    const id = generateId();
    const now = new Date().toISOString();
    const mediaIds = args.media.map(() => generateId());
    const coverMediaId = mediaIds.length > 0 ? mediaIds[Math.min(args.coverIndex, mediaIds.length - 1)] : null;

    await putWork({
      id,
      title: args.title,
      privateNote: args.privateNote,
      shotAt: args.shotAt,
      locationId: args.locationId,
      coverMediaId,
      isFavorite: false,
      mediaCount: mediaIds.length,
      tags: args.tags,
      revision: 1,
      syncStatus: 'local',
      isDemo: false,
      createdAt: now,
      updatedAt: now,
    });
    await enqueueSave('work', id, null);

    // 媒体行 + blob（uploadStatus pending，登录后由 processPendingUploads 上传并入队）
    for (let i = 0; i < args.media.length; i++) {
      const item = args.media[i];
      const mediaId = mediaIds[i];
      await putMediaBlob({ id: mediaId, thumb: item.thumbBlob, display: item.displayBlob });
      await putMedia({
        id: mediaId,
        workId: id,
        displayUrl: trackUrl(URL.createObjectURL(item.displayBlob)),
        thumbUrl: trackUrl(URL.createObjectURL(item.thumbBlob)),
        mimeType: 'image/webp',
        byteSize: item.file.size,
        width: item.width,
        height: item.height,
        orientation: item.orientation,
        sortOrder: i,
        uploadStatus: 'pending',
        displayPath: null,
        thumbPath: null,
        syncStatus: 'local',
        revision: 1,
        isDemo: false,
        createdAt: now,
        updatedAt: now,
      });
    }

    await syncWorkFacets(id, args.styles, args.comps, args.owner);
    return id;
  }, [syncWorkFacets, trackUrl]);

  const addWork = useCallback(async (input: AddWorkInput): Promise<string> => {
    const owner = (await currentUserId().catch(() => null)) ?? 'local';
    const effectiveLocationId = await resolveLocation(input.locationId, input.newLocationName, owner);
    const id =     await persistNewWork({
      title: input.title.trim(),
      privateNote: input.privateNote.trim(),
      shotAt: input.shotAt,
      locationId: effectiveLocationId,
      styles: input.styles,
      comps: input.comps,
      tags: input.tags,
      media: input.media,
      coverIndex: input.coverIndex,
      owner,
    });
    await reload();
    void syncNow();
    return id;
  }, [reload, resolveLocation, syncNow, syncWorkFacets, trackUrl, persistNewWork]);

  /** 新增空壳地点（标签页/批量导入用；重名去重） */
  const addLocationEntry = useCallback(async (name: string): Promise<string | null> => {
    const clean = name.trim();
    if (!clean) return null;
    const rows = await getAllLocations();
    const dup = rows.find(l => l.name === clean && !l.isDemo);
    if (dup) return dup.id;
    const now = new Date().toISOString();
    const location: Location = {
      id: generateId(),
      name: clean,
      country: '',
      province: '',
      city: '',
      area: '',
      revision: 1,
      syncStatus: 'local',
      isDemo: false,
      createdAt: now,
      updatedAt: now,
    };
    await putLocation(location);
    await enqueueSave('location', location.id, null);
    await reload();
    void syncNow();
    return location.id;
  }, [reload, syncNow]);

  /** 批量导入：一图一作品（AI 标签映射后的逐行） */
  const batchImport = useCallback(async (items: BatchItemInput[]): Promise<BatchImportResult> => {
    const owner = (await currentUserId().catch(() => null)) ?? 'local';
    const today = new Date().toISOString().split('T')[0];
    const workIds: string[] = [];
    for (const item of items) {
      const locationId = item.location?.trim()
        ? (await addLocationEntry(item.location.trim())) ?? ''
        : '';
      const base = item.file.name.replace(/\.[^.]+$/, '').trim();
      const workId = await persistNewWork({
        title: item.title?.trim() || base || '未命名作品',
        privateNote: '',
        shotAt: item.shotAt || today,
        locationId,
        styles: item.styles ?? [],
        comps: item.comps ?? [],
        tags: item.tags ?? [],
        media: [{
          file: item.file,
          thumbBlob: item.thumbBlob,
          displayBlob: item.displayBlob,
          orientation: item.orientation,
          width: item.width,
          height: item.height,
        }],
        coverIndex: 0,
        owner,
      });
      workIds.push(workId);
    }
    await reload();
    void syncNow();
    return { created: workIds.length, workIds, unmatched: [] };
  }, [persistNewWork, reload, addLocationEntry, syncNow]);

  /** 编辑：标量 + 地点 + 分面 + 媒体（保留/新增/删除）全量落盘。
   * 演示行走本地通道：不 bump revision、不入队。 */
  const updateWorkFull = useCallback(async (id: string, input: EditWorkInput): Promise<void> => {
    const owner = (await currentUserId().catch(() => null)) ?? 'local';
    const rows = await getAllWorks();
    const existing = rows.find(w => w.id === id);
    if (!existing) return;
    const demoMode = existing.isDemo;
    const now = new Date().toISOString();
    const effectiveLocationId = await resolveLocation(input.locationId, input.newLocationName, owner, demoMode);

    // 媒体：删除未保留的，追加新增的
    const currentMedia = await getMediaByWork(id);
    const keepSet = new Set(input.keepMediaIds);
    for (const m of currentMedia) {
      if (!keepSet.has(m.id)) {
        await idbDeleteMedia(m.id);
        if (!demoMode) {
          await deleteOutboxByEntity(m.id);
          await enqueueDelete('media', m.id);
        }
      }
    }
    const keptSorted = currentMedia
      .filter(m => keepSet.has(m.id))
      .sort((a, b) => a.sortOrder - b.sortOrder);
    let order = 0;
    for (const m of keptSorted) {
      if (m.sortOrder !== order) {
        await putMedia({ ...m, sortOrder: order, updatedAt: now });
      }
      order++;
    }
    const newIds: string[] = [];
    for (const item of input.media) {
      const mediaId = generateId();
      newIds.push(mediaId);
      await putMediaBlob({ id: mediaId, thumb: item.thumbBlob, display: item.displayBlob });
      await putMedia({
        id: mediaId,
        workId: id,
        displayUrl: trackUrl(URL.createObjectURL(item.displayBlob)),
        thumbUrl: trackUrl(URL.createObjectURL(item.thumbBlob)),
        mimeType: 'image/webp',
        byteSize: item.file.size,
        width: item.width,
        height: item.height,
        orientation: item.orientation,
        sortOrder: order++,
        uploadStatus: demoMode ? 'uploaded' : 'pending',
        displayPath: null,
        thumbPath: null,
        syncStatus: demoMode ? 'synced' : 'local',
        revision: 1,
        isDemo: demoMode,
        createdAt: now,
        updatedAt: now,
      });
    }
    const allKeptIds = [...keptSorted.map(m => m.id), ...newIds];
    const coverMediaId = allKeptIds.length > 0
      ? allKeptIds[Math.min(input.coverIndex, allKeptIds.length - 1)]
      : null;

    const nextRevision = demoMode ? existing.revision : existing.revision + 1;
    await putWork({
      ...existing,
      title: input.title.trim(),
      privateNote: input.privateNote.trim(),
      shotAt: input.shotAt,
      locationId: effectiveLocationId,
      coverMediaId,
      mediaCount: allKeptIds.length,
      tags: input.tags,
      revision: nextRevision,
      syncStatus: demoMode ? 'synced' : 'local',
      updatedAt: now,
    });
    if (!demoMode) {
      await enqueueSave('work', id, existing.baseRevision ?? null);
    }

    await syncWorkFacets(id, input.styles, input.comps, owner, demoMode);
    await reload();
    void syncNow();
  }, [reload, resolveLocation, syncNow, syncWorkFacets, trackUrl]);

  /** 轻量标量更新（收藏等）；演示行走本地通道 */
  const updateWork = useCallback(async (id: string, updates: Partial<WorkWithRelations>): Promise<void> => {
    const rows = await getAllWorks();
    const existing = rows.find(w => w.id === id);
    if (!existing) return;
    const demoMode = existing.isDemo;
    const allowed: Partial<WorkWithRelations> = {};
    if (updates.title !== undefined) allowed.title = updates.title;
    if (updates.privateNote !== undefined) allowed.privateNote = updates.privateNote;
    if (updates.shotAt !== undefined) allowed.shotAt = updates.shotAt;
    if (updates.locationId !== undefined) allowed.locationId = updates.locationId;
    if (updates.isFavorite !== undefined) allowed.isFavorite = updates.isFavorite;
    if (updates.tags !== undefined) allowed.tags = updates.tags;
    await putWork({
      ...existing,
      ...allowed,
      revision: demoMode ? existing.revision : existing.revision + 1,
      syncStatus: demoMode ? 'synced' : 'local',
      updatedAt: new Date().toISOString(),
    });
    if (!demoMode) {
      await enqueueSave('work', id, existing.baseRevision ?? null);
    }
    await reload();
    void syncNow();
  }, [reload, syncNow]);

  const deleteWork = useCallback(async (id: string): Promise<void> => {
    const rows = await getAllWorks();
    const existing = rows.find(w => w.id === id);
    if (!existing) return;
    if (existing.isDemo) {
      // 演示数据只删本地，不入队
      const mediaList = await getMediaByWork(id);
      await idbDeleteWork(id);
      await deleteMediaBlobsByWork(id).catch(() => undefined);
      for (const m of mediaList) {
        await deleteOutboxByEntity(m.id);
      }
      await reload();
      return;
    }
    const mediaList = await getMediaByWork(id);
    const links = await getWorkFacetValues(id);
    await idbDeleteWork(id);
    await deleteMediaBlobsByWork(id).catch(() => undefined);
    // 丢弃子行的排队项（远端级联删除覆盖它们），只保留作品删除
    for (const m of mediaList) {
      await deleteOutboxByEntity(m.id);
    }
    for (const link of links) {
      await deleteOutboxByEntity(wfvEntityId(id, link.facetValueId));
    }
    await enqueueDelete('work', id);
    await reload();
    void syncNow();
  }, [reload, syncNow]);

  const toggleFavorite = useCallback(async (id: string): Promise<void> => {
    const found = works.find(w => w.id === id);
    if (!found) return;
    await updateWork(id, { isFavorite: !found.isFavorite });
  }, [works, updateWork]);

  const getWorkById = useCallback((id: string) => {
    return works.find(w => w.id === id);
  }, [works]);

  /** 自定义标签改名：全量作品替换（演示行走本地通道） */
  const renameCustomTag = useCallback(async (oldName: string, newName: string): Promise<void> => {
    const from = oldName.trim();
    const to = newName.trim();
    if (!from || !to || from === to) return;
    const rows = await getAllWorks();
    for (const w of rows) {
      if (!w.tags.includes(from)) continue;
      if (w.isDemo) {
        await putWork({ ...w, tags: w.tags.map(t => t === from ? to : t), updatedAt: new Date().toISOString() });
      } else {
        await putWork({
          ...w,
          tags: w.tags.map(t => t === from ? to : t),
          revision: w.revision + 1,
          syncStatus: 'local',
          updatedAt: new Date().toISOString(),
        });
        await enqueueSave('work', w.id, w.baseRevision ?? null);
      }
    }
    await reload();
    void syncNow();
  }, [reload, syncNow]);

  /** 自定义标签删除：从全量作品移除引用，作品本身保留 */
  const deleteCustomTag = useCallback(async (name: string): Promise<void> => {
    const target = name.trim();
    if (!target) return;
    const rows = await getAllWorks();
    for (const w of rows) {
      if (!w.tags.includes(target)) continue;
      if (w.isDemo) {
        await putWork({ ...w, tags: w.tags.filter(t => t !== target), updatedAt: new Date().toISOString() });
      } else {
        await putWork({
          ...w,
          tags: w.tags.filter(t => t !== target),
          revision: w.revision + 1,
          syncStatus: 'local',
          updatedAt: new Date().toISOString(),
        });
        await enqueueSave('work', w.id, w.baseRevision ?? null);
      }
    }
    await reload();
    void syncNow();
  }, [reload, syncNow]);

  const renameLocationEntry = useCallback(async (id: string, newName: string): Promise<void> => {
    const name = newName.trim();
    if (!name) return;
    const rows = await getAllLocations();
    const existing = rows.find(l => l.id === id);
    if (!existing || existing.name === name) return;
    if (existing.isDemo) {
      await putLocation({ ...existing, name, updatedAt: new Date().toISOString() });
    } else {
      await putLocation({
        ...existing,
        name,
        revision: existing.revision + 1,
        syncStatus: 'local',
        updatedAt: new Date().toISOString(),
      });
      await enqueueSave('location', id, existing.baseRevision ?? null);
    }
    await reload();
    void syncNow();
  }, [reload, syncNow]);

  /** 删除地点：引用它的作品 locationId 清空（作品保留），地点行删除 */
  const deleteLocationEntry = useCallback(async (id: string): Promise<void> => {
    const rows = await getAllWorks();
    for (const w of rows) {
      if (w.locationId !== id) continue;
      if (w.isDemo) {
        await putWork({ ...w, locationId: '', updatedAt: new Date().toISOString() });
      } else {
        await putWork({
          ...w,
          locationId: '',
          revision: w.revision + 1,
          syncStatus: 'local',
          updatedAt: new Date().toISOString(),
        });
        await enqueueSave('work', w.id, w.baseRevision ?? null);
      }
    }
    const locs = await getAllLocations();
    const existing = locs.find(l => l.id === id);
    if (existing && !existing.isDemo) {
      await deleteOutboxByEntity(id);
      await enqueueDelete('location', id);
    }
    await idbDeleteLocation(id);
    await reload();
    void syncNow();
  }, [reload, syncNow]);

  /** 新增分面值（支持子标签 parentId；同维度同名去重） */
  const addFacetValueItem = useCallback(async (
    dimensionKey: string, name: string, parentId: string | null = null,
  ): Promise<void> => {
    const clean = name.trim();
    if (!clean) return;
    const owner = (await currentUserId().catch(() => null)) ?? 'local';
    const dims = await getAllFacetDimensions();
    let dim = dims.find(d => d.key === dimensionKey && d.owner_user_id === owner && !d.isDemo);
    if (!dim) {
      const now = new Date().toISOString();
      dim = {
        id: generateId(),
        key: dimensionKey,
        name: dimensionNameForKey(dimensionKey),
        sortOrder: 0,
        selectionMode: 'multi',
        owner_user_id: owner,
        revision: 1,
        syncStatus: 'local',
        isDemo: false,
        createdAt: now,
        updatedAt: now,
      };
      await putFacetDimension(dim);
      await enqueueSave('facet_dimension', dim.id, null);
    }
    const values = await getAllFacetValues();
    const dup = values.find(
      v => v.dimensionId === dim.id && v.name === clean && (v.parentId ?? null) === (parentId ?? null) && !v.isDemo,
    );
    if (dup) return;
    const now = new Date().toISOString();
    const value: FacetValue = {
      id: generateId(),
      dimensionId: dim.id,
      parentId: parentId ?? null,
      name: clean,
      sortOrder: 0,
      owner_user_id: owner,
      revision: 1,
      syncStatus: 'local',
      isDemo: false,
      createdAt: now,
      updatedAt: now,
    };
    await putFacetValue(value);
    await enqueueSave('facet_value', value.id, null);
    await reload();
    void syncNow();
  }, [reload, syncNow]);

  const renameFacetValue = useCallback(async (id: string, newName: string): Promise<void> => {
    const name = newName.trim();
    if (!name) return;
    const values = await getAllFacetValues();
    const existing = values.find(v => v.id === id);
    if (!existing || existing.name === name) return;
    if (existing.isDemo) {
      await putFacetValue({ ...existing, name, updatedAt: new Date().toISOString() });
    } else {
      await putFacetValue({
        ...existing,
        name,
        revision: (existing.revision ?? 1) + 1,
        syncStatus: 'local',
        updatedAt: new Date().toISOString(),
      });
      await enqueueSave('facet_value', id, existing.baseRevision ?? null);
    }
    await reload();
    void syncNow();
  }, [reload, syncNow]);

  /** 删除分面值：子标签级联先删；作品引用一并移除（作品保留） */
  const deleteFacetValueItem = useCallback(async (id: string): Promise<void> => {
    const values = await getAllFacetValues();
    const byId = new Map(values.map(v => [v.id, v]));
    // 收集含子孙的删除集合，子在前
    const collect = (vid: string, acc: string[]) => {
      for (const v of values) {
        if (v.parentId === vid) collect(v.id, acc);
      }
      acc.push(vid);
    };
    const ordered: string[] = [];
    collect(id, ordered);
    const db = await getDB();
    for (const vid of ordered) {
      const target = byId.get(vid);
      if (!target) continue;
      // 移除作品引用
      const links = (await getAllWorkFacetValues()).filter(l => l.facetValueId === vid);
      for (const link of links) {
        await db.delete('work_facet_values', [link.workId, link.facetValueId]);
        if (!target.isDemo) {
          await enqueueDelete('work_facet_value', wfvEntityId(link.workId, link.facetValueId));
        }
      }
      if (!target.isDemo) {
        await deleteOutboxByEntity(vid);
        await enqueueDelete('facet_value', vid);
      }
      await db.delete('facet_values', vid);
    }
    await reload();
    void syncNow();
  }, [reload, syncNow]);

  const clearDemoData = useCallback(async (): Promise<void> => {
    const rows = await getAllWorks();
    for (const w of rows) {
      if (!w.isDemo) continue;
      const mediaList = await getMediaByWork(w.id);
      await idbDeleteWork(w.id);
      for (const m of mediaList) {
        await idbDeleteMedia(m.id).catch(() => undefined);
      }
    }
    await reload();
  }, [reload]);

  return (
    <WorkContext.Provider value={{
      works,
      filteredWorks,
      locations,
      facetValues,
      facetDimensions,
      filters,
      setFilters,
      viewMode,
      setViewMode,
      isLoading,
      uid,
      addWork,
      batchImport,
      renameCustomTag,
      deleteCustomTag,
      renameLocationEntry,
      deleteLocationEntry,
      addLocationEntry,
      addFacetValueItem,
      renameFacetValue,
      deleteFacetValueItem,
      updateWorkFull,
      updateWork,
      deleteWork,
      toggleFavorite,
      getWorkById,
      clearDemoData,
      syncNow,
    }}>
      {children}
    </WorkContext.Provider>
  );
}

/** 演示数据种子（一次）：拆分为 IDB 行，isDemo 永不上云 */
async function seedDemoData(): Promise<void> {
  const now = new Date().toISOString();

  const demoLocations = generateDemoLocations();
  for (const loc of demoLocations) {
    await putLocation(loc);
  }

  // 维度种子（id 取 key，呼应 demo-data 以 dimensionId='style' 引用的惯例）
  for (const [key, name] of [['style', '风格'], ['composition', '构图']] as Array<[string, string]>) {
    const dim: FacetDimension = {
      id: key,
      key,
      name,
      sortOrder: 0,
      selectionMode: 'multi',
      owner_user_id: '',
      revision: 1,
      syncStatus: 'synced',
      isDemo: true,
      createdAt: now,
      updatedAt: now,
    };
    await putFacetDimension(dim);
  }

  const demoValues = generateDemoFacetValues();
  for (const v of demoValues) {
    await putFacetValue({ ...v, owner_user_id: '', syncStatus: 'synced', isDemo: true });
  }

  const demoWorks = generateDemoWorks();
  for (const w of demoWorks) {
    const { media, facetValues: values, ...rest } = w;
    const { location: _omit, ...work } = rest;
    void _omit;
    await putWork(work);
    for (const m of media) {
      await putMedia({ ...m, syncStatus: 'synced', isDemo: true });
    }
    for (const v of values) {
      await putWorkFacetValue({ workId: w.id, facetValueId: v.id });
    }
  }
}
