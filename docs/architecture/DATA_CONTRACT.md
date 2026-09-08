# 数据合同 (DATA_CONTRACT.md)

## Schema: photo_library

### works
| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | uuid | PK | 作品 ID |
| owner_user_id | uuid | NOT NULL, FK→auth.users | 归属用户 |
| title | text | NOT NULL | 作品名 |
| private_note | text | DEFAULT '' | 私人说明 |
| tags | text[] | NOT NULL DEFAULT '{}' | 自定义标签（本地筛选 + 云端同步） |
| shot_at | date | | 拍摄日期 |
| location_id | uuid | FK→locations.id | 地点 |
| cover_media_id | uuid | FK→media.id | 封面 |
| is_favorite | boolean | DEFAULT false | 收藏 |
| revision | integer | NOT NULL DEFAULT 1 | 版本号 |
| created_at | timestamptz | NOT NULL DEFAULT now() | |
| updated_at | timestamptz | NOT NULL DEFAULT now() | |

### locations
| 字段 | 类型 | 约束 |
|---|---|---|
| id | uuid | PK |
| owner_user_id | uuid | NOT NULL, FK→auth.users |
| name | text | NOT NULL |
| country | text | DEFAULT '' |
| province | text | DEFAULT '' |
| city | text | DEFAULT '' |
| area | text | DEFAULT '' |
| revision | integer | NOT NULL DEFAULT 1 |
| created_at | timestamptz | NOT NULL DEFAULT now() |
| updated_at | timestamptz | NOT NULL DEFAULT now() |

### media
| 字段 | 类型 | 约束 |
|---|---|---|
| id | uuid | PK |
| owner_user_id | uuid | NOT NULL, FK→auth.users |
| work_id | uuid | NOT NULL, FK→works.id ON DELETE CASCADE |
| display_path | text | |
| thumb_path | text | |
| mime_type | text | NOT NULL |
| byte_size | integer | |
| width | integer | |
| height | integer | |
| orientation | text | CHECK (orientation IN ('landscape','portrait','square')) |
| sort_order | integer | DEFAULT 0 |
| upload_status | text | DEFAULT 'pending' |
| revision | integer | NOT NULL DEFAULT 1 | 版本号（同步乐观锁，media 同样参与） |
| created_at | timestamptz | NOT NULL DEFAULT now() |
| updated_at | timestamptz | NOT NULL DEFAULT now() |

### facet_dimensions
| 字段 | 类型 | 约束 |
|---|---|---|
| id | uuid | PK |
| owner_user_id | uuid | NOT NULL |
| key | text | NOT NULL |
| name | text | NOT NULL |
| sort_order | integer | DEFAULT 0 |
| selection_mode | text | DEFAULT 'multi'，CHECK 仅 single/multi |
| revision | integer | NOT NULL DEFAULT 1（同步乐观锁） |
| created_at / updated_at | timestamptz | NOT NULL DEFAULT now() |

### facet_values
| 字段 | 类型 | 约束 |
|---|---|---|
| id | uuid | PK |
| owner_user_id | uuid | NOT NULL |
| dimension_id | uuid | 复合 FK→(facet_dimensions.id, owner) |
| parent_id | uuid | nullable，复合自引 FK |
| name | text | NOT NULL |
| sort_order | integer | DEFAULT 0 |
| revision | integer | NOT NULL DEFAULT 1（同步乐观锁） |
| created_at / updated_at | timestamptz | NOT NULL DEFAULT now() |

### work_facet_values
| 字段 | 类型 | 约束 |
|---|---|---|
| owner_user_id | uuid | NOT NULL |
| work_id | uuid | 复合 FK→(works.id, owner)，CASCADE |
| facet_value_id | uuid | 复合 FK→(facet_values.id, owner)，CASCADE |
| created_at | timestamptz | DEFAULT now() |
| **PK** | | (work_id, facet_value_id) |
| **归属一致** | | 复合外键在约束层保证（CHECK 子查询非法，见 C-1/C-2）；变更语义=删建，无 revision |

### 跨表引用规则
- 所有子表外键均为 `(id, owner_user_id)` 复合外键；父表均有 `UNIQUE(id, owner_user_id)`。
- 可空引用（works.location_id、works.cover_media_id）删除父行时由触发器只清空本列（绝不碰 owner），外键动作为 RESTRICT。
- `works`/`media`/`locations`/`facet_*` 五表有 `enforce_revision_guard` 触发器：owner 不可变，revision 必须恰为 old+1。

## Storage Bucket
- `photo-library-media-private`
- 路径: `<owner_user_id>/<work_id>/<media_id>/display.webp`
- 缩略图: `<owner_user_id>/<work_id>/<media_id>/thumb.webp`

## 状态: ⏳ 待验证
以上为设计方案，未连接生产 Supabase。正式 Migration 由共享平台仓库管理。
