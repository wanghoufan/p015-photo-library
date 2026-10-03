# L3/L4 + M2-3 真机收尾结果（2026-09-10）

> 方法：真机实测（非走读）。CDP 9336（profile `/tmp/photo-l3l4-chrome`，他项目 9334 未碰），
> 页面 `http://localhost:5000/`（express+vite，`/api/health` 200），Chrome 152。
> 登录态有效（`/me` 显示已登录，uid `3e0acd69…be7e`，页内 `currentUserId()` 返回同 uid 前 8 位），
> 未重登、未触发 OAuth。全部操作经页面内真实模块（`idb`/`sync`/`supabase`/`utils`）执行，
> 打真实 IndexedDB + 真实 Supabase（`photo_library`）。标题前缀 `L3L4-REAL-*`，即建即删。
> B 端注记：未开第二 profile（需二次 Google 登录＝用户交互，擅自动作越界），按任务口径走
> **云端直写模拟**，写语义逐项镜像真实设备 push（insert rev=1 / update WHERE id+revision SET rev+1 /
> delete eq id+owner）。密钥合规：无 key/token/code/完整 URL 参数；uid 仅 8 位缩写；行 id 仅 8 位前缀。
> 业务代码零改动（`src/` 唯一 diff 为本链 builder 既有交付，qa 未碰；lint/ts 沿用双绿，未重跑）。

## 结论

**逐项通过。** 终态：本地 24 件（demo 24，非 demo 0，签名 `h363eddbd` 与基线一致，测试残留 0）；
云端六表（works/media/work_facet_values/facet_values/facet_dimensions/locations）计数全 0，测试标题残留 0；
outbox 0，pending 0，无错误信息，冲突记录 0。临时 scratch key（`l3l4-qa-ids`）已清。

| # | 项 | 结果 |
|---|---|---|
| 1 | session 确认（`/me` + `auth.getUser()`） | 过 |
| 2 | L3-A：本地建/改→云可见 | 过 |
| 3 | L3-B（模拟）：云建/改→pull 本地可见；云删→pull 行为记录 | 过（1 个如实记录，见③） |
| 4 | L3-A 删→云消失 | 过 |
| 5 | L4 断网改→重连回放 | 过（含 2 次误测纠正，见⑤） |
| 6 | L4 同行两端各改一次→冲突行为记录 | 过（未新造机制） |
| 7 | M2-3 新建→刷新→云端重读仍在→删净 | 过 |

## ① session 确认 → 过

- 步骤：CDP 读 localStorage（`sb-*-auth-token` 存在且含 access_token，只判有无不取值）→
  `Page.navigate /me` → 读 DOM → 页内 `import('/src/lib/supabase.ts').currentUserId()`。
- 证据：`/me` 显示「已登录 `3e0acd69…be7e`、Supabase 已配置、待同步 0 项、在线」；
  `currentUserId()` 返回 `3e0acd69…`，与页面一致。session 有效，无需重登。

## ② L3-A 建/改 → 过

- 步骤：按 `WorkStore.persistNewWork`/`updateWork` 同语义写本地行（无图：mediaCount 0、cover null，
  非 demo）→ `enqueueSave` → 等静默 → 云端 select 断言。
- 证据：建后云 `rev=1` 且标题一致（行 `37564a02`）；改后云 `rev=2` 且新标题一致；
  两轮 `pending=0、lastErrorMessage=null`。

## ③ L3-B（模拟）→ 过，1 记录

- 建：云直写 insert（rev=1，owner=uid）→ `pullRemote` → 本地行出现（标题一致、rev=1、非 demo）。
  证据行 `c8defb03`，`bCreateVisible=true`。
- 改：云直写 update（WHERE id+revision=1，SET rev=2，镜像设备 push）→ pull →
  本地标题/rev/base 全跟上（rev=2、base=2）。`bUpdateVisible=true`。
- 删：云直写 delete → 云端确无该行 → pull → **本地行仍在**（记录：`pullRemote` 只有远端 upsert，
  无 tombstone/缺失即删语义；删除同步是 push 方向的，B 端删后 A 端需靠 A 自己删或另行对账。
  现有设计如此，本轮只记录，不新造机制）。`pending=0` 全程无错误。
- 该行本地残留后续走标准删除路径清掉（见收尾，云幂等成功）。

## ④ L3-A 删 → 过

- 步骤：按 `WorkStore.deleteWork` 语义（无图无分面：`idb.deleteWork` + `enqueueDelete('work')`）→
  等静默 → 本地/云端双读。
- 证据：行 `37564a02` 本地消失、云端 `select eq id` 0 行，`pending=0` 无错误（B 端视角：云消失）。

## ⑤ L4 断网回放 → 过（误测纠正如实记）

- 误测 1：首次用短连接发 `Network.emulateNetworkConditions offline:true` 后直接改，
  结果在线提交（pending=0）。根因：Network 域状态跟 CDP 连接走，短连接退出即丢弃，
  emulation 从未生效。后加页内 fetch 守卫（通则判 fail，不出误测数）。
- 误测 2：`Network.enable` 后再单发 emulate 仍不生效（同上：不同连接），且旧 runner
  `ws.close()` 在 enable 后因事件洪流 hang 退出（修为 `terminate()+exit(0)`）。
- 正确做法：**单 CDP 长连接**（`l3l4-run.mjs`）：enable → offline → 探针 → 离线改 →
  online → 验证 → disable。探针 `fetch no-store` 本地+远端双 FAIL，确属真离线。
- 证据（行 `9d98b40b`，RowC2）：离线改后本地 rev=2、新标题，出库排队
  `update:work retry0`、`pending=1`；重连即时读云仍是旧标题 rev=1（离线改未漏出）；
  回放后云 rev=2 + 新标题，`pending=0、lastErr=null`。
- 附：RowC（行 `0ac64af8`）为误测 1 的在线提交产物，转为普通在线编辑证据（云 rev=2+标题一致），
  已随收尾删净。

## ⑥ L4 同行冲突 → 过（只记录，不新造机制）

- 步骤：RowD 推云 rev=1 → B 端直写改云（WHERE rev=1 → rev=2，标题 `-B`）→
  A 端本地改（stale base=1，标题 `-A`，本地 rev=2）→ 出库。
- 证据（行 `aa938ddc`）：`lastErrorMessage` =
  `1 items failed: update work aa938ddc: Conflict: revision mismatch - remote has been modified`
 （形状 `N items failed: 操作表行id:[码/Conflict]信息` 成立）；`listConflicts()` 1 条
 （kind=work，expected=1）；云端保留 B 端标题 rev=2（先写胜，A 被拒，无静默覆盖）；
  条目 `update:work retry1`、`pending=1`。
- 解决走现有路径：标准删除（delete 不过 revision）→ 云端消失 → `clearConflict` →
  `pending=0、conflicts=0、无错误`。

## ⑦ M2-3 新建→刷新→云端重读 → 过

- 步骤：RowE 建并推云（rev=1，id 进 localStorage scratch，跨 reload 保留）→
  CDP `Page.reload` → 等 7s → 断言 → 标准删除 → 双端复读。
- 证据（行 `84b62a47`）：重载后会话自动恢复（uid 有值）；本地行在（rev=1）；
  云端重读行在（rev=1、标题一致）；删后本地/云端双消失，`pending=0` 无错误。

## 数据纪律与环境

- 本 profile 为 L3L4 专用新 profile：基线本地 24 件＝demo 24、非 demo 0（用户真实 2 件不在此 profile，
  无扰动）；终态签名与基线一致（`h363eddbd`），demo 24 未动。
- 云端测试行即建即删（works 直写/推送共 6 行次，wfv/facet/location 全程 0 行，无 Storage 写入——
  全部测试行无图）；终态六表计数全 0，云端 `L3L4-REAL-` 标题残留 0。
- 未改业务代码；无 commit/push；9334 未碰（当时无监听）。

## 三行心跳

- 目标：L3/L4 + M2-3 真机收尾。
- 剩 P0：无（逐项通过，终态归零）。
- 下一步：编排者确认 + 账本落盘（JSON 见 qa 回执）。
