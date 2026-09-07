// 同步引擎：本地 outbox → Supabase
// 参考 place-journal 的成熟模式：revision 乐观锁、冲突处理、pullRemote 保护
import { supabase, isSupabaseConfigured, getSupabaseClient, table, DB_SCHEMA } from './supabase';
import { getAllOutboxEntries, putOutboxEntry, deleteOutboxEntry, getAllWorks, putWork, getAllLocations, putLocation, getAllMedia, putMedia } from './idb';
import type { OutboxEntry, Work, Location, MediaAsset, SyncStatus } from './types';
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
  isOnline: navigator.onLine,
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

window.addEventListener('online', () => {
  updateSyncState({ isOnline: true });
  void processOutbox();
});

window.addEventListener('offline', () => {
  updateSyncState({ isOnline: false });
});

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
  media: { id: string; displayPath?: string; thumbPath?: string },
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

// ---- Cloud State ----
export async function getCloudState(): Promise<CloudState> {
  if (!isSupabaseConfigured()) return 'unconfigured';
  if (!navigator.onLine) return 'offline';
  return 'idle';
}

// ---- Outbox 处理 ----
export async function enqueueOutbox(
  operation: OutboxEntry['operation'],
  entityType: OutboxEntry['entityType'],
  entityId: string,
  payload: unknown,
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  
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
  const entries = await getAllOutboxEntries();
  updateSyncState({ pendingCount: entries.length });

  if (syncState.isOnline && !syncState.isSyncing) {
    void processOutbox();
  }
}

export async function processOutbox(): Promise<void> {
  if (!isSupabaseConfigured() || syncState.isSyncing || !syncState.isOnline) return;

  updateSyncState({ isSyncing: true });

  try {
    const entries = await getAllOutboxEntries();
    let successCount = 0;
    let errorCount = 0;

    for (const entry of entries) {
      // 跳过正在处理的条目（避免并发）
      if (entry.processingAt) continue;
      
      // 标记为处理中
      await putOutboxEntry({ ...entry, processingAt: new Date().toISOString() });
      
      try {
        await processEntry(entry);
        await deleteOutboxEntry(entry.id);
        successCount++;
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        
        // 检查是否是冲突
        if (error.includes('Conflict') || error.includes('revision')) {
          const payload = entry.payload as Record<string, unknown>;
          registerConflict(
            entry.entityType as ConflictRecord['kind'],
            entry.entityId,
            (payload.baseRevision as number) ?? 0,
            null,
          );
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

async function processEntry(entry: OutboxEntry): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase not configured');

  const tableName = getTableForEntity(entry.entityType);
  const payload = entry.payload as Record<string, unknown>;

  switch (entry.operation) {
    case 'create': {
      const { error } = await table(client, tableName).insert(payload);
      if (error) throw new Error(error.message);
      break;
    }
    case 'update': {
      // revision 乐观锁：条件更新
      const baseRevision = (payload.baseRevision as number) ?? 0;
      const { data, error } = await table(client, tableName)
        .update(payload)
        .eq('id', entry.entityId)
        .eq('revision', baseRevision)
        .select('revision');
      
      if (error) throw new Error(error.message);
      if (!data || data.length === 0) {
        throw new Error('Conflict: revision mismatch - remote has been modified');
      }
      
      // 更新本地 baseRevision
      const newRevision = data[0].revision;
      await updateLocalBaseRevision(entry.entityType, entry.entityId, newRevision);
      break;
    }
    case 'delete': {
      const { error } = await table(client, tableName).delete().eq('id', entry.entityId);
      if (error) throw new Error(error.message);
      break;
    }
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
        await putMedia({ ...media, uploadStatus: 'uploaded' });
      }
      break;
    }
  }
}

function getTableForEntity(entityType: OutboxEntry['entityType']): string {
  switch (entityType) {
    case 'work': return 'works';
    case 'media': return 'media';
    case 'location': return 'locations';
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
// 参考 place-journal：仅「本机该行无未确认写入」时刷新
export async function pullRemote(): Promise<void> {
  if (!isSupabaseConfigured() || !syncState.isOnline) return;
  
  const client = getSupabaseClient();
  if (!client) return;

  updateSyncState({ isSyncing: true });

  try {
    // 拉取远端 works
    const { data: remoteWorks, error: worksError } = await table(client, 'works').select('*');
    if (worksError) throw new Error(worksError.message);
    
    const localWorks = await getAllWorks();
    const outboxEntries = await getAllOutboxEntries();
    
    // 合并远端数据，保护本地未确认修改
    for (const remote of remoteWorks || []) {
      const local = localWorks.find(w => w.id === remote.id);
      const hasPendingOp = outboxEntries.some(
        e => e.entityType === 'work' && e.entityId === remote.id
      );
      
      // 如果本地有未确认修改，不覆盖
      if (hasPendingOp) continue;
      
      // 如果本地没有或远端更新，更新本地
      if (!local || (remote.updated_at > local.updatedAt)) {
        const work: Work = {
          id: remote.id,
          title: remote.title,
          privateNote: remote.private_note ?? '',
          locationId: remote.location_id ?? '',
          coverMediaId: remote.cover_media_id ?? null,
          shotAt: remote.shot_at ?? '',
          isFavorite: remote.is_favorite ?? false,
          mediaCount: 0,
          tags: [],
          revision: remote.revision,
          baseRevision: remote.revision,
          syncStatus: 'synced',
          isDemo: false,
          createdAt: remote.created_at,
          updatedAt: remote.updated_at,
        };
        await putWork(work);
      }
    }
    
    // 拉取远端 locations
    const { data: remoteLocations, error: locationsError } = await table(client, 'locations').select('*');
    if (locationsError) throw new Error(locationsError.message);
    
    const localLocations = await getAllLocations();
    
    for (const remote of remoteLocations || []) {
      const local = localLocations.find(l => l.id === remote.id);
      const hasPendingOp = outboxEntries.some(
        e => e.entityType === 'location' && e.entityId === remote.id
      );
      
      if (hasPendingOp) continue;
      
      if (!local || (remote.updated_at > local.updatedAt)) {
        const location: Location = {
          id: remote.id,
          name: remote.name,
          country: remote.country ?? '',
          province: remote.province ?? '',
          city: remote.city ?? '',
          area: remote.area ?? '',
          revision: remote.revision,
          baseRevision: remote.revision,
          syncStatus: 'synced',
          isDemo: false,
          createdAt: remote.created_at,
          updatedAt: remote.updated_at,
        };
        await putLocation(location);
      }
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
