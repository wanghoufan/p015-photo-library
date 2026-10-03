# CODE REVIEW

- Task: OBS-3 查因修复（src/lib/sync.ts，5 处）
- Commit: 工作区改动（基线 HANDOFF a9bee31 之后；派工未给 commit，按工作区 sync.ts 现状复核）
- Reviewer: code-reviewer
- Result: 过（P0/P1 无阻塞项；P2/P3 共 7 条 backlog，不拦 QA）

> Dispatch / Evidence ID 系字段 2.0 已废弃，不填。

## P0 / P1 Findings

- 无阻塞项。本轮 5 处改动逐条复核结论如下（位置均为 src/lib/sync.ts，另有佐证文件注明）：
- 1. 排序分级 OP_ORDER / CREATE_ENTITY_ORDER / DELETE_ENTITY_ORDER / outboxRank（543–573）——正确，与 CASCADE/三步写入同向。create 父→子（location 0 → dim 1 → work 2 → value 3 → media 4 → wfv 5）与 BUG-16 三步写入（work 空封面入库 → media → 回填）一致；delete 子→父（wfv 0 → media 1 → work 2 → value 3 → dim 4 → location 5）与云端 CASCADE 同向。全局 delete→create→update 安全：同实体 delete+create/update 不可共存（enqueueSave 见 delete 即返 sync.ts:345；enqueueDelete 先清同实体 create/update 356–365；WorkStore.deleteWork 显式清子行排队 WorkStore.tsx:706–711；孤儿 media/create 经 buildCreateRow 返 null 按成功消费 600/726）。顺序 awaits、无事务持有、无新死锁。
- 2. processOutbox 改用 outboxRank 排序（421–425）——正确。根因链已验证：generateId()=randomUUID（utils.ts:8–10）+ outbox keyPath=id（idb.ts:55）→ getAll 按随机主键返回；批量入队（persistNewWork + syncWorkFacets）同毫秒 createdAt tie 高发；旧“只按 createdAt”经稳定排序仍是随机序，wfv/media 先于父行首跑撞 FK/缺行失败、重试自愈为 pending=0。修在正确分层。
- 3. work 删除分支（692–708）：云端先显式删 wfv 再删 media，与 CASCADE 同向、纵深防御成立；media 删除错误不再吞直接抛，正确（fail-fast，且三段删除均幂等：PostgREST 删 0 行为成功，重试安全）；works 删除补 owner scoping 不构成过度收窄——单用户 PWA，owner 由同源 currentUserId 在 create 时注入，云端现 0 行、demo 永不上云；RLS 本就按 owner 隔离，此为最小权限冗余，无误删他人行风险。
- 4. postgrestError（577–582）+ processEntry 内 throw 带码（611/629/653/656/668/683/697/702/708，实际 9 处，覆盖超 builder 自报 6 处）——完整覆盖 push 路径；23505 重放语义走原始 error 判（isDuplicateKeyError:584–588，先于 wrap 检查原始 .code），无回归；Conflict 探测（465，匹配 'Conflict'/'revision'）不受 [42501]/[23503] 前缀干扰，分类正确。
- 5. lastErrorMessage（483–484/496–498）：`N items failed: op entity uuid: [code] msg` 截断 500 字——隐私合规：仅 UUID（wfv 为 workId|facetValueId 双 UUID），无 key/token/完整 URL 参数、无 uid（HANDOFF §3 铁律 5 满足）；PostgREST message 仅含约束名 + UUID 键值；全量错误仍留存于各 entry.lastError（477–482，IDB 可查），500 字截断只影响汇总展示，可接受。
- lint/ts-check：本派工禁终端未独立重跑，采信 builder 自报（lint PASS 仅 server.mjs 预存 warning；ts-check 零报错）。代码走读无反证：tsconfig 为 strict 但未开 noUncheckedIndexedAccess，Record 索引排名写法可干净过检；新增代码无 any、无 secrets、无新依赖。

## P2 / P3 Backlog Findings

- P2-B1 sync.ts:424：tiebreak 用 `localeCompare` 比 ISO 时间串——locale collation 不保证等于时序，建议改纯字典序（`ac < bc ? -1 : ac > bc ? 1 : 0`）。
- P2-B2 sync.ts:571：update 实体秩统一为 0（更新不建 FK 依赖，现状可接受）；若日后 wfv-update（单 entry 内删建 649–657）与 facet_value-update 同批，考虑给 update 也加实体分级。纯加固，非必需。
- P2-B3 sync.ts:543–573：rank 表无兜底，新 entityType 会得 undefined → NaN 排序，建议 `?? 99` 防御。
- P2-B4 错误码仍有缺口（非本轮回归，push 路径之外）：pullRemote 6 处（904/939/970/1008/1038/1070）与 uploadOneBlob（187）仍只传 message，建议后续统一走 postgrestError。
- P3-B5 owner scoping 不对称：work 删除清理带 owner（693–707），单条 wfv 删除（679–684）与 wfv-update（651–656）不带；RLS 已兜底，建议统一加 scope 或留一句注释声明依赖 RLS。
- P3-B6 idb.ts:125–129：idb.deleteWork 内部按 workId 清 outbox（by-entity 精确匹配）命中不了 media（entityId=mediaId）与 wfv（复合 id）条目；现状由 WorkStore.deleteWork（706–711）显式补清，功能无缺，建议修注释或归拢职责，防后人误认。
- P3-B7（范围外记录）：云端删 work 不清 Storage blob（预存行为，非 OBS-3 引入；是否接受 bucket 孤儿由产品/编排者定，不拦本轮）。
