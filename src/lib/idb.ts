import { openDB, type IDBPDatabase } from 'idb';
import type { Work, MediaAsset, Location, FacetDimension, FacetValue, WorkFacetValue, OutboxEntry, AppMeta } from './types';

const DB_NAME = 'photo-library-db';
const DB_VERSION = 1;

interface PhotoLibraryDB {
  works: { key: string; value: Work; indexes: { 'by-location': string; 'by-shot-at': string; 'by-updated-at': string; 'by-demo': boolean } };
  media: { key: string; value: MediaAsset; indexes: { 'by-work': string } };
  locations: { key: string; value: Location; indexes: { 'by-name': string } };
  facet_dimensions: { key: string; value: FacetDimension; indexes: { 'by-key': string } };
  facet_values: { key: string; value: FacetValue; indexes: { 'by-dimension': string } };
  work_facet_values: { key: string; value: WorkFacetValue; indexes: { 'by-work': string; 'by-value': string } };
  outbox: { key: string; value: OutboxEntry; indexes: { 'by-entity': string; 'by-processing-at': string } };
  meta: { key: string; value: AppMeta };
}

let dbInstance: IDBPDatabase<PhotoLibraryDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<PhotoLibraryDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<PhotoLibraryDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const worksStore = db.createObjectStore('works', { keyPath: 'id' });
      worksStore.createIndex('by-location', 'locationId');
      worksStore.createIndex('by-shot-at', 'shotAt');
      worksStore.createIndex('by-updated-at', 'updatedAt');
      worksStore.createIndex('by-demo', 'isDemo');

      const mediaStore = db.createObjectStore('media', { keyPath: 'id' });
      mediaStore.createIndex('by-work', 'workId');

      const locStore = db.createObjectStore('locations', { keyPath: 'id' });
      locStore.createIndex('by-name', 'name');

      db.createObjectStore('facet_dimensions', { keyPath: 'id' }).createIndex('by-key', 'key');
      const fvStore = db.createObjectStore('facet_values', { keyPath: 'id' });
      fvStore.createIndex('by-dimension', 'dimensionId');

      const wfvStore = db.createObjectStore('work_facet_values', { keyPath: ['workId', 'facetValueId'] });
      wfvStore.createIndex('by-work', 'workId');
      wfvStore.createIndex('by-value', 'facetValueId');

      const outboxStore = db.createObjectStore('outbox', { keyPath: 'id' });
      outboxStore.createIndex('by-entity', 'entityId');
      outboxStore.createIndex('by-processing-at', 'processingAt');

      db.createObjectStore('meta', { keyPath: 'key' });
    },
  });

  return dbInstance;
}

// Works
export async function getAllWorks(): Promise<Work[]> {
  const db = await getDB();
  return db.getAll('works');
}

export async function getWork(id: string): Promise<Work | undefined> {
  const db = await getDB();
  return db.get('works', id);
}

export async function putWork(work: Work): Promise<void> {
  const db = await getDB();
  await db.put('works', work);
}

export async function deleteWork(id: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['works', 'media', 'work_facet_values', 'outbox'], 'readwrite');
  const worksStore = tx.objectStore('works');
  await worksStore.delete(id);
  const mediaStore = tx.objectStore('media');
  const mediaIndex = mediaStore.index('by-work');
  for await (const cursor of mediaIndex.iterate(id)) {
    await cursor.delete();
  }
  const wfvStore = tx.objectStore('work_facet_values');
  const wfvIndex = wfvStore.index('by-work');
  for await (const cursor of wfvIndex.iterate(id)) {
    await cursor.delete();
  }
  const outboxStore = tx.objectStore('outbox');
  const outboxIndex = outboxStore.index('by-entity');
  for await (const cursor of outboxIndex.iterate(id)) {
    await cursor.delete();
  }
  await tx.done;
}

// Media
export async function getMediaByWork(workId: string): Promise<MediaAsset[]> {
  const db = await getDB();
  return db.getAllFromIndex('media', 'by-work', workId);
}

export async function putMedia(media: MediaAsset): Promise<void> {
  const db = await getDB();
  await db.put('media', media);
}

// Locations
export async function getAllLocations(): Promise<Location[]> {
  const db = await getDB();
  return db.getAll('locations');
}

export async function putLocation(location: Location): Promise<void> {
  const db = await getDB();
  await db.put('locations', location);
}

// Facet dimensions
export async function getAllFacetDimensions(): Promise<FacetDimension[]> {
  const db = await getDB();
  return db.getAll('facet_dimensions');
}

export async function putFacetDimension(dim: FacetDimension): Promise<void> {
  const db = await getDB();
  await db.put('facet_dimensions', dim);
}

// Facet values
export async function getAllFacetValues(): Promise<FacetValue[]> {
  const db = await getDB();
  return db.getAll('facet_values');
}

export async function getFacetValuesByDimension(dimensionId: string): Promise<FacetValue[]> {
  const db = await getDB();
  return db.getAllFromIndex('facet_values', 'by-dimension', dimensionId);
}

export async function putFacetValue(value: FacetValue): Promise<void> {
  const db = await getDB();
  await db.put('facet_values', value);
}

// Work-Facet-Values
export async function getWorkFacetValues(workId: string): Promise<WorkFacetValue[]> {
  const db = await getDB();
  return db.getAllFromIndex('work_facet_values', 'by-work', workId);
}

export async function putWorkFacetValue(wfv: WorkFacetValue): Promise<void> {
  const db = await getDB();
  await db.put('work_facet_values', wfv);
}

export async function deleteWorkFacetValues(workId: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('work_facet_values', 'readwrite');
  const index = tx.store.index('by-work');
  for await (const cursor of index.iterate(workId)) {
    await cursor.delete();
  }
  await tx.done;
}

// Outbox
export async function getAllOutboxEntries(): Promise<OutboxEntry[]> {
  const db = await getDB();
  return db.getAll('outbox');
}

export async function putOutboxEntry(entry: OutboxEntry): Promise<void> {
  const db = await getDB();
  await db.put('outbox', entry);
}

export async function deleteOutboxEntry(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('outbox', id);
}

// Meta
export async function getMeta(key: string): Promise<string | null> {
  const db = await getDB();
  const meta = await db.get('meta', key);
  return meta?.value ?? null;
}

export async function setMeta(key: string, value: string): Promise<void> {
  const db = await getDB();
  await db.put('meta', { key, value, updatedAt: new Date().toISOString() });
}

// Clear all demo data
export async function clearDemoData(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['works', 'media', 'work_facet_values'], 'readwrite');
  const worksStore = tx.objectStore('works');
  const demoIndex = worksStore.index('by-demo');
  for await (const cursor of demoIndex.iterate(IDBKeyRange.only(true))) {
    await cursor.delete();
  }
  await tx.done;
}

// Clear all data
export async function clearAllData(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(
    ['works', 'media', 'locations', 'facet_dimensions', 'facet_values', 'work_facet_values', 'outbox', 'meta'],
    'readwrite',
  );
  const storeNames = ['works', 'media', 'locations', 'facet_dimensions', 'facet_values', 'work_facet_values', 'outbox', 'meta'] as const;
  for (const name of storeNames) {
    await tx.objectStore(name).clear();
  }
  await tx.done;
}
