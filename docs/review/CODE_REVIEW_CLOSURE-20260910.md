# CODE REVIEW

- Task: 收口审查（L3/L4+M2-1/M2-3、备份演练、巡检、OBS-1～OBS-3、三对齐只读验证、工作区核查）
- Commit: `a9bee31` + 工作区未提交（`src/lib/sync.ts` 等 9 改 + 本轮新增 docs 未跟踪；详见正文§6）
- Reviewer: code-reviewer
- Result: 过（可收口；P0/P1 无阻塞；P2 共 4 条 backlog 不拦，行级改法见下）

> Dispatch / Evidence ID 系字段 2.0 已废弃，不填。

## P0 / P1 Findings

- 无打回项。本轮 6 大项逐项核查均过（只读验证独立重跑，不采信转述）。

| 项 | 证据 | 状态 | 意见 |
|---|---|---|---|
| 1. L3/L4+M2-3 真机 | `docs/qa/L3L4-M23-REALDEVICE-20260910.md`（7/7 过：L3-A 建改删、L3-B 模拟 pull、L4 断网回放、L4 冲突先写胜、M2-3 刷新重读；终态本地签名 `h363eddbd` 与基线一致、云端六表全 0、outbox 0）+ `docs/qa/QA_CHECKLIST.md` L8 新增 M2-3/L3/L4 三行均 `[x]` | 过 | 方法真机非走读（CDP 9336 他项目 9334 未碰）；B 端直写模拟口径如实声明（第二 profile 需二次登录故未开）；B 删不同步本地行、冲突不新造机制均只记录，符合“不替用户做产品决策” |
| 1b. M2-1 映射表软引用 | 治理目录 `字段映射表丨M2.md` 第 19 行已为“软引用（0003 已删 fk_cover_media；完整性由应用层 eq(owner)+RLS+每月巡检补偿）”；`src/lib/sync.ts:215` 映射表引用 intact；`sync.ts:601-604` BUG-16 注记已同步为同款软引用 | 过 | M2-1 验收 `grep 软引用命中映射表+sync.ts` 成立。澄清：本轮 `git diff -- src/lib/sync.ts` 整体非注释-only（含 OBS-3 功能逻辑，已由 `CODE_REVIEW_OBS-3.md` 复核过）；其中 M2-1 相关 hunks（601-604、688-693 注记段）确为注释-only，无逻辑变更，符合“注释-only”口径。转送清单 #9 未追加指向见 P2-B1 |
| 2. 备份演练 | `docs/deployment/BACKUP_RESTORE_DRILL-20260910.md`（备份仓外 `DockerBackups/photo-library/photo-library-20260910.sql` 25K/816 行在位；`postgres:17-alpine` 空库重建零 ERROR；对照 6 表/行数全 0/RLS 全 t/24 策略全对；临时容器及 2 匿名卷已删；线上只读零写） | 过 | 独立核：备份文件在位（25K）、`docker ps` 无临时库残留（仅他项目容器）；缺口见“已知缺口” |
| 3. 巡检 | `docs/deployment/PATROL-20260910.md`（SQL 与送审 §7.5/§7.1⓪b 逐字一致，0 行，下一轮 2026-10-10） | 过 | 已逐字比对送审原文（`SELECT w.id, w.cover_media_id … WHERE w.cover_media_id IS NOT NULL AND m.id IS NULL`）；本轮只读复跑同款 SQL 仍 0 行（见§5） |
| 4. OBS-1～OBS-3 | `docs/qa/BUGS_OBS-3.md`（走读 4/4 PASS，真机待补）+ `docs/qa/BUGS_OBS-3-REALDEVICE-20260910.md`（真机 4/4：删除一轮清/失败带码 `[23503]`/封面回填 rev 递增/批量首跑 pending=0，终态六表全 0）+ `docs/review/CODE_REVIEW_OBS-3.md`（过，P0/P1 无阻塞，P2/P3 7 条 backlog） | 过 | OBS-3 可关闭。独立重跑 `pnpm lint` exit=0（仅 server.mjs 预存 warning）、`pnpm ts-check` 零错，与 builder 自报一致，不再是“采信”。遗留 P2-B4（pull/upload 未带码）/P3-B7（删 work 不清 Storage blob）为 backlog 非阻塞，本次真机 Storage 残 blob 已手工清 |
| 5. 三对齐只读验证 | PGPASSFILE 只读（口令未回显未进文档；Dashboard 未动；零写）：migration 远端 11 行末位 `20260909150053` 无新 migration；RLS 六表全 `t`、策略 24 且全 authenticated；六表计数全 0；巡检 SQL 0 行；约束仅 `fk_media_work`（`fk_cover_media` 已去）；dev `/` `/find` `/tags` `/me` `/api/health` 全 200 | 过 | Local=Remote=11 仍对齐。功能抽查以 dev 为准（线上若有独立域名未单验，但云端读写/删除/回放均经真实 Supabase 验证，无反证）；console 无致命错采信 L3L4/OBS3“pending=0 无错误”+ lint/ts 双绿 |
| 6. 工作区与 secrets | `git status`：M 9（含 `src/lib/sync.ts`、`QA_CHECKLIST.md`、`HANDOFF.md`、`AGENTS.md`、`roles/*`）+ 未跟踪本轮 docs（BACKUP/PATROL/HANDOFF_OBS-3/BUGS_OBS-3×2/L3L4/CODE_REVIEW_OBS-3/模板/override/账本）均在本轮预期内；`rg key/token/password` 仅命中通用词与代码占位，无真值进仓；`.env.local` 未跟踪（gitignored）；个人脚本未进暂存 | 过 | AGENTS/`roles/*`/override/模板属 ORCA V2.1 脚手架，与功能 diff 正交，建议编排者分开确认是否同批 commit；中文个人脚本等不得进仓（行级清单见 P2-B4）。`src/` 唯一业务 diff 为 `sync.ts`（OBS-3+M2-1 注记，已复核） |

## P2 / P3 Backlog Findings

- P2-B1 转送清单 #9 未追加 M2-1 指向（不拦）：文件 `alw丨数据库管理专家/项目审查丨photo-library/转送文件清单丨photo-library.md` 第 15 行（`| 9 | M2 字段映射表 | … | R1-6 映射表（逐列+装配示例） |`）→ 改为追加 `；M2-1 已闭环：第 19 行软引用 + sync.ts:601-604 同款`。验收 `grep 软引用` 已过，故不拦。
- P2-B2 M2-2 时效注记缺失（不拦，收口后补）：① `…/M2接线送审丨photo-library.md` 第 4 行（`> 状态：代码 + 离线闭环完成…；**L1 真机证据待补**…`）头加一行 `> 时效注记（2026-09-10）：本节为送审时快照；S2/L1/M2/0003 均以后续核验与回报为准（M2 V1.0 APPROVED）。`；或 ② 转送清单第 16 行（`| 10 | M2 接线送审 | … | 代码+门禁+离线自测+L1 阻塞说明 |`）追加 `；§4§5 为送审快照，现以 S2 核验/M2 通/0003 回报为准`。二选一即闭环。
- P2-B3 `HANDOFF.md` §2 M2 行滞后（不拦）：`docs/handoff/HANDOFF.md` §2 第 2 行（`| P1 | M2 送审结论 | 等 APPROVED… |`）→ 改为 `APPROVED_FOR_EXECUTION（2026-09-10 V1.0 #20；R1-6 闭环；M2-1～M2-3 低项收口前关闭，本轮 M2-1/M2-3 已关、M2-2 转 P2-B2）`。本轮已知缺口“送审结论仍待”实际已出，以此为准。
- P2-B4 工作区未跟踪清单确认（不拦，编排者落盘前确认）：禁进仓：`备份本文件夹.command`（用户个人脚本）、`外部开发者提示词.md`、`归位表.template.md`、`编排者提示词.md`、`迁移整理提示词.md`（中文脚手架）；拟进仓：`USER_MODEL_OVERRIDE.md`、`GOVERNANCE_VERSION`、`docs/*/ *.template.md`、`docs/roles/*`、`docs/model/`、`docs/deployment/BACKUP_RESTORE_DRILL-20260910.md`、`docs/deployment/PATROL-20260910.md`、`docs/handoff/HANDOFF_OBS-3-20260910.md`、`docs/qa/BUGS_OBS-3.md`、`docs/qa/BUGS_OBS-3-REALDEVICE-20260910.md`、`docs/qa/L3L4-M23-REALDEVICE-20260910.md`、`docs/review/CODE_REVIEW_OBS-3.md` + 本文件。沿用 OBS-3 旧 backlog（P2-B4 pull/upload 带码、P3-B7 Storage 孤儿）不重复开。
- P3 沿用 `CODE_REVIEW_OBS-3.md` 7 条（localeCompare、`update` 秩、`??99`、owner 不对称、idb 注释、Storage 孤儿），不拦本轮。

## 已知缺口定性（拦 / 不拦）

| 缺口 | 定性 | 理由 |
|---|---|---|
| Storage 文件级备份未做 | 不拦 | 行级备份已闭环（25K 可重建）；bucket 存在已只读核实（private，20 对象）；文件级备份需另排期，数据量小，不阻塞收口 |
| DB 口令建议轮换 | 不拦 | 起因是演练中口令 session 回显一次（操作卫生）；未进文档/日志（rg 无真值）；轮换为加固非功能阻塞，建议收口后由用户执行 |
| M2 送审结论仍待 | 已关闭，不拦 | M2 V1.0（2026-09-10）已 `APPROVED_FOR_EXECUTION`，R1-6 闭环；HANDOFF §2 未同步属 P2-B3 文档滞后，非实质缺口 |

## 只读验证记录（供 supervisor 复检）

- DB：`supabase_migrations.schema_migrations` 11 行（首 `20260901152616` 末 `20260909150053`）；`pg_tables` 六表 `rowsecurity=t`；`pg_policies` `24|t`；六表计数全 0；巡检 SQL 0 行；约束仅 `fk_media_work`。全程 `PGPASSFILE` + docker 只读 `SELECT`，零写。
- 功能：`curl` dev `/` `/find` `/tags` `/me` `/api/health` 全 200；`docker ps` 无临时库残留；备份文件在位。
- 质量门：`pnpm lint` exit=0、`pnpm ts-check` exit=0（本轮独立重跑）。
- 红线：未改代码、未碰权限/Dashboard、未 commit/push；uid 仅缩写、UUID 仅 8 位、无 key/token/code/完整 URL 参数。
