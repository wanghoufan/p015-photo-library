-- 0001_init.pending.sql
-- 状态: ⏳ PENDING — 待审核，不是正式 Migration
-- ⚠️ 已被取代（R1-7，2026-09-07）：以 alw丨数据库管理专家/项目审查丨photo-library/
-- 下两份 2026-09-07 草案为准（0001 表+RLS、0002 Storage 独立送审）。
-- 本文件禁止执行，仅留档：含 CHECK 子查询（PG 非法）、缺复合 FK、
-- media 缺 revision、RLS/GRANT 全注释。
-- Schema: photo_library
-- 依赖: auth.users 已存在

-- 创建 Schema
CREATE SCHEMA IF NOT EXISTS photo_library;

-- 地点表
CREATE TABLE photo_library.locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id),
  name text NOT NULL,
  country text NOT NULL DEFAULT '',
  province text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  area text NOT NULL DEFAULT '',
  revision integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 作品表
CREATE TABLE photo_library.works (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id),
  title text NOT NULL,
  private_note text NOT NULL DEFAULT '',
  shot_at date,
  location_id uuid REFERENCES photo_library.locations(id) ON DELETE SET NULL,
  cover_media_id uuid,
  is_favorite boolean NOT NULL DEFAULT false,
  revision integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 媒体表
CREATE TABLE photo_library.media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id),
  work_id uuid NOT NULL REFERENCES photo_library.works(id) ON DELETE CASCADE,
  display_path text,
  thumb_path text,
  mime_type text NOT NULL,
  byte_size integer,
  width integer,
  height integer,
  orientation text NOT NULL CHECK (orientation IN ('landscape', 'portrait', 'square')),
  sort_order integer NOT NULL DEFAULT 0,
  upload_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 设置 cover_media_id 外键（延迟创建，因为 media 表依赖 works 表）
ALTER TABLE photo_library.works
  ADD CONSTRAINT fk_cover_media
  FOREIGN KEY (cover_media_id) REFERENCES photo_library.media(id) ON DELETE SET NULL;

-- 分面维度表
CREATE TABLE photo_library.facet_dimensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id),
  key text NOT NULL,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  selection_mode text NOT NULL DEFAULT 'multi',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_user_id, key)
);

-- 分面值表
CREATE TABLE photo_library.facet_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id),
  dimension_id uuid NOT NULL REFERENCES photo_library.facet_dimensions(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES photo_library.facet_values(id),
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 作品-分面值关系表
CREATE TABLE photo_library.work_facet_values (
  owner_user_id uuid NOT NULL REFERENCES auth.users(id),
  work_id uuid NOT NULL REFERENCES photo_library.works(id) ON DELETE CASCADE,
  facet_value_id uuid NOT NULL REFERENCES photo_library.facet_values(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (work_id, facet_value_id),
  CONSTRAINT chk_same_owner_work
    CHECK (owner_user_id = (SELECT w.owner_user_id FROM photo_library.works w WHERE w.id = work_id)),
  CONSTRAINT chk_same_owner_fv
    CHECK (owner_user_id = (SELECT fv.owner_user_id FROM photo_library.facet_values fv WHERE fv.id = facet_value_id))
);

-- 索引
CREATE INDEX idx_works_owner ON photo_library.works (owner_user_id);
CREATE INDEX idx_works_location ON photo_library.works (location_id);
CREATE INDEX idx_works_shot_at ON photo_library.works (shot_at DESC);
CREATE INDEX idx_works_favorite ON photo_library.works (is_favorite) WHERE is_favorite = true;
CREATE INDEX idx_media_work ON photo_library.media (work_id);
CREATE INDEX idx_locations_owner ON photo_library.locations (owner_user_id);
CREATE INDEX idx_wfv_work ON photo_library.work_facet_values (work_id);
CREATE INDEX idx_wfv_value ON photo_library.work_facet_values (facet_value_id);

-- RLS（待审核）
-- ALTER TABLE photo_library.works ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE photo_library.locations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE photo_library.media ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE photo_library.facet_dimensions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE photo_library.facet_values ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE photo_library.work_facet_values ENABLE ROW LEVEL SECURITY;

-- GRANT（待审核）
-- GRANT USAGE ON SCHEMA photo_library TO authenticated;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA photo_library TO authenticated;
