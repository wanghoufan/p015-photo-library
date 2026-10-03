# BUGS

| Bug ID | Priority | Stage P0 Blocking? | Repro | Status | Current Task | 备注（截图/日志一句） |
|---|---|---:|---|---|---|---|
| OBS-3（删除首跑 pending=1、重试即清；lastErrorMessage 无码不可见） | P1 | 否（P0/P1 无阻塞，code-reviewer 已过） | 见下 §复现/走读依据（本轮派工通道不起终端不跑脚本：以下均为代码走读+静态断言，未真机，已如实注明） | PASS（走读 4/4；真机未验，转正需真机复验） | builder 5 处已落盘 src/lib/sync.ts；QA 本轮静态验证通过，真机 4 项留给编排者补测 | 无截屏/日志（未起终端）；走读依据文件行号见正文；隐私合规：仅 UUID，无 key/token/URL 参数，uid 未记录 |

## Fix Attempt Fingerprint

- Task ID: OBS-3
- Root Cause Hypothesis: randomUUID 主键 + 同毫秒 createdAt tie → getAll 按随机主键返回，旧“只按 createdAt”排序实为随机序；wfv/media 先于父行首跑撞云端 FK/缺行失败，重试因依赖已就位而自愈（pending=1→0）；另 media 删除错误被吞 + lastErrorMessage 只汇总计数无明细，致“无错误信息”。
- Approach: builder 5 处（outboxRank 分级排序 / processOutbox 改排序 / work 删除显式删 wfv→media + owner scoping + 错误直抛 / postgrestError 带码 / lastErrorMessage 带码截断 500 字）；QA 本轮只验不改。
- Files Changed: 本轮 QA 零改动（业务代码不动）。被测文件 src/lib/sync.ts；佐证 src/lib/utils.ts:8-10、src/lib/idb.ts:55、src/stores/WorkStore.tsx:369-397/429-486/686-715。
- Verification: 代码走读 4 项（见下），真机未验（派工约束）。
- Failure Reason: 无（走读未发现阻塞性失败）。
- Difference From Previous Attempt: 首轮 OBS-3 现象“首跑 pending=1 无错误信息、重试即清”（BUGS.md BUG-16 遗留观察 + HANDOFF §1.6）；本轮排序+可见性双修后，首跑即应按依赖序成功，失败亦必带码可见。

> Attempt ID / Dispatch ID / Model-Backend 系字段 2.0 已废弃，不填（模型轨迹记账本）。

---

## QA 结论（给编排者）

- **结论：走读 PASS，真机未验。** 4 项静态断言全部通过，未发现 P0/P1 阻塞；不关闭 OBS-3，转正需真机复验一次。
- **落盘**：本文件（`docs/qa/BUGS_OBS-3.md`）；未改 `docs/qa/BUGS.md`、`docs/qa/QA_CHECKLIST.md`、未改业务代码。
- **数据纪律**：未碰用户真实数据（本地 2 行非 demo 未读未写）；云端即建即删（本轮未建）；demo 不上云逻辑确认保留（`sync.ts:449` + `isDemoEntity`）。

## 4 项逐项结果

### ① 真机删除一轮即清（首跑 pending=1、无错误信息）→ 走读 PASS，真机待补

- **结果**：走读 PASS（逻辑上消除“首跑 pending=1 无错误”模式）；**未真机**。
- **走读依据**：
  1. 删除入队已收敛为单一条目：`WorkStore.tsx:686-715` 非 demo 删除先清子行排队（media/wfv `deleteOutboxByEntity`），只留一条 `enqueueDelete('work', id)`。单 entry 不存在“子先父后”乱序，首跑即全量处理。
  2. 云端删除顺序与 CASCADE 同向：`sync.ts:692-708` 先显式删 `work_facet_values`（693-697）再删 `media`（698-702）最后删 `works`（704-708）；注释声明 PostgREST 删 0 行为成功、天然幂等，重试安全。
  3. 错误不再吞：media/wfv 删除 `if (…Error) throw postgrestError(…)`（697/702），旧“无错误信息”路径已堵；失败必进 `failureDetails`（484）并计 `retryCount/lastError`（477-482）。
  4. 全局排序 delete 最先（`OP_ORDER delete:0`，543），同轮内删先于建改，无新死锁（`enqueueSave:345` 见 delete 即返、`enqueueDelete:356-365` 先清同实体建改，互斥成立）。
- **复现步骤（真机补测用，即建即删）**：登录 → 新建 1 件非 demo（含 1 图+1 风格）→ 待 `pending=0` → 删除该件 → 观察一轮后 `pending` 是否为 0、`lastErrorMessage` 是否为 null；若 `pending=1` 则记录 `lastErrorMessage` 全文 + 该 `work/delete` entry 的 `lastError/retryCount`，打回 builder。

### ② 强制失败 lastErrorMessage 带[码] → 走读 PASS（push 路径），真机待补；附缺口声明

- **结果**：走读 PASS（push 路径全覆盖）；**未真机强制失败**。
- **走读依据**：
  1. `postgrestError`（577-582）格式为 `` `[${code}] ${message}` `` 并保留 `.code`；`processEntry` 内 push 路径 9 处 throw 均走它（create:611/629；wfv-update 删建：653/656；update：668；wfv-delete：683；work-delete 清理：697/702；works-delete：708），覆盖超 builder 自报。
  2. 汇总格式（496-498）为 `N items failed: op entity uuid: [code] msg; …` 截断 500 字；明细逐条（484）含操作/表/行 id，UUID 仅为行标识（wfv 为 `workId|facetValueId` 双 UUID，294-302），无 key/token/完整 URL 参数、无 uid，符合 HANDOFF §3 铁律 5。
  3. `23505` 重放语义走原始 `error.code` 先判（584-588/606-610），不受 `[码]` 前缀 wrap 影响；Conflict 探测（465 匹配 `Conflict`/`revision`）不受 `[42501]/[23503]` 前缀干扰。
  4. 全量错误仍存各 entry `.lastError`（477-482，IDB 可查），500 字只截汇总展示，可接受。
- **缺口声明（非阻塞，code-reviewer P2-B4 同款）**：`pullRemote` 6 处（904/939/970/1008/1038/1070）与 `uploadOneBlob`（187）仍只传 message，未走 `postgrestError`。若强制失败发生在 pull/upload，`lastErrorMessage` 仍无 `[码]`。不拦 OBS-3（删除/建改 push 路径已全），建议 backlog。
- **复现步骤（真机补测用）**：断网或 RLS 拒绝条件下触发一次同步失败 → 检查 `/me` 或 SyncState 的 `lastErrorMessage` 是否含 `[码]` 前缀（如 `[23503]`/`[42501]`/`[PGRST…]`）；截图只拍码与约束名，勿贴完整 URL/key。

### ③ 封面回填回归（新建→封面落定 rev 递增）→ 走读 PASS，真机待补

- **结果**：走读 PASS（R2-1 逻辑原样保留，排序与其同向）；**未真机**。
- **走读依据**：
  1. 三步写入保留：`create work` 置 `cover_media_id=null`（603）→ `create media` → 封面回填（616-642）走 revision 乐观锁（`SET cover+revision=base+1 WHERE id+owner+revision=base`，623-628）+ `.select('revision')` 验影响行数（630-632，0 行抛 Conflict）。
  2. 本地 revision 同步 +1（635-641）保留，后续编辑不误判冲突；删 work 不手工清封面（注释 688-690，触发器 `trg_media_nullify_cover` 负责），R2-1 死结未重现。
  3. 新排序 `CREATE_ENTITY_ORDER work:2 → media:4`（546-553）与三步写入同序，不会把 media 排到 work 之前；create 全局在 delete 之后、update 之前，无干扰。
- **复现步骤（真机补测用）**：新建 1 件带封面 → 查云端 `works.revision`（预期回填后 +1，如 rev=2）且 `cover_media_id` 落定 → 编辑一次标题 → 预期 rev 再 +1；任一步 0 行/400 P0001 即挂，打回 builder。

### ④ 批量建作品+分面首跑 pending=0 → 走读 PASS，真机待补

- **结果**：走读 PASS（父→子分级覆盖批量入队依赖）；**未真机**。
- **走读依据**：
  1. 批量入队依赖链（`WorkStore.tsx:301-397/429-486/537-570`）：`location(0) → facet_dimension(1) → work(2) → facet_value(3) → media(4) → work_facet_value(5)`，与 `CREATE_ENTITY_ORDER`（546-553）逐级对应；旧代码同毫秒 `createdAt` tie 经稳定排序仍随机，是首跑撞 FK 根因（`utils.ts:8-10` randomUUID + `idb.ts:55` keyPath=id 佐证），现 `outboxRank`（565-573）+ `processOutbox` 排序（421-425）显式分级，`createdAt` 只做同级 tiebreak。
  2. `update` 秩统一 0（571）：更新不建 FK 依赖，可接受（P2-B2）；wfv-update 单 entry 内删建（649-657）+ 去重后 `isDuplicateKeyError` 判（656），重放安全。
  3. demo 隔离保留：`sync.ts:449` 非 delete 才判 demo；`persistNewWork`/`batchImport` 的 demo 通道不入队（WorkStore 690-700/seedDemoData），批量建非 demo 不会被误吞。
- **复现步骤（真机补测用）**：批量导入 2-3 图（一图一件，含新风格名）→ 首轮同步后 `pending` 是否为 0；若首跑 `pending≥1` 则记录失败条目 `operation/entityType` 是否为 `work_facet_value/media` 先于父行，并附 `lastErrorMessage` 全文，打回 builder。

## 遗留挂项

- 真机 4 项均未验（本派工禁终端）：① 删除一轮即清 ② 强制失败带码 ③ 封面 rev 递增 ④ 批量分面首跑 pending=0。需编排者派真机补测后转正。
- P2-B4 缺口（pull/upload 未带码）建议入 backlog，不拦本轮。

## 三行心跳

- 目标：OBS-3 删除首跑 pending=1 + lastErrorMessage 带码验证。
- 剩 P0：无（本轮走读无 P0/P1 阻塞；真机转正待补）。
- 下一步：编排者派真机 4 项补测（上文复现步骤），通过后关 OBS-3。
