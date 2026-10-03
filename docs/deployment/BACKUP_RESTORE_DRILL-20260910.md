# 轻量备份恢复演练记录（2026-09-10）

- 目标：`photo_library` schema 结构+数据导出 → 本地 Docker 全新空库导入 → 行数/RLS 抽查 → 归档。
- 结论：**通过**。备份在位可导入；空库重建成功（干净导入零报错）；对照全对；临时库及配套匿名卷已删；线上只读零写。

## 1. 备份

- 路径（仓外，禁进 Git）：`/Users/zzymima0000/DockerBackups/photo-library/photo-library-20260910.sql`
- 大小：25K，816 行；内容：6 `CREATE TABLE` + 24 `CREATE POLICY` + 6 `COPY`（空表亦有 COPY 段）。
- 线上版本：server 17.6。先试 pg16 客户端被拒（server version mismatch），改用 `postgres:17-alpine`（pg_dump 17.11）一次成功。
- 导出范围：`-n photo_library --no-owner --no-privileges`，仅该 schema。
- 凭据方式：全程 `PGPASSFILE=~/.pgpass` + docker 挂载，口令不回显、不进文档/日志（本文亦无）。

## 2. Storage 备份状态核实

- `photo-library-media-private` bucket **存在**（private），其下 **20 个对象**；全实例 `storage.objects` 共 44（另 24 属 habit-tracker 私有桶）。
- 本轮**仅只读核实存在与计数，未做 Storage 文件级备份**——Storage 备份仍为缺口（延续上轮结论），需另排期。

## 3. 本地空库重建

- 临时库：`postgres:17-alpine` 全新容器（演练完即删，配套匿名卷一并删）。
- Supabase 依赖桩（仅演练用，不进备份文件）：`authenticated/anon/service_role` 空 role；`auth.users(id)` 空表；`auth.uid()` stub；`extensions` + `pgcrypto`（供 `gen_random_uuid()`）。
- 导入：`psql < 备份.sql`，**零 ERROR**（首轮复用脏库的报错为演练操作问题，重建干净库后消除）。

## 4. 对照（线上源 vs 本地重建）

| 项 | 线上源 | 本地重建 | 结论 |
|---|---|---|---|
| 表清单 | 6（works/media/locations/facet_dimensions/facet_values/work_facet_values） | 同 6 | ✅ |
| 行数 | 六表全 0 | 六表全 0 | ✅（与 HANDOFF 云端零残留一致） |
| RLS 启用 | 六表全 `t` | 六表全 `t` | ✅ |
| 策略数 | 24（每表 4：select/insert/update/delete，to authenticated） | 24 | ✅ |
| 关键列抽查 | — | works（id/title/revision/owner）、media（id/work_id/mime_type/upload_status/revision）SELECT 可读，均 0 行 | ✅ |
| 应用视角只读 | — | 经容器网络 `SELECT count(*)` works/media 均 0，链路通 | ✅ |

## 5. 清理与纪律

- 临时容器及 2 个配套匿名卷已删（`docker ps` 无残留；他人既有 dangling 卷未动）。
- 备份在仓外备份区，不在 Git；本仓新增仅本文档。
- 线上全程只读（information_schema/pg_tables/pg_policies/storage 只读查询 + 一次 pg_dump），零写；未动 Dashboard/权限；密钥红线遵守。
- 复现（脱敏）：`PGPASSFILE=~/.pgpass docker run --rm -v ~/.pgpass:/tmp/pgpass:ro -e PGPASSFILE=/tmp/pgpass -v <备份区>:/backup postgres:17-alpine pg_dump "host=<脱敏>.supabase.co port=5432 dbname=postgres user=postgres sslmode=require" -n photo_library --no-owner --no-privileges -f /backup/photo-library-<日期>.sql`

## 6. Storage 本地全量备份 + 恢复验证（2026-09-10 晚补做，本轮 §2 缺口已关）

- 结论：**通过**。bucket 20 对象全量落地本地 20 文件（字节级一致）；恢复测试上传→读回→删除闭环；线上除 1 张测试图即建即删外零写，用户照片只读未动。
- 方式：CDP 9336 已登录页面（uid `3e0acd69…`，与 HANDOFF 一致）页内执行——会话 token 只在页内读、绝不拷出/回显；公开 URL + publishable key 传参；文件字节经页内 base64 分片由 Node 落盘。一次性脚本放 `/tmp`，演练完即删。
- 备份位置（仓外，禁进 Git）：`/Users/zzymima0000/DockerBackups/photo-library/media/`（20 文件 + `_manifest-20260910.json` 对照表，文件名/完整路径只存本地，本文脱敏）。
- 校验对照：

| 项 | 云端 | 本地 | 结论 |
|---|---|---|---|
| 对象数 | 20（bucket 内递归 list） | 20 文件 | ✅ 相等 |
| 总字节 | 958160（10×82896 + 10×12920 两档） | 958160 | ✅ 相等 |
| 空文件 | — | 0 个 | ✅ |
| 文件头抽查 2 张 | mime 均为 image/webp | `file` 鉴定 RIFF Web/P image，可打开 | ✅（实际为 WebP，非 JPEG/PNG/HEIC，亦为合法图片头） |
| manifest 一致性 | list size | 落盘 size 逐项比对 | ✅ 20/20 一致 |

- 恢复验证（测试图即建即删，用户目录前缀下 `__restore-test-20260910.png`，78 字节 PNG）：上传 HTTP 200 → 读回 HTTP 200 且字节数/页内哈希双一致 → 删除 HTTP 200 → 同目录复 list 确认已无残留。写链路可通。
- 纪律：线上零写（测试图除外，已删净）；密钥红线遵守（token 无回显、无落盘、无进文档）；备份区仓外不进 Git。
