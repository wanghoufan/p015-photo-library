# Bug 清单 (BUGS.md)

> 同一 Agent 自检记录，非独立 QA。

## 已知问题

### BUG-2: 演示数据使用外部 Unsplash 图片
- **严重度**: P3
- **状态**: OPEN
- **描述**: 演示图片依赖网络访问 Unsplash CDN
- **影响**: 离线环境下演示图片无法加载

### BUG-3: Express 全局错误中间件签名缺第 4 参数
- **严重度**: P1
- **状态**: FIXED (2026-09-07)
- **描述**: `server/server.ts` 错误处理中间件只有 `(err, req, res)` 3 参数，Express 不识别为错误中间件，`res` 实为 `next`，报错时二次崩溃 `res.status is not a function`
- **修复**: 补 ` _next: express.NextFunction` 第 4 参数

### BUG-4: dev 下 Vite 重复加载配置导致页面白屏
- **严重度**: P0
- **状态**: FIXED (2026-09-07)
- **描述**: `server/vite.ts` 内联传入完整 config 的同时未设 `configFile: false`，Vite 又从 cwd 加载一次 `vite.config.ts`，`react()` 实例化两次，所有 tsx 被双重 refresh transform，浏览器报 `Identifier 'RefreshRuntime' has already been declared`，`#root` 空白
- **修复**: `createViteServer` 加 `configFile: false`；已在内嵌浏览器逐页验证恢复

### BUG-5: package.json 缺少 "type": "module"
- **严重度**: P1
- **状态**: FIXED (2026-09-07)
- **描述**: 无 type 字段时 tsx 把配置链按 CJS 加载，`@vitejs/plugin-react-swc` 内 `import.meta.dirname` 为 undefined，`/@react-refresh` 500；且 Node 对 `.js` 报 MODULE_TYPELESS 警告
- **修复**: 加 `"type": "module"`；`vite.config.ts` 的 `__dirname` 改为 `process.cwd()` 方案（同时兼容 tsup CJS 打包，见 BUG-6）

### BUG-6: 生产包启动崩溃（顶层静态导入 vite 链 + start.sh 路径过期）
- **严重度**: P1
- **状态**: FIXED (2026-09-07)
- **描述**: `dist-server` 顶层 require `@swc/core`（tsup external，pnpm 下解析不到）；且加 type:module 后产物改名为 `server.cjs`，`scripts/start.sh` 仍指向 `server.js`
- **修复**: `server/vite.ts` 对 `vite` 与 `../vite.config` 改延迟动态导入（生产走静态服务分支，永不执行）；`start.sh` 改为 `server.cjs`；已验证 `COZE_PROJECT_ENV=PROD node dist-server/server.cjs` 正常启动，`/me` 显示已配置

### BUG-7: 分面筛选按 id 比对导致风格/构图计数全 0 且选中筛空
- **严重度**: P1
- **状态**: FIXED (2026-09-08)
- **描述**: `filter-engine.ts matchesFacetValues` 用选项名称去比 `facetValues[].id`，
  恒为 false：计数全 0，选中任一风格即筛空画廊
- **修复**: 改按 `fv.name` 比对（与 UI/URL 存名称一致）；桌面端已验证真实计数

### BUG-8: 图片读取失败静默跳过（HEIC 等）
- **严重度**: P1
- **状态**: FIXED (2026-09-08)
- **描述**: `processImage` 抛错即 `continue`，用户侧表现为“传不上去”且无任何提示
- **修复**: 解码失败降级为原文件直存（读尺寸）；彻底读不出则抛可展示错误，UI 逐条显示

## 已关闭
- BUG-1: SyncStatus 曾用 `require('@/lib/sync')`（P2）— 2026-09-07 复查 `src`/`server`/配置内已无 `require(`，关闭。

### BUG-9: 编辑页直连时表单空（IDB 异步到达晚于首渲染）
- **严重度**: P1
- **状态**: FIXED (2026-09-08)
- **描述**: `AddWork` 全用 `useState` 初始值，直连 `/edit/:id` 时既有数据到不了表单，
  提交按钮 permanent disabled
- **修复**: `seedKey(id+updatedAt)` 到达后回填一次，不覆盖用户输入

### BUG-10: Docker 构建失败（alpine 无 bash）
- **严重度**: P1
- **状态**: FIXED (2026-09-08，M4 验证时发现)
- **描述**: builder 用 `node:22-alpine`，无 bash；`pnpm build` 调 `bash ./scripts/build.sh`，
  报 `sh: bash: not found`，exit 1
- **修复**: builder 阶段加 `apk add --no-cache bash`（不动脚本，改动最小）

### BUG-11: 容器健康检查起不来（localhost 解析到 ::1）
- **严重度**: P2
- **状态**: FIXED (2026-09-08，M4 验证时发现)
- **描述**: 容器内 busybox `wget http://localhost:3000/healthz` 走 `::1` 被拒
  （`server.mjs` 只听 `0.0.0.0`），`FailingStreak` 递增，状态卡 `starting`；
  宿主 curl 8082 全 200，服务本身正常
- **修复**: `Dockerfile` HEALTHCHECK 与 `compose.yaml` 健康检查 URL 改 `127.0.0.1`

### BUG-12: 生产包 SW 劫持 dev 页面（旧包咬住）
- **严重度**: P0（阻塞 L1 整晚）
- **状态**: FIXED（2026-09-08 夜：已注销，用户页 `sw=NO-SW` 确认）
- **描述**: 早期生产构建（`dist/`，含 registerSW.js + sw.js）在用户 Chrome 注册了
  scope `http://localhost:5000/` 的 SW（ACTIVATED + fetch handler NOT_SKIPPABLE），
  切回 `pnpm dev` 后页面仍跑旧包：新代码（含报错红字）永不到达，登录点击"跟没发生一样"。
  教训见 HANDOFF §3 第 1 条，今回是该教训的完整复现。
- **修复**: chrome://serviceworker-internals 手动 Unregister（自动化点不动 WebUI 按钮）；
  dev 下放过的自注销 `public/sw.js` 已删（目录已移除）；`src/` 无 SW 注册代码，
  dev 下注销后永不复发。

### BUG-13: handleSignIn 无 try/catch（登录失败静默吞）
- **严重度**: P2
- **状态**: FIXED（2026-09-08 夜顺手修，已随 `a643929` 入库，保留）
- **描述**: `signInWithOAuth` 抛错时无任何展示，用户侧"点了没反应"且无从排查
- **修复**: try/catch → authError 红字（保留，不算 TEMP）

### BUG-14: 桌面 Chrome 程序化跳转被静默吞 → 已结案：环境问题，不是产品 Bug
- **严重度**: P1（曾阻塞桌面端 L1）
- **状态**: **RESOLVED / 环境侧**（2026-09-09 上午定案）
- **结论**: 代码链路 100% 正常，**代码侧零修改**。根因是用户那台 Chrome 实例陈旧：
  PID 98366，2026-09-01 12:09 启动，连续运行 8 天未重启；期间 Chrome 自动更新，
  主 binary 已到 `152.0.7977.76` 而 renderer 仍 `152.0.7977.65`（新旧版本混跑），
  导致跨域程序化导航被静默丢弃（无请求、无报错、无跳转）。
- **定案证据（干净 Chrome 复现，2026-09-09）**：新建独立 profile 的 Chrome
  `152.0.7977.83`（CDP 9335，headless）访问同一 dev server 的 `/me`，
  由 CDP 派发**真实鼠标点击**登录按钮，6 秒内网络链完整且成功离境：
  1. `REQ yacgnikzvutbpoqvokth.supabase.co/auth/v1/authorize` ×2
  2. `REQ accounts.google.com/o/oauth2/v2/auth`
  3. `RES 200 accounts.google.com/v3/signin/identifier`
  落地 URL = `accounts.google.com/v3/signin/identifier`。
  同一份代码、同一个 dev server、零改动 → 反证代码无责。
- **处置**: 用户彻底退出 Chrome（Cmd+Q）后重开即可恢复；或改用全新 profile 实例。
- **产物**: `scratch/cdp-probe.mjs`（TEMP 探针，gitignored，不进库，用完即删）。
- **方法论沉淀**: 遇"跳转/导航类灵异现象"，先换**干净浏览器实例**做对照复现，
  能在一次操作内把"代码问题 / 环境问题"劈开，不要在原浏览器上反复归因。
- **历史记录（保留备查）**:
  - 描述：用户 Chrome（含无痕）中，人手点击登录按钮 handler 正常执行
    （TEMP 诊断：clicks=1，一路到 step=5），`signInWithOAuth` 返回 ok 且带 url，
    但 `location.assign(url)` 与 `window.location.href = url` 都静默无导航、无报错、无跳转，
    React 状态完好。服务端已证清白（curl /authorize 正常 302 到 Google）。
    非 SW（已注销）、非插件（无痕复现）。
  - 绕行：`skipBrowserRedirect: true` 取 url + 页面内绿色兜底直链（真人点 `<a>`），
    真机测试优先。相关 TEMP 代码 L1 后清理，见 HANDOFF §2。
  - QA 回测5：clicks 仍 0；但捕获监听正常（记下了空白点击），第二次误点了画廊筛选——
    证实"误点致页内乱跳"（此前 /me→/ 之谜即误点画廊导航），并非代码自发导航。
    窗口前后台乱切也干扰。

### BUG-15: 登录票据无人消费 → 登录永远不生效（已修）
- **严重度**: P0（登录链路第二个真因，与 BUG-14 叠加导致"点了没反应"）
- **状态**: **FIXED**（2026-09-09 上午）
- **现象**: 跳转已通（BUG-14 解决后），Google 授权成功、回调回到 `localhost:5000`，
  但页面始终未登录：**无报错、无 session、localStorage 全空**。
- **根因（两处叠加）**：
  1. 本 Supabase 项目的 Google 登录回落 **implicit flow**，票据落在 URL **hash**
     （`#access_token=…&refresh_token=…`），不在 query。
     而 `consumeLoginCallback` 只读 `window.location.search`，
     且 supabase-js 2.95 默认 PKCE，不自动消费 implicit hash —— 票据无人接。
  2. `Gallery.tsx` 挂载时 `replaceState('/')` 同步筛选条件，**把 hash 一起抹掉**，
     App 的 `useEffect` 排在它后面，等读到时票据已经没了。
- **证据链**（干净 Chrome + CDP 实测，票据值一律不出屏）：
  - 早期注入捕获落地 URL：`localhost:5000/ #[access_token,expires_at,expires_in,provider_token,refresh_token,sb,token_type]`
  - hash 存活时刻：`{文档最早:true, DOMContentLoaded:true, load:true, 1.5秒后:false}`
  - replaceState 调用栈指向 `Gallery.tsx:37`
  - 手动 `setSession` 用同一票据 → `ok:true, uid 3e0acd69…`（证明票据有效，非服务端问题）
- **修复**：
  1. `src/lib/supabase.ts`：新增模块级 `urlSnapshot`，**在模块加载阶段**就把
     hash/query 里的票据抓到手（抢在 React 之前）；`consumeLoginCallback` 改为消费快照，
     同时覆盖 implicit（hash → `setSession`）与 PKCE（query code → `exchangeCodeForSession`）。
  2. `src/pages/Gallery.tsx`：`replaceState` 拼接时保留 `window.location.hash`。
  3. `detectSessionInUrl` 维持 `false`（避免 supabase 抢先清理 URL）。
- **验证**: 重新登录后 `/me` 显示「已登录 / 3e0acd69…」，`getSession()` 有 session，
  localStorage 写入 `sb-yacgnikzvutbpoqvokth-auth-token`。lint/ts 双绿。
- **教训**: 回调票据要**在模块阶段快照**，不要等到 `useEffect`；任何 `replaceState`
  全量覆盖 URL 的组件都是 OAuth 票据的潜在杀手。

### BUG-16: 云端同步必失败 —— works 与 media 双向外键死锁（P0，已修：方案 A）
- **严重度**: P0（M2 云端读写完全不可用；本地 CRUD 不受影响）
- **状态**: **FIXED**（2026-09-09 中午；采用**方案 A 代码层**修复，未改 schema）
- **现象**: 登录后同步，媒体能上传（`uploaded:1`），但报 `N items failed`，
  云端 `works` / `media` 始终 **0 行**。
- **错误原文**（抓自 HTTP 响应体）：
  - `POST /rest/v1/works` → `409` `23503`
    `insert or update on table "works" violates foreign key constraint "fk_cover_media"`
    （details: Key is not present in table "media"）
  - `POST /rest/v1/media` → `409` `23503`
    `insert or update on table "media" violates foreign key constraint "fk_media_work"`
    （details: Key is not present in table "works"）
- **根因**: schema 中 `works.cover_media_id → media.id` 与 `media.work_id → works.id`
  构成**双向外键**。PostgREST 只能单表 insert，谁先插都违反另一个约束 ⇒ 死锁，一条也进不去。
- **候选修复**:
  - **A（代码层，业务仓即可改，推荐先做）**：三步写入 ——
    ① insert `works`（`cover_media_id` 传 null）→ ② insert `media` → ③ update `works.cover_media_id`；
    或改为调用一个 RPC 在单事务内完成（更干净，但需新建 DB 函数＝要送审）。
  - **B（schema 层，需 DBA 送审）**：`works.cover_media_id` 去掉外键，或改为
    `DEFERRABLE INITIALLY DEFERRED`，或去掉 `media.work_id` 外键。
  - **建议**：先用 A 打通验证，同时把 B 并入 M2 复审一并提给 DBA。
- **实际修复（`src/lib/sync.ts`，三处）**:
  1. `create work`：`row.cover_media_id = null`（先不带封面入库，绕开 `fk_cover_media`）
  2. `create media`：入云成功后，若该 media 正是所属作品的封面 → 回填 `works.cover_media_id`
  3. `delete work`：删云端关联 `media` → 删 `works`
- **R2-1 修订（2026-09-09 下午，复审 CHANGES_REQUIRED 后）**：
  管理员 Docker 实测与我方线上复现完全一致 —— 回填 PATCH 被 `enforce_revision_guard` 拒
  （`400 P0001 "revision must be old+1 (table works, got 1, want 2)"`），
  且原代码只查 `error` 不查影响行数，失败被静默吞掉 → **封面此前从未回填成功过**。
  修复：
  1. 回填改走乐观锁：`UPDATE SET cover_media_id + revision=base+1 WHERE id+owner+revision=base`
     （`select('revision')` 验证影响行数，0 行即抛冲突）；
  2. 成功后本地 `revision / baseRevision` 同步 +1（否则后续编辑必判冲突）；
  3. 删 work 流程**去掉手工清封面**，改由触发器 `trg_media_nullify_cover` 自动清
     （删 media 时置 NULL 并 +1 revision），同时绕开"删库拿不到 base revision"的死结。
- **R2-1 修复后验证（干净状态全流程）**：新建 → 云端 `cover` 落定 + `rev=2` ✔ →
  编辑 → `rev=3` ✔ → 删除 → 云端消失 ✔；`pending=0`。
  遗留观察：首跑同步有 1 条失败、重试即成功（疑似 wfv/media 入队顺序），待查。
  **复现记录（2026-09-09 深夜，0003 上线后发布回报端到端）**：删除环节首跑再次出现
  `pending=1`（云端 works 已消失、本地行暂留、无错误信息），重试一轮即清（`pending=0`）；
  本地测试幽灵行已按标题前缀精确清除，用户数据未动。与 OBS-3 同源，收口时查。
- **验证（2026-09-09 中午，R2-1 修复前口径，留档）**：新建 → 云端 `rev=1` ✔ → 编辑 → 云端 `rev=2` ✔
  → 删除 → 云端消失 ✔；`pending=0`，`lastSuccessAt` 首次有值。（当时 cover 实际未回填成功，见上方 R2-1 修订段。）
- **schema 层根治已落地**：0003（DROP `fk_cover_media`，B1）于 2026-09-09 上线
  （复审 V1.1 `APPROVED_FOR_EXECUTION`，正式 Migration `20260909150053`）；
  DEFERRABLE 方案已否决（送审 §4）。方案 A 三步写入保留为纵深防御。
- **复现/取证脚本**: `scratch/cdp-sync-diag.mjs`、`scratch/cdp-cloud.mjs`（TEMP，收口删）。
- **注意**: `sync.ts` 目前只把错误汇总成 `N items failed`，**具体错误被吞**，
  排查只能靠抓 HTTP 响应体；建议顺手把 detail 落到 `lastErrorMessage`（可见性改进）。

### BUG-17: 删除操作永远推不上云端（isDemoEntity 误吞 delete 意图）
- **严重度**: P1（删除只在本地生效，云端残留；随后 pullRemote 会把已删作品拉回本地"复活"）
- **状态**: **FIXED**（2026-09-09 中午）
- **根因**: `processOutbox` 里 `if (await isDemoEntity(entry))` 会把条目当 demo 丢弃；
  而 `isDemoEntity` 在本地查不到该行时兜底返回 `true`（`?? true`）。
  删除作品时本地行已删 → 查不到 → delete 意图被判定为 demo → **直接丢弃，永不推送**。
- **修复**: `if (entry.operation !== 'delete' && await isDemoEntity(entry))` —— delete 意图跳过 demo 判定。
  （demo 作品在 `WorkStore.deleteWork` 里本就不入队，不存在 demo 的 delete 意图，安全。）
- **现象佐证**: 本地删除后 pending 归 0、无报错，但云端仍在；随后被拉回本地"复活"。

### BUG-18: outbox 孤儿条目永久卡住（processingAt 未回收）
- **严重度**: P2（pendingCount 卡住不降，UI 一直显示"待同步 N 项"）
- **状态**: **FIXED**（2026-09-09 中午）
- **根因**: `processOutbox` 处理前把条目标记 `processingAt`，但同步中途刷新/关页
  会留下"处理中"的孤儿；下次进来 `if (entry.processingAt) continue` **永久跳过它**。
- **修复**: 每轮开始先回收 —— `processingAt` 早于 60 秒前的条目重置为 `null`，重新参与同步。
- **现象佐证**: 残留一条 `work/delete`（retry=0、无错误）却始终 pending=1；
  回收后 `pending=0`、`lastSuccessAt` 首次有值。
