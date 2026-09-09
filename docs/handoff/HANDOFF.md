# 交接文档 (HANDOFF.md)

> 最后更新：2026-09-09 夜（L1 攻坚暂停点）。下一 Agent 先读本文件 + `AGENTS.md`，再开工。

## §0 当前服务状态（先看这个）

- **5000 端口跑的是开发服务**（`pnpm dev` → `scripts/dev.sh` → `tsx watch server/server.ts`，
  PID 91258，日志 `/tmp/photo-dev.log`）。`/api/health` 实测 **200**。
- **Git 有 6 个文件未提交**（本会话后半 L1 攻坚的全部改动，见 §1；含 TEMP 调试代码，
  **删 TEMP 之前绝不 commit**，且 commit 本来就要用户明确授权）：
  `src/App.tsx`、`src/lib/supabase.ts`、`src/pages/{Me,WorkDetail}.tsx`、
  `docs/handoff/HANDOFF.md`、`docs/qa/BUGS.md`。
  唯一未跟踪文件是 `备份本文件夹.command`（用户个人脚本，不动它）。
  HEAD = `7349155`（M4 两连提交已入库：`f1cdf5d` + `7349155`）。
- **lint/ts 双绿**（末次实测本会话 10:24）：`pnpm lint:build` exit=0，`pnpm ts-check` 无报错。
- `.env.local` 没动：`VITE_SUPABASE_URL` 裸 host、`publishable key` 已填。仅公开变量，无私密值。
- **白名单已加（用户亲手加完）**：`http://localhost:5000` + `http://192.168.31.60:5000`，
  curl 实测 `/authorize?provider=google&redirect_to=http://localhost:5000` 返回 **302 到 Google**。
- **用户 Chrome 现状**：`:5000` 的 SW 已注销（页面 `sw=NO-SW` 实测）；留有多个照片库标签页
  （/me、画廊、internals 等），状态混杂，动手前先确认 active tab。

## §1 已完成的工作（按时间倒序，最新在最下）

### 阶段 1：环境与页面验证 ✅（2026-09-07/08，回顾）
- 空目录克隆，`pnpm install` 通过；dev（5000）+ `/api/health` + 全路由 200；5 页核查通过。

### 修阻塞 bug BUG-1～BUG-9 ✅（回顾，见 `docs/qa/BUGS.md`）
- BUG-3/4/5/6（Express 中间件、Vite 双配置、`type:module`、生产包 vite 链）；
  BUG-7（分面按名比对）；BUG-8（HEIC 降级直存）；BUG-9（编辑页 seedKey 回填）。

### Supabase S1 ✅（已发布，回顾）
- 送审包 `alw丨数据库管理专家/项目审查丨photo-library/`，复审 V1.1 **APPROVED_FOR_EXECUTION**，
  正式 Migration `20260908021427/29`；S2 Expose 匿名实测 `42501 + 401` 生效。

### M2 接线 ✅（代码完成，已入库 `52f14f5`，已送审待审查结论）
- `sync.ts`（snake_case/owner/revision/wfv/Storage 未登录只排队）+ `WorkStore` 真接 IDB/outbox
  + 批量导入 + `/tags` 标签管理页；离线闭环自测通过；L1 待补。
- 送审材料（用户已会转送）：`字段映射表丨M2.md`、`M2接线送审丨photo-library.md`、
  `转送文件清单丨photo-library.md`（同目录）。

### M4 本地验证 ✅（已入库 `f1cdf5d` + `7349155`）
- 镜像 `photo-library:20260908-m4` 构建成功；容器 `healthy`；8082 上
  `/healthz`、`/`、`/find`、`/tags` 全 200；镜像无 env 文件；验完已 `compose down` 无残留。
- 修 BUG-10（builder 加 bash）、BUG-11（健康检查改 `127.0.0.1`）。

### L1 登录攻坚夜（2026-09-08/09，本会话后半；登录未通，卡在 P1）
**代码侧成果（全在工作区，未提交）：**
- BUG-12：定位生产包 SW 劫持（scope `http://localhost:5000/` ACTIVATED + fetch handler，
  clients 含 `/me`）→ 手动 Unregister → 页面 `sw=NO-SW`。`src/` 无 SW 注册代码，dev 下永不复发。
- BUG-13：`handleSignIn` 加 try/catch（**保留，非 TEMP**）。
- 登录链路硬化（去留待 L1 后复审）：`skipBrowserRedirect` 取 url → `location.href` 跳转；
  `detectSessionInUrl: false` + `consumeLoginCallback` 手动交换（App/Me 双挂载 + sessionStorage 桥）；
  防连点 `authPending`（连点会覆盖 PKCE verifier）；回调 error 显性化；`/me` 绿色兜底直链 + 复制框；
  `WorkDetail` TEMP 的 `DBG-REV` 行（rev 取证用）。
- 删 TEMP `public/sw.js`（lint 已回绿）。

**证据链（每条都有实测，别再重测）：**
1. 白名单 OK、Google provider OK（curl 302）。
2. "跳转发生过"经 QA round2 证伪：落地页无 code 无 error → 非 OAuth 回跳。
3. "/me 莫名回首页"经 QA round5 破案：**误点导航**（document 捕获监听记下空白点击 + 误点画廊筛选），代码从未自发导航。
4. 人手点击 handler 正常（`clicks=1` 一路到 `step=5`，url 到手，绿链渲染）。
5. **最大悬案**：该 Chrome（含无痕）中 `location.assign` 与 `location.href` 对 supabase 授权地址
   静默无导航、无报错、无请求（Network 零 supabase/google 请求）。根因未明。
6. QA 五轮小结：r1 结构化复测 → r2 无 code/error → r3 三问（FROM=localhost/零请求/无参数）→
   r4 clicks=0 系点击未落入页面 → r5 证实误点 + 窗口乱切。详见 BUGS.md BUG-14。
7. L1 执行脚本已交付 QA（含 P1 登录→P5 删除清理，P6 越权标待双账号）；P2 需人手选一张 jpg。

### BUG-14 结案 ✅（2026-09-09 上午；不用 QA，自测定案）
- **方法**：不再在原浏览器上归因，改为**换干净浏览器实例做对照复现**——一次操作就把
  "代码问题 / 环境问题"劈开。
- **证据**：新 Chrome `152.0.7977.83` + 独立 profile + CDP，点登录按钮后 6 秒内
  `supabase /auth/v1/authorize` → `accounts.google.com/o/oauth2/v2/auth` → `signin/identifier 200`。
- **根因**：用户那台 Chrome PID 98366 自 9/1 12:09 起连跑 8 天未重启，期间 Chrome 自动更新，
  binary `.76` 与 renderer `.65` 版本混跑 → 静默吞跨域导航。
- **处置**：代码零修改；用户重启 Chrome 或用干净实例即可。详见 BUGS.md BUG-14。
- **新增 TEMP**：`scratch/cdp-probe.mjs`（CDP 探针，已列入 §3 第 14 条删除清单）。

## §2 下一步任务（按序）

0. ~~**QA 键盘激活**~~ **已作废，不需要再做**（2026-09-09 上午）：
   BUG-14 定案为**环境问题**——用户那台 Chrome（PID 98366，9/1 启动、8 天未重启，
   binary `152.0.7977.76` vs renderer `152.0.7977.65` 版本混跑）静默吞跨域导航。
   干净 Chrome（`152.0.7977.83` + 独立 profile）复现：点击 → supabase `/authorize`
   → `accounts.google.com/o/oauth2/v2/auth` → `signin/identifier 200`，**一次打通**。
   代码零修改。证据与完整网络链见 `docs/qa/BUGS.md` BUG-14。
   **当前 pending（唯一）**：用户在干净 Chrome 实例里完成 **P1 登录**（见下）。
   - 实例：可见窗口，CDP **9336**，独立 profile `/tmp/photo-l1-chrome`，已停在 `/me`。
   - 登录后**我继续用 CDP 跑 P2–P5**，用户不必手动点（避开误点导航重演）。
   - 备选：用户也可 Cmd+Q 彻底退出自己的 Chrome 再重开，在自己浏览器里登录
     （代价：那样我无法用 CDP 接管，P2–P5 得人手做）。
1. ~~**QA 走 L1 脚本 P1→P5**~~ ✅ **2026-09-09 全部通过**（未借 QA，CDP 脚本自动跑完）：
   P1 登录 ✔（uid `3e0acd69…`）／P2 新建 ✔ rev=1／P3 刷新 ✔／P4 编辑 ✔ rev=2／
   P5 删除 ✔ 刷新消失、无残留。P6 越权待双账号，不阻塞。
   执行脚本 `scratch/cdp-l1.mjs`（TEMP，收口删）。记录已写入 `docs/qa/QA_CHECKLIST.md` L8。
   - 期间修掉 **BUG-15（P0）**：票据落在 URL hash 且被 `Gallery` 的 `replaceState` 抹掉，
     导致登录永远不生效。详见 BUGS.md。
   - ⚠️ **范围修正（重要）**：以上只验证了**本地 IndexedDB**。随后单独复验云端同步，
     **被 BUG-16 阻塞**（works/media 双向外键死锁，HTTP 409 / code 23503），云端始终 0 行。
     因此 **M2 云端读写尚未通过**，L1 只能算"本地侧通过"。见 BUGS.md BUG-16。
1.5 **0003 封面外键（当前主线）**：
   - **复审结论（2026-09-09 下午）：CHANGES_REQUIRED**，B1 方向可接受但原案不可执行，
     闭环前**维持现状 C**（不执行 0003、不建正式 Migration、不 push）。裁决全文：
     `alw丨…/项目审查丨photo-library/photo-library丨数据库管理员增量复审丨0003封面外键丨V1.0.md`
   - **R2-1（高）已修（2026-09-09 下午）**：管理员实测+我方线上复现一致——
     回填 PATCH 被 `enforce_revision_guard` 拒（`400 P0001 revision must be old+1`），
     原代码只查 error 不查影响行数，失败被静默吞 → **封面此前从未回填成功**。
     修复：回填改 revision 乐观锁（`SET cover+revision=base+1 WHERE revision=base`，0 行抛冲突）
     + 本地 `revision/baseRevision` 同步 +1；删 work 去掉手工清封面（由
     `trg_media_nullify_cover` 触发器自动清）。修复后带封面全流程实测：
     新建 → 云端 cover 落定 + `rev=2` → 编辑 → `rev=3` → 删除 → 云端消失，`pending=0`。
     详见 BUGS.md BUG-16 的 R2-1 修订段。
   - 待办（业务仓，R2 闭环后申请增量复审）：
     **R2-2** 0003 版 verify 三件套（T6' 期望反转 + V10 + 新 SHA 头重跑落盘）；
     **R2-3** 送审 §7 补执行前后清单（触发器 12 个/RLS 24 条/守卫抽查/2 遍幂等/回滚前悬空门禁）；
     **R2-4** 软引用补偿选型 (a)（巡检 SQL + 文档同步，管理员默认推荐）；
     **R2-5** 草案加固（DO 限定命名空间 / 回滚 NOT VALID→VALIDATE 或小表说明 / 顺序声明）。
   - 遗留观察：首跑同步 1 条失败、重试即成功（疑似 wfv/media 入队顺序），待查。
   - 历史背景：~~BUG-16（P0）~~ 已用方案 A（代码层）修掉云端写入失败，
     顺带修掉 **BUG-17**（delete 意图被 isDemoEntity 误吞）与 **BUG-18**（processingAt 孤儿卡队列）。
     改动集中在 `src/lib/sync.ts`，QA_CHECKLIST L8 的「云端读写」已勾上。
   **根治已送审（2026-09-09，→ 已裁决 CHANGES_REQUIRED，见上）**：材料在
   `alw丨数据库管理专家/项目审查丨photo-library/` ——
   《封面外键治理送审丨photo-library.md》+《草案丨20260909_photo_library_0003_cover_fk.sql》，
   并登记进《转送文件清单丨photo-library.md》#11/#12。
   提案 **B1（DROP `fk_cover_media`，推荐）** / B2（RPC 单事务，备选）；
   **`DEFERRABLE INITIALLY DEFERRED` 已论证否决**——PostgREST 每个请求是独立单语句事务，
   延迟约束在该语句 COMMIT 时就检查，media 尚未插入，照样失败。详见送审说明 §4。
   旧提案条目如下：
   - 方案 A（代码层，业务仓可自行改，**推荐先做**）：三步写入 ——
     insert works（`cover_media_id` 传 null）→ insert media → update works.cover_media_id。
   - 方案 B（schema 层，**需 DBA 送审**）：去掉 `works.cover_media_id` 外键 /
     改为 `DEFERRABLE INITIALLY DEFERRED` / 或去掉 `media.work_id` 外键。
   - 修完必须复验：新建 → 云端出现 rev=1 → 编辑 → 云端 rev=2 → 删除 → 云端消失。
   - 详见 `docs/qa/BUGS.md` BUG-16；取证脚本 `scratch/cdp-sync-diag.mjs`（TEMP）。
2. **L1 收口**：删全部 TEMP（清单见 §3 第 14 条；**TEMP 从未 commit，删除不可从 git 恢复**，
   删前先确认无保留价值）→ `pnpm lint` + `pnpm ts-check` 双绿 → 报 diff 等用户授权 commit。
   已双绿（2026-09-09 实测 lint exit=0 / ts exit=0，改动文件见 `git diff --stat`）。
   - 已用 `pbackup` 全量备份（399M，校验一致）：
     `~/Developer/coding/1.Active/临时备份/ing丨0907photo-library`（2026-09-09 12:29）。
3. **等 M2 审查结论**（`APPROVED_FOR_EXECUTION` / `CHANGES_REQUIRED` / `BLOCKED`），按结论修。
4. **等用户拍板两个产品决策**：① 筛选页地点抽屉做不做；② 年份/方向/收藏放哪（不动/侧栏底/折叠）。
5. L3/L4（双设备/冲突/断网）、备份恢复演练，另排期。

## §3 注意事项与规矩

### 来自两份规范（必守）
- 共享 Supabase 规范 V1.4（`Downloads/大模型 HANDOFF/2026-09-03…V1.4.md`）：
  独立 Schema `photo_library`；Migration 唯一来源是平台仓库，业务仓只留草案；
  治理材料唯一位置 `alw丨数据库管理专家/项目审查丨photo-library/`；未获批准不碰生产库/Dashboard；
  红线见接入包 `00_接入指引.md`（尤其：页面显示≠云端保存；realtime 只能通知）。
- Docker 规范 V1.1：四类目录职责；`docker` 部署副本未经授权不动；dev 目录不放生产私密值；
  `VITE_*` 改动必须重建镜像（构建期烘焙）。

### 实操教训（踩过）
1. **PWA Service Worker 会咬住旧包**：`chrome://serviceworker-internals` 按 scope 精确注销，
   别碰别的工具的；`src/` 无注册代码，dev 下注销后永不复发。
2. **5000 端口多进程**：`lsof -ti:5000` 查清再杀；`scripts/dev.sh` 启动前自动清端口，
   日志看 `/tmp/photo-dev.log`。
3. **HMR websocket 连不上是已知现象**（hmr 指云端 6000/443），改完代码靠手动刷新验证；
   但 HMR 日志仍可作为"推送已发出"的旁证。
4. **macOS 窗口最小 500px**，真 390px 测不了；断点 `lg=1024`。
5. **用户授权操作其桌面 Chrome**（computer-use，bundleId `com.google.Chrome`）；
   打开 URL 用 `open -a "Google Chrome" <url>`（运行中 Chrome 会忽略 `--args`，开不了真无痕），
   窗口尺寸 `1660x985`。
6. **密钥红线**：绝不在输出/日志/截图/文档里贴完整 key、token、code、完整 URL 参数；
   uid 只许缩写；OAuth 错误词（error= 后面的词）可示人；`.env.local` 在 `.gitignore`；
   验证连通只看状态码与错误码（PGRST125/42501/401/302）。
7. **OAuth 同意屏/账号选择只能用户点**；Orca 内嵌浏览器与用户 Chrome 的 IndexedDB 不互通。
8. **未登录 = 只排队不推送**（M2 红线）；demo 数据永不上云；批量导入默认一图一件；
   未知风格/构图名降级为普通标签不丢失。
9. `verify.sql` 头部复现命令与 `/t/` 目录约定是审查资产，改脚本同步改头部；
   `verify_result.txt` 头时间 + SHA 每次重跑必须刷新。
10. **commit/push 必须获用户明确授权**；且本轮工作区含 TEMP 代码，删 TEMP 前绝不 commit。
11. **orca 操作 Chrome 的写操作一律不可信**：AX 序号在 live 页面秒级漂移——读→点必须零间隔，
    且以点击回包快照里的地址栏为准验结果，不信跨调用的序号；
    合成按键（type/set-value/press-key）在这台 Chrome 上无效；坐标点击必须用 PIL 裁剪二分定位
    （读图工具的显示缩放不可信，直接按显示图估算必偏）；
    AppleScript 连不上多实例 Chrome（`count windows` = 0）；`open` 打不开真无痕。
    读树/截屏可靠。结论：精密点击优先让人类用键盘（Tab 走到目标按空格）。
12. **给人手点的指令要精确到按键**：误点导航是.describe 常态（本轮"灵异跳转"全是误点），
    诊断行（clicks/last-click）比问"去哪了"可靠；全屏截图（含标签页栏）比单拍页面有用。
13. **OAuth 铁律**：code 只能消费一次；连点会覆盖 PKCE verifier 致交换失败（已加 authPending 锁，
    跨页重载会重置，仍需嘱咐一次只点一下）；error 参数可读，code/token 不可；
    Network（Preserve log）+ 参数名（不要值）+ document.referrer 是定位三件套。
14. **TEMP 代码删除检查表（L1 通过后逐项删）**：
    - `src/pages/Me.tsx`：所有 `TEMP-L1` 标记（debugClicks/dbgStep/urlHost/lastClick/navFrom/
      authUrl/复制框/绿色兜底链/DBG×4 行/【调试】文案/捕获监听），保留 try/catch + 防连点；
    - `src/lib/supabase.ts`：`onStep` 参数（调用处同步改）；`consumeLoginCallback`、
      手动交换、`detectSessionInUrl: false` 复审去留（建议保留，失败可见性是真改进）；
    - `src/pages/WorkDetail.tsx`：`DBG-REV` 行；
    - `src/App.tsx`：`auth-nav-from` 记录（桥接逻辑随 consumeLoginCallback 去留）；
    - `scratch/cdp-probe.mjs`：BUG-14 定案用的 CDP 探针（2026-09-09 新增）。
