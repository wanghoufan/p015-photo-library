export type Orientation = 'landscape' | 'portrait' | 'square';

// 同步状态：参考 place-journal 的命名
export type SyncStatus = 'local' | 'syncing' | 'synced' | 'failed' | 'conflict';

export type UploadStatus = 'pending' | 'uploading' | 'uploaded' | 'failed';

export interface Work {
  id: string;
  title: string;
  privateNote: string;
  shotAt: string;
  locationId: string;
  coverMediaId: string | null;
  isFavorite: boolean;
  mediaCount: number;
  tags: string[];
  revision: number;
  baseRevision?: number;
  syncStatus: SyncStatus;
  syncError?: string;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MediaAsset {
  id: string;
  workId: string;
  displayUrl: string;
  thumbUrl: string;
  mimeType: string;
  byteSize: number;
  width: number;
  height: number;
  orientation: Orientation;
  sortOrder: number;
  uploadStatus: UploadStatus;
  displayPath: string | null;
  thumbPath: string | null;
  // M2：行级同步态（与 Work 同纪律；_UPLOAD_ 指 Storage blob，_SYNC_ 指 DB 行）
  syncStatus?: SyncStatus;
  baseRevision?: number;
  revision?: number;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Location {
  id: string;
  name: string;
  country: string;
  province: string;
  city: string;
  area: string;
  revision: number;
  baseRevision?: number;
  syncStatus: SyncStatus;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FacetDimension {
  id: string;
  key: string;
  name: string;
  sortOrder: number;
  selectionMode: 'single' | 'multi';
  // M2：云端同步字段（静态分面种子同样归属到用户，demo 永不上云）
  owner_user_id?: string;
  revision?: number;
  baseRevision?: number;
  syncStatus?: SyncStatus;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FacetValue {
  id: string;
  dimensionId: string;
  parentId: string | null;
  name: string;
  sortOrder: number;
  // M2：同上
  owner_user_id?: string;
  revision?: number;
  baseRevision?: number;
  syncStatus?: SyncStatus;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkFacetValue {
  workId: string;
  facetValueId: string;
}

export interface WorkWithRelations extends Work {
  location: Location | null;
  media: MediaAsset[];
  facetValues: FacetValue[];
}

export interface FacetDefinition {
  key: string;
  label: string;
  location: 'sidebar' | 'top';
  mode: 'single' | 'multi';
  operator: 'and' | 'or';
  valueSource: string;
  showCounts: boolean;
  disableZeroResults: boolean;
}

export interface ActiveFilters {
  search: string;
  locationIds: string[];
  facetSelections: Record<string, string[]>;
  favoriteOnly: boolean;
  orientation: Orientation | null;
  year: string | null;
}

export interface FilterResult {
  works: WorkWithRelations[];
  totalCount: number;
  facetCounts: Record<string, Record<string, number>>;
  disabledValues: Record<string, Set<string>>;
}

export interface OutboxEntry {
  id: string;
  operation: 'create' | 'update' | 'delete';
  entityType: 'work' | 'media' | 'location' | 'facet_dimension' | 'facet_value' | 'work_facet_value';
  entityId: string;
  // M2 约定：create/delete 用 {}；update 用 { baseRevision }。
  // 行内容推送时从本地 IDB 现读现组装，不快照，避免过期 payload。
  payload: unknown;
  retryCount: number;
  lastError: string | null;
  createdAt: string;
  processingAt: string | null;
}

export interface AppMeta {
  key: string;
  value: string;
  updatedAt: string;
}

export type ViewMode = 'grid' | 'masonry';
