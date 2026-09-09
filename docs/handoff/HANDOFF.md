# 交接文档 (HANDOFF.md)

> 最后更新：2026-09-09 深夜（L1+云端读写收口、0003 一轮复审、neat-freak 对齐后的暂停点）。
> 结构：§1 当前工作进展 / §2 下一步任务 / §3 注意事项及相关规矩。
> 下一 Agent 先读 `AGENTS.md` + 本文件，恢复口令见 §2 末尾。

---

## §1 当前工作进展

### 服务与仓库状态（快照 2026-09-09 深夜）

| 项 | 状态 |
|---|---|
| dev 服务 | 5000 端口正常（`pnpm dev`，PID 91258，日志 `/tmp/photo-dev.log`），`/api/health` 200 |
| 质量门 | `pnpm lint` / `pnpm ts-check` 双绿（2026-09-09 实测） |
| Git HEAD | `3d356a4`，共 3 笔新提交（**未 push**，等用户口令）：`a643929` fix(auth/sync) 修 5 bug + 清 TEMP、`f224456` docs 同步、`3d356a4` chore gitignore |
| 未提交改动 | `docs/handoff/HANDOFF.md`、`docs/pm/PLAN.md`、`docs/qa/BUGS.md`、`docs/qa/QA_CHECKLIST.md`（内容为状态同步与对齐，正当改动，**待用户授权后 commit**） |
| 未跟踪 | `备份本文件夹.command`（用户个人脚本，**不动、不提交**） |
| TEMP 代码 | **已清零**（`a643929` 已删，grep 无残留） |
| scratch/ | 6 个 CDP 探针保留（`cdp-probe/status/l1/oauth-trace/cloud/sync-diag.mjs`，gitignored），R2-2～R2-5 可复用，闭环后确认无用即删 |
| 备份 | `pbackup` 全量 2026-09-09 12:29（399M，校验一致）：`~/Developer/coding/1.Active/临时备份/ing丨0907photo-library` |
| 文档对齐 | PLAN 快照/M2/M3/M4、QA L5/L8、BUGS 已与代码和运行态对齐；DATA_CONTRACT 与现 schema 一致（FK 仍在，代码层绕行），不动 |

### 里程碑（已完成，按时间序）

1. **M0/M1 工程骨架与可点击体验** ✅：画廊、筛选（分面+URL 同步）、添加/编辑、详情（灯箱）、我的、标签管理页；修 BUG-1～9。
2. **Supabase S1** ✅ 已发布：复审 V1.1 APPROVED_FOR_EXECUTION，Migration `20260908021427/29`；S2 Expose 生效（匿名 42501+401）。
3. **M2 同步接线** ✅ 代码完成已入库（`52f14f5`）：sync.ts（snake_case/owner/revision/wfv/Storage，未登录只排队）+ WorkStore 接 IDB/outbox + 批量导入 + `/tags`；**送审结论仍待**；真机证据待补交。
4. **M4 Docker** ✅（`f1cdf5d` + `7349155`）：镜像 `photo-library:20260908-m4` 容器 healthy，8082 全 200，验完已 down；修 BUG-10/11。
5. **L1 登录 + 云端读写** ✅（2026-09-09，本轮核心成果）：
   - **BUG-14 结案（环境侧）**：用户 Chrome（PID 98366）连跑 8 天版本混跑静默吞跨域导航；干净 Chrome + CDP 对照复现一次打通，代码零修改。
   - **BUG-15（P0）已修**：Google OAuth 回落 implicit flow，票据落 URL hash，被 `Gallery.tsx` 的 `replaceState` 抹掉。修复：`supabase.ts` 模块级 `urlSnapshot` 抢先抓票 + `consumeLoginCallback` 双覆盖 implicit/PKCE + Gallery 保留 hash。
   - **本地 CRUD P1–P5 全过**（CDP 自动跑，记录在 QA_CHECKLIST L8）。
   - **BUG-16（P0）已修**：works/media 循环外键死锁（409 23503）。方案 A 三步写入（works 不带封面 → media → 回填封面）。顺带修 **BUG-17**（delete 意图被 isDemoEntity 误吞 → 云端删除"复活"）与 **BUG-18**（processingAt 孤儿卡队列）。
   - **R2-1 已修（管理员复审抓出的真问题）**：回填封面不带 revision 被 `enforce_revision_guard` 拒（`400 P0001 revision must be old+1`），且只查 error 不查影响行数 → **封面此前从未回填成功**。修复：乐观锁 `UPDATE … WHERE revision=base` + `select('revision')` 验证 0 行即抛 + 本地 revision/baseRevision 同步 +1；删 work 交给触发器 `trg_media_nullify_cover` 自动清封面。
   - **修复后全流程实测通过**：新建 → 云端 cover 落定 + rev=2 → 编辑 rev=3 → 删除云端消失，`pending=0`。
   - 硬化保留：try/catch（BUG-13）、防连点 `authPending`、手动交换 + `detectSessionInUrl:false`、回调 error 显性化。
6. **0003 封面外键治理（R2 已闭环，待管理员增量复审）**：
   - 送审材料在 `alw丨数据库管理专家/项目审查丨photo-library/`（B1 提案 DROP `fk_cover_media` + DEFERRABLE 否决论证）。
   - **复审裁决（2026-09-09）：CHANGES_REQUIRED** —— B1 方向可接受，原案不可直接执行。裁决全文见同目录《…增量复审丨0003封面外键丨V1.0.md》。
   - **R2-1～R2-5 已全项闭环（2026-09-09 晚）**：R2-1 代码（`a643929`，带封面全流程实测）；
     R2-2 三件套（`verify_0003.sql` + `verify_result_0003.txt`，全新 PG16.15 重跑，T6' 反转/V10/T17/T18 全过，7 个预期 ERROR，T6 移出）；
     R2-3 送审 §7 六项执行前后清单；R2-4 选型 (a) 软引用 + 巡检（频率/告警/清理人落盘，#7/#10/#12 已标注）；
     R2-5 草案加固（DO 限定 connamespace、回滚悬空门禁 + NOT VALID→VALIDATE、顺序声明；SHA16 `f50e6b2b9a5cb6a5`）。
   - **已上线（2026-09-09）**：复审 V1.1 `APPROVED_FOR_EXECUTION`（R2 全项通过、R3-1 关闭、OBS-1～3 转收口）
     → 正式 Migration `20260909150053`（Local=Remote=11，管理员线上复跑全达标）；
     **发布后回报完成**（《发布后回报丨0003上线丨photo-library.md》#19：§7.3 端到端 +
     T17 单条 INSERT 带 cover 全过，终态云端 0/0 零残留）。
   - 剩余收口（不阻塞）：**巡检首次执行**（§7.5 每月 1 次，下月度例行同步）；OBS-1 ✅ 已回填 QA L8；
     OBS-2 ✅ BUGS 旧 DEFERRABLE 文案已清；**OBS-3 首跑删除 pending=1 重试即清待查**（当晚复现一次）。

---

## §2 下一步任务（按优先级）

| 级别 | 任务 | 说明 |
|---|---|---|
| P1 | **OBS-3 查因** | 首跑删除 `pending=1`、重试即清（疑 outbox 内 media/work 删除顺序与 404 处理），当晚 0003 上线后回报时复现一次；查 `sync.ts` processOutbox 删除分支 |
| **P0** | 文档改动待授权 commit | HANDOFF/PLAN/BUGS/QA_CHECKLIST + 治理目录回报材料（#19），**等用户授权 commit** |
| P1 | M2 送审结论 | 等 `APPROVED_FOR_EXECUTION` / `CHANGES_REQUIRED` / `BLOCKED`，按结论修；真机证据（M2 接线送审材料标注"真机证据待补"）待补交 |
| P1 | 遗留观察 | 首跑同步偶发 1 条失败、重试即成功（疑 wfv/media 入队顺序），待查；顺手把 sync.ts 的 `N items failed` 细节落进 `lastErrorMessage` |
| P1 | L3/L4 + P6 + M5 | 双设备/冲突/断网回放、PWA 安装/离线验证、双账号越权（P6 需第二个 Google 账号）；M5 独立审查（CODE_REVIEW.md、PRODUCT_BACKLOG 正式版），另排期 |
| P2 | push GitHub | 3 笔提交 + 文档，**等用户说"现在推送"** |
| P2 | 两个产品决策（等用户拍板） | ① 筛选页地点抽屉做不做；② 年份/方向/收藏放哪（不动/侧栏底/折叠）。**不要顺手替用户做产品决策** |

> **恢复口令**：用户说「恢复 photo-library 开发」→ 先读 `AGENTS.md` + 本文件，报 §2 第一项现状与第一动作，确认后再动手。

---

## §3 注意事项及相关规矩

### 铁律（违反即翻车）

1. **包管理只用 pnpm**（`preinstall` 有 only-allow 锁）。
2. **只用 `photo_library` schema**，不碰其他工具的表。
3. **本地优先**：先写 IndexedDB、UI 立即可见，再由 outbox 推送；**未登录只排队不推送**；**demo 数据永不上云**；批量导入默认一图一件；未知风格/构图名降级为普通标签不丢失。
4. **commit/push 必须用户明确授权**；push 二次确认口令「现在推送」；用户撤回即停。
5. **密钥红线**：完整 key/token/code/完整 URL 参数绝不进输出、日志、截图、文档；uid 只许缩写；OAuth error 参数名可示人；验证连通只看状态码/错误码（PGRST125/42501/401/302/23503）。
6. **Migration 唯一来源是平台仓库**，业务仓只留草案；治理材料唯一位置 `alw丨数据库管理专家/项目审查丨photo-library/`；**未获批准不碰生产库/Dashboard**；红线见接入包 `00_接入指引.md`（页面显示≠云端保存；realtime 只能通知）。
7. **Docker 规范 V1.1**：`VITE_*` 是构建期烘焙，改了必须重建镜像；`docker/` 部署副本未经授权不动；dev 目录不放生产私密值。
8. **verify.sql 头部复现命令与 `/t/` 目录约定是审查资产**，改脚本同步改头部；`verify_result.txt` 头时间 + SHA 每次重跑必须刷新。
9. **产品拍板与独立审查未做前不重构**，不顺手替用户做产品决策。

### 技术教训（踩过的坑，别再踩）

- **PWA SW 咬旧包**（BUG-12 整晚的教训）：换构建/换环境后浏览器必须彻底重进；`chrome://serviceworker-internals` 按 scope 精确注销；`src/` 无 SW 注册代码，dev 下注销后永不复发。
- **5000 端口多监听**：先 `lsof -ti:5000` 查清再杀（tsx watch 父进程会复活子进程）；`scripts/dev.sh` 启动前自动清端口。
- **HMR websocket 连不上是已知现象**（hmr 指云端 6000/443），改完代码手动刷新验证。
- **OAuth 票据要在模块加载阶段快照**（BUG-15）：任何 `replaceState` 全量覆盖 URL 的组件都是票据杀手；supabase-js 默认 PKCE 不消费 implicit hash；`detectSessionInUrl: false` 维持（避免 supabase 抢先清 URL）。
- **revision 乐观锁必须验证影响行数**（R2-1）：PostgREST update 后只查 `error` 会吞 0 行失败，必须 `.select()` 后判 `data.length === 0` 即冲突。
- **PostgREST 单语句事务下 DEFERRABLE 外键无效**：每请求独立事务，延迟约束在语句 COMMIT 即检查——循环外键只能靠调整写入顺序（当前方案 A）或 schema 治理（0003 B1，待批）。
- **sync.ts 错误可见性差**：只汇总 `N items failed`，具体错误要抓 HTTP 响应体（CDP `Network.getResponseBody`）。
- **方法论**：遇"跳转/导航类灵异现象"，先换**干净浏览器实例**做对照复现，一次操作劈开代码问题/环境问题（BUG-14 定案法）。

### 自动化操作教训（CDP / orca）

- CDP 直连：Node 22 原生 WebSocket **无 `.on()`，必须 `addEventListener`**；`send()` 返回整条消息取 `.result`；DOM 操作先 `getDocument` → `querySelector` 拿 nodeId；文件 input 用 `DOM.setFileInputFiles`；受控 input 用原型 setter + `dispatchEvent`；图标按钮靠 `aria-label` 定位。现成脚本在 `scratch/cdp-*.mjs`。
- orca 操作 Chrome 的**写操作不可信**（AX 序号秒级漂移、合成按键无效、AppleScript 连不上多实例）：读树/截屏可靠，读→点零间隔并以回包快照验地址；精密点击优先让人类用键盘。
- OAuth 铁律：code 只能消费一次；连点会覆盖 PKCE verifier（已有 `authPending` 锁，仍需嘱咐一次只点一下）；同意屏/账号选择只能用户点；Orca 内嵌浏览器与用户 Chrome 的 IndexedDB 不互通。
- 用户授权操作其桌面 Chrome 用 computer-use（bundleId `com.google.Chrome`）；开 URL 用 `open -a "Google Chrome" <url>`（运行中 Chrome 忽略 `--args`）。

### 环境与协作

- macOS 窗口最小 500px，真 390px 测不了；断点 `lg=1024`。
- 给人手点的指令要精确到按键；误点导航是常态，诊断行比问"去哪了"可靠；全屏截图（含标签页栏）比单拍页面有用。
- `.env.local` 只有公开变量（裸 host + publishable key），在 `.gitignore`。
- 白名单已加：`http://localhost:5000` + `http://192.168.31.60:5000`（curl 302 验证过）。
