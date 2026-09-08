# 本地优先同步架构 (LOCAL_FIRST_SYNC.md)

## 数据流
```
用户操作 → IndexedDB 写入 → UI 立即可见
                ↓
           Outbox 入队
                ↓
        联网时逐条推送 Supabase
                ↓
        成功 → 删除 outbox 条目，更新 syncStatus
        失败 → 保留条目，增加 retryCount
```

## IndexedDB Stores
- works, media, media_blobs（二进制与行分离，DB v2+）, locations, facet_dimensions, facet_values, work_facet_values, outbox, meta

## 关键规则
1. 新建和编辑先写 IndexedDB，UI 立即可见
2. 离线状态可以添加、编辑和浏览已缓存作品
3. 登录 + 联网后由 outbox 逐条推送（未登录只排队不推送）；图片先传 Storage blob 再建行
4. 每个操作具备稳定幂等 ID
5. 不允许整库覆盖
6. 同步失败保留任务、错误和重试次数
7. 核心记录带 revision、baseRevision
8. 条件更新返回 0 行时进入冲突状态
9. 拉取远端时不覆盖本地 outbox 中未确认的修改
10. 演示数据带 demo 标志，不推入云端

## 同步状态展示
- 仅本机 (local_only)
- 正在同步 (syncing)
- 已同步 (synced)
- 同步失败 (sync_failed)
- 冲突待处理 (conflict)

## 图片策略
- 浏览器端生成缩略图 (400px) 和展示图 (1600px)
- 默认不上传原图
- Supabase Storage 保存展示图和缩略图
- 上传采用可恢复队列
