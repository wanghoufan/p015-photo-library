# Supabase 接入方案 (SUPABASE_INTEGRATION_PROPOSAL.md)

## 状态: ⏳ 待审核

## 接入信息
- **工具名**: 摄影作品库 (photo-library)
- **独立 Schema**: `photo_library`
- **数据敏感度**: 个人摄影作品、私人备注
- **Auth**: 复用共享项目既有 Auth（Google OAuth）
- **Realtime**: 首发不启用
- **Storage**: `photo-library-media-private` bucket
- **离线能力**: IndexedDB + outbox
- **Runtime**: Mac Mini Docker（未来）

## 数据模型
详见 `docs/architecture/DATA_CONTRACT.md`

## RLS 策略（待审）
- 所有表启用 RLS
- SELECT/INSERT/UPDATE/DELETE 均限定 `owner_user_id = auth.uid()`
- UPDATE 的 USING 和 WITH CHECK 均验证归属
- 不允许 UPDATE 改写 `owner_user_id`

## Storage 策略（待审）
- Bucket: `photo-library-media-private`
- 路径隔离: `<owner_user_id>/...`
- 仅允许上传/读取自己的文件

## Revision 冲突规则
- UPDATE 带 `WHERE revision = :baseRevision`
- 返回 0 行 → 冲突状态
- 客户端展示冲突，不静默覆盖

## 备份方案
- Supabase 结构/数据导出到 `DockerBackups/photo-library/`
- 不进 Git

## 未验证项
- [ ] Schema 创建
- [ ] Expose 配置
- [ ] GRANT 权限
- [ ] RLS Policy
- [ ] Storage Bucket
- [ ] Auth Redirect URL
- [ ] 跨用户越权测试
- [ ] 多设备同步测试
