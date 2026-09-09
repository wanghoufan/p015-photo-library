// 同步引擎：本地 outbox → Supabase（M2 接线版）
// 参考 place-journal 的成熟模式：revision 乐观锁、冲突处理、pullRemote 保护。
//
// M2 写入纪律（与 Migration 头部约定一致）：
// - CREATE：行内容推送时从本地 IDB 现读现组装（camelCase→snake_case），并注入
//   owner_user_id = 当前登录用户；outbox 只存最小意图，不快照整行。
// - UPDATE：剥离 baseRevision/syncStatus/isDemo 等非 DB 列，SET revision = base+1，
//   WHERE id + revision = base；返回 0 行即冲突（展示，不静默覆盖）。
// - work_facet_value：无 revision 列，只走删建语义，不许 eq revision。
// - 未登录：只排队不推送（processOutbox/pullRemote 在无 uid 时直接返回）。
import { isSupabaseConfigured, getSupabaseClient, table, currentUserId } from './supabase';
import {
  getAllOutboxEntries, putOutboxEntry, deleteOutboxEntry,
  getAllWorks, putWork, getAllLocations, putLocation, getAllMedia, putMedia,
  getAllFacetDimensions, putFacetDimension, getAllFacetValues, putFacetValue,
  getAllWorkFacetValues, putWorkFacetValue,
  getMediaBlob, getDB,
} from './idb';
import type { OutboxEntry, Work, Location, MediaAsset, FacetDimension, FacetValue } from './types';
import { generateId } from './utils';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  lastErrorMessage: string | null;
  conflictCount: number;
}

export type CloudState = 'unconfigured' | 'offline' | 'signed-out' | 'syncing' | 'idle' | 'error';

let syncState: SyncState = {
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isSyncing: false,
  pendingCount: 0,
  lastSuccessAt: null,
  lastErrorAt: null,
  lastErrorMessage: null,
  conflictCount: 0,
};

type SyncStateListener = (state: SyncState) => void;
const listeners = new Set<SyncStateListener>();

export function subscribeSyncState(listener: SyncStateListener): () => void {
  listeners.add(listener);
  listener(syncState);
  return () => listeners.delete(listener);
}

export function getSyncState(): SyncState {
  return { ...syncState };
}

function notifyListeners() {
  for (const listener of listeners) {
    listener({ ...syncState });
  }
}

function updateSyncState(partial: Partial<SyncState>) {
  syncState = { ...syncState, ...partial };
  notifyListeners();
}

export async function refreshPendingCount(): Promise<void> {
  const entries = await getAllOutboxEntries();
  updateSyncState({ pendingCount: entries.length });
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    updateSyncState({ isOnline: true });
    void processOutbox();
  });

  window.addEventListener('offline', () => {
    updateSyncState({ isOnline: false });
  });
}

// ---- 冲突记录 ----
export interface ConflictRecord {
  id: string;
  kind: 'work' | 'location' | 'media';
  expected: number;
  remote: unknown | null;
  at: string;
}

const conflicts: Map<string, ConflictRecord> = new Map();

export function listConflicts(): ConflictRecord[] {
  return Array.from(conflicts.values());
}

export function clearConflict(id: string): void {
  conflicts.delete(id);
  updateSyncState({ conflictCount: conflicts.size });
}

function registerConflict(kind: ConflictRecord['kind'], id: string, expected: number, remote: unknown | null): void {
  conflicts.set(id, {
    id,
    kind,
    expected,
    remote,
    at: new Date().toISOString(),
  });
  updateSyncState({ conflictCount: conflicts.size });
}

// ---- 远端媒体 URL 缓存 ----
const remoteUrlCache = new Map<string, { url: string; expires: number }>();
const remoteUrlInflight = new Map<string, Promise<string | undefined>>();

export function remoteMediaUrl(mediaId?: string): string | undefined {
  if (!mediaId) return undefined;
  const entry = remoteUrlCache.get(mediaId);
  if (!entry) return undefined;
  if (Date.now() > entry.expires) {
    remoteUrlCache.delete(mediaId);
    return undefined;
  }
  return entry.url;
}

export async function getRemoteMediaUrl(
  media: { id: string; displayPath?: string | null; thumbPath?: string | null },
  kind: 'thumb' | 'display' = 'thumb',
): Promise<string | undefined> {
  const cacheKey = `${media.id}:${kind}`;
  const cached = remoteUrlCache.get(cacheKey);
  if (cached && Date.now() < cached.expires) return cached.url;

  const inflight = remoteUrlInflight.get(cacheKey);
  if (inflight) return inflight;

  const promise = (async () => {
    try {
      const path = kind === 'thumb'
        ? (media.thumbPath ?? media.displayPath)
        : (media.displayPath ?? media.thumbPath);
      if (!path) return undefined;

      const client = getSupabaseClient();
      if (!client) return undefined;

      const { data } = await client.storage
        .from('photo-library-media-private')
        .createSignedUrl(path, 3600);

      const url = data?.signedUrl;
      if (url) {
        remoteUrlCache.set(cacheKey, { url, expires: Date.now() + 50 * 60 * 1000 });
      }
      return url;
    } catch {
      return undefined;
    } finally {
      remoteUrlInflight.delete(cacheKey);
    }
  })();

  remoteUrlInflight.set(cacheKey, promise);
  return promise;
}

// ---- Storage 上传（路径强制 <uid>/ 开头，与 0002 policy 对齐） ----
export const MEDIA_BUCKET = 'photo-library-media-private';

export function mediaObjectPath(ownerId: string, workId: string, mediaId: string, kind: 'display' | 'thumb'): string {
  return `${ownerId}/${workId}/${mediaId}/${kind}.webp`;
}

async function uploadOneBlob(
  client: SupabaseClient,
  path: string,
  blob: Blob,
): Promise<void> {
  const { error } = await client.storage
    .from(MEDIA_BUCKET)
    .upload(path, blob, { contentType: 'image/webp', upsert: true });
  if (error) throw new Error(error.message);
}

/** 上传单个媒体的两份 blob，成功后回写 path 并返回（调用方负责 putMedia + 入队）。 */
export async function uploadMediaBlobs(
  ownerId: string,
  media: MediaAsset,
): Promise<{ displayPath: string; thumbPath: string }> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase not configured');
  const stored = await getMediaBlob(media.id);
  if (!stored) throw new Error(`missing local blob for media ${media.id}`);
  const displayPath = mediaObjectPath(ownerId, media.workId, media.id, 'display');
  const thumbPath = mediaObjectPath(ownerId, media.workId, media.id, 'thumb');
  await uploadOneBlob(client, displayPath, stored.display);
  await uploadOneBlob(client, thumbPath, stored.thumb);
  return { displayPath, thumbPath };
}

// ---- Cloud State ----
export async function getCloudState(): Promise<CloudState> {
  if (!isSupabaseConfigured()) return 'unconfigured';
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 'offline';
  const uid = await currentUserId().catch(() => null);
  if (!uid) return 'signed-out';
  return syncState.isSyncing ? 'syncing' : 'idle';
}

// ---- 行组装：本地 camelCase → DB snake_case（字段映射表见送审 映射表.md） ----
function toWorkRow(work: Work, ownerId: string) {
  return {
    id: work.id,
    owner_user_id: ownerId,
    title: work.title,
    private_note: work.privateNote ?? '',
    tags: work.tags ?? [],
    shot_at: work.shotAt || null,
    location_id: work.locationId || null,
    cover_media_id: work.coverMediaId ?? null,
    is_favorite: work.isFavorite ?? false,
    revision: work.revision,
  };
}

function toLocationRow(location: Location, ownerId: string) {
  return {
    id: location.id,
    owner_user_id: ownerId,
    name: location.name,
    country: location.country ?? '',
    province: location.province ?? '',
    city: location.city ?? '',
    area: location.area ?? '',
    revision: location.revision,
  };
}

function toMediaRow(media: MediaAsset, ownerId: string) {
  return {
    id: media.id,
    owner_user_id: ownerId,
    work_id: media.workId,
    display_path: media.displayPath ?? null,
    thumb_path: media.thumbPath ?? null,
    mime_type: media.mimeType,
    byte_size: media.byteSize ?? null,
    width: media.width ?? null,
    height: media.height ?? null,
    orientation: media.orientation,
    sort_order: media.sortOrder ?? 0,
    upload_status: media.uploadStatus ?? 'pending',
    revision: media.revision ?? 1,
  };
}

function toDimensionRow(dim: FacetDimension, ownerId: string) {
  return {
    id: dim.id,
    owner_user_id: ownerId,
    key: dim.key,
    name: dim.name,
    sort_order: dim.sortOrder ?? 0,
    selection_mode: dim.selectionMode ?? 'multi',
    revision: dim.revision ?? 1,
  };
}

function toValueRow(value: FacetValue, ownerId: string) {
  return {
    id: value.id,
    owner_user_id: ownerId,
    dimension_id: value.dimensionId,
    parent_id: value.parentId ?? null,
    name: value.name,
    sort_order: value.sortOrder ?? 0,
    revision: value.revision ?? 1,
  };
}

function toWorkFacetRow(ownerId: string, workId: string, facetValueId: string) {
  return {
    owner_user_id: ownerId,
    work_id: workId,
    facet_value_id: facetValueId,
  };
}

/** wfv 的 outbox entityId 格式：workId|facetValueId（uuid 无竖线，安全分隔） */
export function wfvEntityId(workId: string, facetValueId: string): string {
  return `${workId}|${facetValueId}`;
}

export function parseWfvEntityId(entityId: string): { workId: string; facetValueId: string } {
  const idx = entityId.indexOf('|');
  return { workId: entityId.slice(0, idx), facetValueId: entityId.slice(idx + 1) };
}

// ---- Outbox 处理 ----
export async function enqueueOutbox(
  operation: OutboxEntry['operation'],
  entityType: OutboxEntry['entityType'],
  entityId: string,
  payload: unknown = {},
): Promise<void> {
  const entry: OutboxEntry = {
    id: generateId(),
    operation,
    entityType,
    entityId,
    payload,
    retryCount: 0,
    lastError: null,
    createdAt: new Date().toISOString(),
    processingAt: null,
  };
  await putOutboxEntry(entry);
  await refreshPendingCount();

  if (syncState.isOnline && !syncState.isSyncing) {
    void processOutbox();
  }
}

/**
 * 合并式入队（create/update）：同一实体的旧排队项会被新意图取代后删除，
 * 因为行内容推送时现读现组装，只有 baseRevision 需要最新。
 * - baseRevision == null → create（去重：已有 create 排队则复用）。
 * - 已有 delete 排队 → 新写入无效，直接返回（删除胜出）。
 */
export async function enqueueSave(
  entityType: OutboxEntry['entityType'],
  entityId: string,
  baseRevision?: number | null,
): Promise<void> {
  const entries = await getAllOutboxEntries();
  const pending = entries.filter(
    e => e.entityType === entityType && e.entityId === entityId && !e.processingAt,
  );
  if (pending.some(e => e.operation === 'delete')) return;
  const op = baseRevision == null ? 'create' : 'update';
  const sameOp = pending.filter(e => e.operation === op);
  if (op === 'create' && sameOp.length > 0) return; // 复用已有 create（内容现读最新）
  for (const e of pending) {
    await deleteOutboxEntry(e.id);
  }
  await enqueueOutbox(op, entityType, entityId, op === 'update' ? { baseRevision } : {});
}

/** 删除意图：先丢弃同实体的 create/update 排队项，再记 delete。 */
export async function enqueueDelete(
  entityType: OutboxEntry['entityType'],
  entityId: string,
): Promise<void> {
  const entries = await getAllOutboxEntries();
  for (const e of entries) {
    if (e.entityType === entityType && e.entityId === entityId && !e.processingAt && e.operation !== 'delete') {
      await deleteOutboxEntry(e.id);
    }
  }
  const remaining = await getAllOutboxEntries();
  const already = remaining.some(
    e => e.entityType === entityType && e.entityId === entityId && e.operation === 'delete' && !e.processingAt,
  );
  if (!already) {
    await enqueueOutbox('delete', entityType, entityId, {});
  }
}

/**
 * 上传本机待传图片（uploadStatus pending/failed/uploading 且有 blob 且无 path）。
 * 成功后回写 path 并按 baseRevision 入队（create 或 update）。
 * 要求登录 + 在线；未满足返回 0。返回成功上传的媒体数。
 */
export async function processPendingUploads(): Promise<number> {
  const uid = await currentUserId().catch(() => null);
  if (!uid || !isSupabaseConfigured() || !syncState.isOnline) return 0;
  const mediaList = await getAllMedia();
  let done = 0;
  for (const m of mediaList) {
    if (m.isDemo) continue;
    if (m.uploadStatus !== 'pending' && m.uploadStatus !== 'failed' && m.uploadStatus !== 'uploading') continue;
    if (m.displayPath) continue;
    try {
      await putMedia({ ...m, uploadStatus: 'uploading' });
      const paths = await uploadMediaBlobs(uid, m);
      const now = new Date().toISOString();
      await putMedia({
        ...m,
        ...paths,
        uploadStatus: 'uploaded',
        revision: m.revision ?? 1,
        updatedAt: now,
      });
      await enqueueSave('media', m.id, m.baseRevision ?? null);
      done++;
    } catch {
      await putMedia({ ...m, uploadStatus: 'failed' }).catch(() => undefined);
    }
  }
  if (done > 0) await refreshPendingCount().catch(() => undefined);
  return done;
}

export async function processOutbox(): Promise<void> {  if (!isSupabaseConfigured() || syncState.isSyncing || !syncState.isOnline) return;
  // 未登录：只排队不推送（M2 红线；登录后由 onAuthStateChange 触发重跑）
  const uid = await currentUserId().catch(() => null);
  if (!uid) return;

  updateSyncState({ isSyncing: true });

  try {
    const entries = await getAllOutboxEntries();
    // 按创建时间排序：保证 dimension → value → wfv、work → media 的依赖顺序
    entries.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    // BUG-18：回收孤儿条目 —— 同步中途刷新/关页会把 processingAt 留在行上，
    // 由于下面 `if (entry.processingAt) continue`，该条目会被永久跳过，
    // pendingCount 卡住不降。超过 60 秒仍"处理中"即视为孤儿，重置后重新参与。
    const staleBefore = Date.now() - 60_000;
    for (const entry of entries) {
      if (entry.processingAt && new Date(entry.processingAt).getTime() < staleBefore) {
        await putOutboxEntry({ ...entry, processingAt: null });
        entry.processingAt = null;
      }
    }

    let successCount = 0;
    let errorCount = 0;

    for (const entry of entries) {
      // 跳过正在处理的条目（避免并发）
      if (entry.processingAt) continue;

      // demo 数据永不上云：直接丢弃。
      // 注意：delete 意图必须跳过此判断 —— 本地行已删除，isDemoEntity 查不到会兜底为 true，
      // 导致删除永远推不上云端（BUG-17）。
      if (entry.operation !== 'delete' && await isDemoEntity(entry)) {
        await deleteOutboxEntry(entry.id);
        continue;
      }

      // 标记为处理中
      await putOutboxEntry({ ...entry, processingAt: new Date().toISOString() });

      try {
        await processEntry(entry, uid);
        await deleteOutboxEntry(entry.id);
        successCount++;
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);

        // 检查是否是冲突
        if (error.includes('Conflict') || error.includes('revision')) {
          const payload = entry.payload as Record<string, unknown>;
          if (entry.entityType === 'work' || entry.entityType === 'location' || entry.entityType === 'media') {
            registerConflict(
              entry.entityType,
              entry.entityId,
              (payload.baseRevision as number) ?? 0,
              null,
            );
          }
        }

        await putOutboxEntry({
          ...entry,
          retryCount: entry.retryCount + 1,
          lastError: error,
          processingAt: null,
        });
        errorCount++;
      }
    }

    const remaining = await getAllOutboxEntries();
    const now = new Date().toISOString();
    updateSyncState({
      isSyncing: false,
      pendingCount: remaining.length,
      lastSuccessAt: successCount > 0 ? now : syncState.lastSuccessAt,
      lastErrorAt: errorCount > 0 ? now : syncState.lastErrorAt,
      lastErrorMessage: errorCount > 0 ? `${errorCount} items failed` : null,
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    updateSyncState({
      isSyncing: false,
      lastErrorAt: new Date().toISOString(),
      lastErrorMessage: error,
    });
  }
}

async function isDemoEntity(entry: OutboxEntry): Promise<boolean> {
  try {
    if (entry.entityType === 'work') {
      const works = await getAllWorks();
      return works.find(w => w.id === entry.entityId)?.isDemo ?? true;
    }
    if (entry.entityType === 'location') {
      const locations = await getAllLocations();
      return locations.find(l => l.id === entry.entityId)?.isDemo ?? true;
    }
    if (entry.entityType === 'media') {
      const mediaList = await getAllMedia();
      return mediaList.find(m => m.id === entry.entityId)?.isDemo ?? true;
    }
    if (entry.entityType === 'facet_dimension') {
      const dims = await getAllFacetDimensions();
      return dims.find(d => d.id === entry.entityId)?.isDemo ?? true;
    }
    if (entry.entityType === 'facet_value') {
      const values = await getAllFacetValues();
      return values.find(v => v.id === entry.entityId)?.isDemo ?? true;
    }
  } catch {
    return false;
  }
  return false;
}

function isDuplicateKeyError(err: unknown): boolean {
  const code = (err as { code?: string })?.code;
  const message = err instanceof Error ? err.message : String(err);
  return code === '23505' || message.includes('duplicate key');
}

async function processEntry(entry: OutboxEntry, ownerId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase not configured');

  const tableName = getTableForEntity(entry.entityType);
  const payload = (entry.payload ?? {}) as Record<string, unknown>;

  switch (entry.operation) {
    case 'create': {
      const row = await buildCreateRow(entry, ownerId);
      if (!row) return; // 本地行已删：视为成功消费
      // BUG-16：works.cover_media_id → media.id 与 media.work_id → works.id 互为外键，
      // 单表 insert 必然死锁（409 / 23503）。对策：work 先不带封面入库，等 media 落库后回填。
      if (entry.entityType === 'work') row.cover_media_id = null;
      const { error } = await table(client, tableName).insert(row);
      if (error) {
        if (isDuplicateKeyError(error)) {
          // 23505 = 重放成功语义（C-4）：行已在云端，标记本地 synced
          await markEntitySynced(entry);
          return;
        }
        throw new Error(error.message);
      }
      // media 入云后，若它正是所属作品的封面，回填 works.cover_media_id。
      // R2-1：必须走 revision 乐观锁（SET cover + revision=base+1 WHERE id+revision=base），
      // 否则被 enforce_revision_guard 拒（实测 400 P0001 "revision must be old+1"，行原样不动）。
      if (entry.entityType === 'media') {
        const media = (await getAllMedia()).find((m) => m.id === entry.entityId);
        const work = media && !media.isDemo
          ? (await getAllWorks()).find((w) => w.id === media.workId)
          : undefined;
        if (work && !work.isDemo && work.coverMediaId === entry.entityId) {
          const base = work.revision;
          const { data: coverData, error: coverError } = await table(client, 'works')
            .update({ cover_media_id: entry.entityId, revision: base + 1 })
            .eq('id', work.id)
            .eq('owner_user_id', ownerId)
            .eq('revision', base)
            .select('revision');
          if (coverError) throw new Error(coverError.message);
          if (!coverData || coverData.length === 0) {
            throw new Error('Conflict: revision mismatch - remote has been modified');
          }
          // 云端 revision 已 +1，本地必须同步跟上（revision + baseRevision），
          // 否则后续编辑会以旧 base 更新，必然判冲突。
          const newRev = (coverData[0] as { revision: number }).revision;
          await putWork({
            ...work,
            revision: newRev,
            baseRevision: newRev,
            syncStatus: 'synced',
          });
        }
      }
      await markEntitySynced(entry);
      break;
    }
    case 'update': {
      // wfv 无 revision 列：update 一律按删建处理
      if (entry.entityType === 'work_facet_value') {
        const { workId, facetValueId } = parseWfvEntityId(entry.entityId);
        const delResult = await table(client, tableName)
          .delete().eq('work_id', workId).eq('facet_value_id', facetValueId);
        if (delResult.error) throw new Error(delResult.error.message);
        const { error: insertError } = await table(client, tableName)
          .insert(toWorkFacetRow(ownerId, workId, facetValueId));
        if (insertError && !isDuplicateKeyError(insertError)) throw new Error(insertError.message);
        break;
      }
      const baseRevision = (payload.baseRevision as number) ?? 0;
      const row = await buildUpdateRow(entry, ownerId);
      if (!row) return; // 本地行已删：视为成功消费
      const { data, error } = await table(client, tableName)
        .update(row)
        .eq('id', entry.entityId)
        .eq('revision', baseRevision)
        .select('revision');

      if (error) throw new Error(error.message);
      if (!data || data.length === 0) {
        throw new Error('Conflict: revision mismatch - remote has been modified');
      }

      // 更新本地 baseRevision
      const newRevision = (data[0] as { revision: number }).revision;
      await updateLocalBaseRevision(entry.entityType, entry.entityId, newRevision);
      break;
    }
    case 'delete': {
      if (entry.entityType === 'work_facet_value') {
        const { workId, facetValueId } = parseWfvEntityId(entry.entityId);
        const { error } = await table(client, tableName)
          .delete().eq('work_id', workId).eq('facet_value_id', facetValueId);
        if (error) throw new Error(error.message);
        break;
      }
      // BUG-16 + R2-1：删除作品前先删掉云端关联 media。
      // 封面不用手工清 —— 由触发器 trg_media_nullify_cover 在删 media 时自动把
      // works.cover_media_id 置 NULL（并 +1 revision）。手工清反而会被
      // enforce_revision_guard 拒（删库流程本地行已删，拿不到 base revision）。
      // 这样也解开了 fk_cover_media / fk_media_work 的连环。
      if (entry.entityType === 'work') {
        await table(client, 'media')
          .delete()
          .eq('work_id', entry.entityId)
          .eq('owner_user_id', ownerId);
      }
      const { error } = await table(client, tableName).delete().eq('id', entry.entityId);
      if (error) throw new Error(error.message);
      break;
    }
  }
}

/** CREATE 行：本地现读现组装；本地已无此行返回 null（调用方按消费成功处理）。 */
async function buildCreateRow(entry: OutboxEntry, ownerId: string): Promise<Record<string, unknown> | null> {
  switch (entry.entityType) {
    case 'work': {
      const work = (await getAllWorks()).find(w => w.id === entry.entityId);
      return work && !work.isDemo ? toWorkRow(work, ownerId) : null;
    }
    case 'location': {
      const location = (await getAllLocations()).find(l => l.id === entry.entityId);
      return location && !location.isDemo ? toLocationRow(location, ownerId) : null;
    }
    case 'media': {
      const media = (await getAllMedia()).find(m => m.id === entry.entityId);
      return media && !media.isDemo ? toMediaRow(media, ownerId) : null;
    }
    case 'facet_dimension': {
      const dim = (await getAllFacetDimensions()).find(d => d.id === entry.entityId);
      return dim && !dim.isDemo ? toDimensionRow(dim, ownerId) : null;
    }
    case 'facet_value': {
      const value = (await getAllFacetValues()).find(v => v.id === entry.entityId);
      return value && !value.isDemo ? toValueRow(value, ownerId) : null;
    }
    case 'work_facet_value': {
      const { workId, facetValueId } = parseWfvEntityId(entry.entityId);
      return toWorkFacetRow(ownerId, workId, facetValueId);
    }
  }
}

/**
 * UPDATE 行：只含 DB 列；剥离 baseRevision/syncStatus/isDemo 等本地字段；
 * revision 取本地新值（调用方已保证 = base+1）。
 */
async function buildUpdateRow(entry: OutboxEntry, ownerId: string): Promise<Record<string, unknown> | null> {
  switch (entry.entityType) {
    case 'work': {
      const work = (await getAllWorks()).find(w => w.id === entry.entityId);
      return work && !work.isDemo ? toWorkRow(work, ownerId) : null;
    }
    case 'location': {
      const location = (await getAllLocations()).find(l => l.id === entry.entityId);
      return location && !location.isDemo ? toLocationRow(location, ownerId) : null;
    }
    case 'media': {
      const media = (await getAllMedia()).find(m => m.id === entry.entityId);
      return media && !media.isDemo ? toMediaRow(media, ownerId) : null;
    }
    case 'facet_dimension': {
      const dim = (await getAllFacetDimensions()).find(d => d.id === entry.entityId);
      return dim && !dim.isDemo ? toDimensionRow(dim, ownerId) : null;
    }
    case 'facet_value': {
      const value = (await getAllFacetValues()).find(v => v.id === entry.entityId);
      return value && !value.isDemo ? toValueRow(value, ownerId) : null;
    }
    default:
      return null;
  }
}

/** 推送成功后把本地行标 synced（create 幂等命中同样处理）。 */
async function markEntitySynced(entry: OutboxEntry): Promise<void> {
  switch (entry.entityType) {
    case 'work': {
      const works = await getAllWorks();
      const work = works.find(w => w.id === entry.entityId);
      if (work) await putWork({ ...work, baseRevision: work.revision, syncStatus: 'synced' });
      break;
    }
    case 'location': {
      const locations = await getAllLocations();
      const location = locations.find(l => l.id === entry.entityId);
      if (location) await putLocation({ ...location, baseRevision: location.revision, syncStatus: 'synced' });
      break;
    }
    case 'media': {
      const mediaList = await getAllMedia();
      const media = mediaList.find(m => m.id === entry.entityId);
      if (media) await putMedia({ ...media, baseRevision: media.revision ?? 1, syncStatus: 'synced' });
      break;
    }
    case 'facet_dimension': {
      const dims = await getAllFacetDimensions();
      const dim = dims.find(d => d.id === entry.entityId);
      if (dim) await putFacetDimension({ ...dim, baseRevision: dim.revision ?? 1, syncStatus: 'synced' });
      break;
    }
    case 'facet_value': {
      const values = await getAllFacetValues();
      const value = values.find(v => v.id === entry.entityId);
      if (value) await putFacetValue({ ...value, baseRevision: value.revision ?? 1, syncStatus: 'synced' });
      break;
    }
    default:
      break;
  }
}

async function updateLocalBaseRevision(
  entityType: OutboxEntry['entityType'],
  entityId: string,
  revision: number,
): Promise<void> {
  switch (entityType) {
    case 'work': {
      const works = await getAllWorks();
      const work = works.find(w => w.id === entityId);
      if (work) {
        await putWork({ ...work, baseRevision: revision, syncStatus: 'synced' });
      }
      break;
    }
    case 'location': {
      const locations = await getAllLocations();
      const location = locations.find(l => l.id === entityId);
      if (location) {
        await putLocation({ ...location, baseRevision: revision, syncStatus: 'synced' });
      }
      break;
    }
    case 'media': {
      const mediaList = await getAllMedia();
      const media = mediaList.find(m => m.id === entityId);
      if (media) {
        await putMedia({ ...media, baseRevision: revision, syncStatus: 'synced' });
      }
      break;
    }
    case 'facet_dimension': {
      const dims = await getAllFacetDimensions();
      const dim = dims.find(d => d.id === entityId);
      if (dim) {
        await putFacetDimension({ ...dim, baseRevision: revision, syncStatus: 'synced' });
      }
      break;
    }
    case 'facet_value': {
      const values = await getAllFacetValues();
      const value = values.find(v => v.id === entityId);
      if (value) {
        await putFacetValue({ ...value, baseRevision: revision, syncStatus: 'synced' });
      }
      break;
    }
    default:
      break;
  }
}

function getTableForEntity(entityType: OutboxEntry['entityType']): string {
  switch (entityType) {
    case 'work': return 'works';
    case 'media': return 'media';
    case 'location': return 'locations';
    case 'facet_dimension': return 'facet_dimensions';
    case 'facet_value': return 'facet_values';
    case 'work_facet_value': return 'work_facet_values';
  }
}

export async function retryFailedSync(): Promise<void> {
  const entries = await getAllOutboxEntries();
  const failed = entries.filter(e => e.retryCount > 0);
  for (const entry of failed) {
    await putOutboxEntry({ ...entry, retryCount: 0, lastError: null, processingAt: null });
  }
  await processOutbox();
}

// ---- Pull Remote ----
// 参考 place-journal：仅「本机该行无未确认写入」时刷新；iDB 行不存在则建。
export async function pullRemote(): Promise<void> {
  if (!isSupabaseConfigured() || !syncState.isOnline) return;
  // 未登录不拉取（M2 红线）
  const uid = await currentUserId().catch(() => null);
  if (!uid) return;

  const client = getSupabaseClient();
  if (!client) return;

  updateSyncState({ isSyncing: true });

  try {
    const outboxEntries = await getAllOutboxEntries();
    const hasPendingOp = (entityType: OutboxEntry['entityType'], entityId: string) =>
      outboxEntries.some(e => e.entityType === entityType && e.entityId === entityId);

    // ---- works ----
    const { data: remoteWorks, error: worksError } = await table(client, 'works').select('*');
    if (worksError) throw new Error(worksError.message);

    const localWorks = await getAllWorks();

    for (const remote of remoteWorks || []) {
      const local = localWorks.find(w => w.id === (remote as { id: string }).id);
      // demo 行永不参与云端合并
      if (local?.isDemo) continue;
      if (hasPendingOp('work', (remote as { id: string }).id)) continue;

      const r = remote as Record<string, unknown>;
      if (!local || String(r.updated_at) > local.updatedAt) {
        const work: Work = {
          id: r.id as string,
          title: r.title as string,
          privateNote: (r.private_note as string) ?? '',
          shotAt: (r.shot_at as string) ?? '',
          locationId: (r.location_id as string) ?? '',
          coverMediaId: (r.cover_media_id as string) ?? null,
          isFavorite: (r.is_favorite as boolean) ?? false,
          mediaCount: local?.mediaCount ?? 0,
          tags: (r.tags as string[]) ?? [],
          revision: r.revision as number,
          baseRevision: r.revision as number,
          syncStatus: 'synced',
          isDemo: false,
          createdAt: r.created_at as string,
          updatedAt: r.updated_at as string,
        };
        await putWork(work);
      }
    }

    // ---- locations ----
    const { data: remoteLocations, error: locationsError } = await table(client, 'locations').select('*');
    if (locationsError) throw new Error(locationsError.message);

    const localLocations = await getAllLocations();

    for (const remote of remoteLocations || []) {
      const local = localLocations.find(l => l.id === (remote as { id: string }).id);
      if (local?.isDemo) continue;
      if (hasPendingOp('location', (remote as { id: string }).id)) continue;

      const r = remote as Record<string, unknown>;
      if (!local || String(r.updated_at) > local.updatedAt) {
        const location: Location = {
          id: r.id as string,
          name: r.name as string,
          country: (r.country as string) ?? '',
          province: (r.province as string) ?? '',
          city: (r.city as string) ?? '',
          area: (r.area as string) ?? '',
          revision: r.revision as number,
          baseRevision: r.revision as number,
          syncStatus: 'synced',
          isDemo: false,
          createdAt: r.created_at as string,
          updatedAt: r.updated_at as string,
        };
        await putLocation(location);
      }
    }

    // ---- media（保留本机 blob URL；远端新行 displayUrl 置空，由 UI 按需取 signedUrl） ----
    const { data: remoteMedia, error: mediaError } = await table(client, 'media').select('*');
    if (mediaError) throw new Error(mediaError.message);

    const localMedia = await getAllMedia();

    for (const remote of remoteMedia || []) {
      const local = localMedia.find(m => m.id === (remote as { id: string }).id);
      if (local?.isDemo) continue;
      if (hasPendingOp('media', (remote as { id: string }).id)) continue;

      const r = remote as Record<string, unknown>;
      if (!local || String(r.updated_at) > local.updatedAt) {
        const media: MediaAsset = {
          id: r.id as string,
          workId: r.work_id as string,
          displayUrl: local?.displayUrl ?? '',
          thumbUrl: local?.thumbUrl ?? '',
          mimeType: r.mime_type as string,
          byteSize: (r.byte_size as number) ?? 0,
          width: (r.width as number) ?? 0,
          height: (r.height as number) ?? 0,
          orientation: r.orientation as MediaAsset['orientation'],
          sortOrder: (r.sort_order as number) ?? 0,
          uploadStatus: (r.upload_status as MediaAsset['uploadStatus']) ?? 'uploaded',
          displayPath: (r.display_path as string) ?? null,
          thumbPath: (r.thumb_path as string) ?? null,
          syncStatus: 'synced',
          baseRevision: r.revision as number,
          revision: r.revision as number,
          isDemo: false,
          createdAt: r.created_at as string,
          updatedAt: r.updated_at as string,
        };
        await putMedia(media);
      }
    }

    // ---- facet_dimensions ----
    const { data: remoteDims, error: dimsError } = await table(client, 'facet_dimensions').select('*');
    if (dimsError) throw new Error(dimsError.message);

    const localDims = await getAllFacetDimensions();

    for (const remote of remoteDims || []) {
      const local = localDims.find(d => d.id === (remote as { id: string }).id);
      if (local?.isDemo) continue;
      if (hasPendingOp('facet_dimension', (remote as { id: string }).id)) continue;

      const r = remote as Record<string, unknown>;
      if (!local || String(r.updated_at) > local.updatedAt) {
        const dim: FacetDimension = {
          id: r.id as string,
          key: r.key as string,
          name: r.name as string,
          sortOrder: (r.sort_order as number) ?? 0,
          selectionMode: (r.selection_mode as FacetDimension['selectionMode']) ?? 'multi',
          owner_user_id: uid,
          revision: r.revision as number,
          baseRevision: r.revision as number,
          syncStatus: 'synced',
          isDemo: false,
          createdAt: r.created_at as string,
          updatedAt: r.updated_at as string,
        };
        await putFacetDimension(dim);
      }
    }

    // ---- facet_values ----
    const { data: remoteValues, error: valuesError } = await table(client, 'facet_values').select('*');
    if (valuesError) throw new Error(valuesError.message);

    const localValues = await getAllFacetValues();

    for (const remote of remoteValues || []) {
      const local = localValues.find(v => v.id === (remote as { id: string }).id);
      if (local?.isDemo) continue;
      if (hasPendingOp('facet_value', (remote as { id: string }).id)) continue;

      const r = remote as Record<string, unknown>;
      if (!local || String(r.updated_at) > local.updatedAt) {
        const value: FacetValue = {
          id: r.id as string,
          dimensionId: r.dimension_id as string,
          parentId: (r.parent_id as string) ?? null,
          name: r.name as string,
          sortOrder: (r.sort_order as number) ?? 0,
          owner_user_id: uid,
          revision: r.revision as number,
          baseRevision: r.revision as number,
          syncStatus: 'synced',
          isDemo: false,
          createdAt: r.created_at as string,
          updatedAt: r.updated_at as string,
        };
        await putFacetValue(value);
      }
    }

    // ---- work_facet_values（集合对账：仅无未确认写入的 work 才参与） ----
    const { data: remoteWfv, error: wfvError } = await table(client, 'work_facet_values').select('work_id,facet_value_id');
    if (wfvError) throw new Error(wfvError.message);

    const localWfv = await getAllWorkFacetValues();
    const remotePairs = new Set((remoteWfv || []).map(r => {
      const row = r as unknown as { work_id: string; facet_value_id: string };
      return `${row.work_id}|${row.facet_value_id}`;
    }));
    const localPairs = new Set(localWfv.map(w => `${w.workId}|${w.facetValueId}`));

    // 远端有、本地无 → 补（其 work 若有未确认写入则整 work 跳过）
    for (const pair of remotePairs) {
      if (localPairs.has(pair)) continue;
      const [workId] = pair.split('|');
      if (hasPendingOp('work', workId)) continue;
      const { facetValueId } = parseWfvEntityId(pair);
      await putWorkFacetValue({ workId, facetValueId });
    }
    // 本地有、远端无 → 删（其 work 若有未确认写入则保留；demo 行保留）
    const currentLocalWorks = await getAllWorks();
    for (const w of localWfv) {
      const pair = `${w.workId}|${w.facetValueId}`;
      if (remotePairs.has(pair)) continue;
      if (hasPendingOp('work', w.workId)) continue;
      if (hasPendingOp('work_facet_value', pair)) continue;
      if (currentLocalWorks.find(lw => lw.id === w.workId)?.isDemo) continue;
      const db = await getDB();
      await db.delete('work_facet_values', [w.workId, w.facetValueId]);
    }

    updateSyncState({
      isSyncing: false,
      lastSuccessAt: new Date().toISOString(),
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    updateSyncState({
      isSyncing: false,
      lastErrorAt: new Date().toISOString(),
      lastErrorMessage: error,
    });
  }
}
