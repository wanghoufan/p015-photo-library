import { supabase, isSupabaseConfigured } from './supabase';
import { getAllOutboxEntries, putOutboxEntry, deleteOutboxEntry } from './idb';
import type { OutboxEntry } from './types';
import { generateId } from './utils';

export interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  lastErrorMessage: string | null;
}

let syncState: SyncState = {
  isOnline: navigator.onLine,
  isSyncing: false,
  pendingCount: 0,
  lastSuccessAt: null,
  lastErrorAt: null,
  lastErrorMessage: null,
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

export async function enqueueOutbox(
  operation: OutboxEntry['operation'],
  entityType: OutboxEntry['entityType'],
  entityId: string,
  payload: unknown,
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
      try {
        await processEntry(entry);
        await deleteOutboxEntry(entry.id);
        successCount++;
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
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
  if (!supabase) throw new Error('Supabase not configured');

  const table = getTableForEntity(entry.entityType);
  const payload = entry.payload as Record<string, unknown>;

  switch (entry.operation) {
    case 'create': {
      const { error } = await supabase.from(table).insert(payload);
      if (error) throw new Error(error.message);
      break;
    }
    case 'update': {
      const { data, error } = await supabase
        .from(table)
        .update(payload)
        .eq('id', entry.entityId)
        .eq('revision', (payload.baseRevision as number) ?? 0)
        .select();
      if (error) throw new Error(error.message);
      if (!data || data.length === 0) throw new Error('Conflict: revision mismatch');
      break;
    }
    case 'delete': {
      const { error } = await supabase.from(table).delete().eq('id', entry.entityId);
      if (error) throw new Error(error.message);
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
    await putOutboxEntry({ ...entry, retryCount: 0, lastError: null });
  }
  await processOutbox();
}
