# OBS-3 真机补测结果（2026-09-10）

> 方法：真机实测（非走读）。CDP 9336（profile `/tmp/photo-l1-chrome`，他项目 9334 未碰），
> 页面 `http://localhost:5000/`（express+vite，`/api/health` 200），Chrome 152。
> 登录态有效（uid `3e0acd69…be7e`，`/me` 显示已登录），无需重登，未触发 OAuth。
> 全部操作经页面内真实模块（`idb`/`sync`/`supabase`/`facet-config`）执行，
> 打真实 IndexedDB + 真实 Supabase（`photo_library`）。标题前缀 `OBS3-REAL-*`，即建即删。
> 密钥合规：无 key/token/code/完整 URL 参数；uid 仅缩写；UUID 仅记 8 位前缀。

## 结论

**4/4 通过。OBS-3 可关闭。** 终态：`/me` 待同步 0 项、无错误信息；
本地真实 2 件（`L1-测试-0909`、`L1-同步诊断`）未动，演示 24 件未动；
云端六表（works/media/work_facet_values/facet_values/facet_dimensions/locations）计数全 0；
outbox 0。业务代码零改动，未提交。

## ① 删除一轮即清 → 过

- 步骤：新建 1 件非 demo（含 1 图 canvas-webp + 风格/构图各 1 新值）→ 等静默（pending=0）
  → 按 `WorkStore.deleteWork` 语义删本地行+清子行排队+`enqueueDelete('work')`，
  **仅靠自动触发的一轮同步，不调显式 processOutbox、不点重试**，轮询至静默后读数。
- 证据：`deleteRound={pending:0, lastErrorMessage:null, sawSyncing:true, explicitRounds:0, retried:false}`；
  云端 work 消失、media 0 行；`outboxLeft=[]`。
- 附记：首跑曾因 harness 在自动轮进行中又显式调 `processOutbox`（被 `isSyncing` 守卫 no-op）
  导致 500ms 快照误读 `pending=1`；属测试竞态非应用 bug，重跑（等静默范式）一次即过。
  测试标题 `OBS3-REAL-DEL2-mtuws8om`（work `a0997d96`），已清。

## ② 强制失败带码 → 过

- 步骤：入队一条非法 `create work_facet_value`（work/val 均为随机 UUID，无本地行变更）
  → 跑一轮出库 → 读 `lastErrorMessage`。
- 证据：`1 items failed: create work_facet_value <uuid|uuid>: [23503] insert or update
  on table "work_facet_values" violates foreign key constraint "fk_wfv_work"`；
  形状 `N items failed: 操作表行id:[码]信息` 成立；条目 `retry=1`；
  云端孤儿行 0。清理条目后再跑一轮，pending=0、`lastErrorMessage=null`。

## ③ 封面回填回归 → 过

- 步骤：新建带封面 1 件（真实链路：`processPendingUploads`+出库到静默）
  → 读云端 rev/cover → 改标题（revision+1 + update 入队）→ 再读 → 删除。
- 证据：新建后 `cloudRev=2、coverSet=true、localRev=2/base=2`；
  编辑后 `cloudRev=3（delta=1）、cover 仍落定、标题已更新`；
  删除后云端消失，pending=0 全程无错误。测试标题 `OBS3-REAL-COVER-mtuwtg82`，
  Storage 残 blob 2 个已删。已清。

## ④ 批量+分面首跑 pending=0 → 过

- 步骤：JSON 映射 2 行（含新风格名/新构图名）→ 先断言面板映射语义
  （未知名进 tags：`downgradeOk=true`）→ 同毫秒批量建 2 件（一图一件）→ 上传+首轮出库。
- 证据：`firstRound={pending:0, lastErrorMessage:null, extraRounds:0}`；
  云端 2 件均 `rev=2、cover 落定`，A 件 tags 含两个未知新名（不丢失）；
  删除后 `goneCount=2/2`；Storage 残 blob 4 个已删；`cloudFinal` 六表全 0。
  测试标题 `OBS3-REAL-BATCH-A/B-mtuwu0s5`。已清。

## 数据纪律与环境

- 用户本地 2 行真实非 demo：四轮前后标题一致，未读内容未写入；演示 24 件未动。
- 云端测试行（works/media/wfv/values/dims）即建即删 + Storage 残 blob 已删；终态六表计数 0。
- 未改业务代码；lint/ts-check 未重跑（无改动，沿用 builder 双绿）；无 commit/push。
- 遗留（非阻塞，沿用走读结论）：P2-B4 pull/upload 路径未带码；P3-B7 云端删 work 不清 Storage（本次手工清）。

## 三行心跳

- 目标：OBS-3 真机 4 项补测。
- 剩 P0：无（4/4 通过，可关 OBS-3）。
- 下一步：编排者确认关 OBS-3 + 账本落盘（JSON 见回执）。
