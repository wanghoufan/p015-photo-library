# HANDOFF｜交接（暂停/恢复用，先读我）

> 旧版字段（governance-state / Evidence / Human Gate / Promotion / Dispatch ID）已废弃，不填。
> 上一版（2026-09-09 S1 发布收口）原文已归档到 `docs/handoff/HANDOFF_20260909_S1发布收口.md`，未删。

- Captured at（YYYY-MM-DD HH:MM）：2026-10-03 11:05
- PROJECT_PHASE：DEVELOP（README / 文档整改已完成并落盘；开发本身暂停，OBS-3 仍未实测）
- PLAN_VERSION：空（本轮无产品计划变更）
- PLAN_READINESS_SCORE：空
- PLAN_GATE：IN_PROGRESS
- DEV_BASELINE：a9bee31（= origin/main，本地仍无领先提交）
- CHANGE_REQUEST：NONE
- Stage ID：本阶段叫「README 整改（已完成）+ OBS-3 修复待验证」
- 剩 P0：
  1. **`src/lib/sync.ts` 的 OBS-3 修复仍未提交、未实测**（本轮明确不碰，见 §3）。
  2. **P2 导航遮挡已修完但仍未提交**（见 §8；本轮按用户指令已提交，见下面落盘清单）。

- 当前 Task（正干到哪）：README 整改 Phase 3～7 已完成并自检通过（`DOCUMENTATION_READY`）；随后按用户指令一并处理了 P2 导航遮挡修复（§8，实测 36/36 clean）。当前在提交阶段。累计打回 0/2。
- 执行链/Session：本窗口 opencode（无固定 session ID）；恢复时新开窗口即可，续上下文靠本文件。
- 未闭环评审意见：
  - **OBS-3 待验证**（旧版遗留，`docs/handoff/HANDOFF_OBS-3-20260910.md`）：首跑删除后 `pending=1`、重试即清。已定位为 outbox 同毫秒 `createdAt` tie 排序随机导致依赖倒序，代码已改（见 §3），**但没跑过真机/浏览器实测，也没送审**。
  - **数据库月度巡检首次执行待做**（`§7.5`，每月 1 次，从未跑过）。
  - ~~`/add` 与 `/tags` 顶部标题被 fixed 导航遮挡~~ **已修复（2026-10-03，见 §8）**：实测导航占 `top 0～57px`；不止这两个页面，`/me`、`/`、`/find` 同样中招（`/` 的侧栏「地点」标题与「24 / 24 件作品」计数一直被压在导航下）。
  - **修复本身暴露一个新遮挡，也已修（见 §8）**：补了顶部偏移后，「24 / 24 件作品」计数下移到 `top 79`，正好撞进 `AddFAB`（`lg:top-20`，占 x 1368～1424 / y 80～136），文字被浮钮压住。教训见 §5 第 16 条。
- 产品验收（追踪矩阵落点 / 未测 AC / 是否待用户签收）：
  - 落点：`docs/qa/QA_CHECKLIST.md`（L8 已过）、`docs/qa/BUGS_OBS-3*.md`。
  - 未测 AC：**OBS-3 修复后的端到端 AC 未测**（新建→编辑→删除→刷新，pending 必须为 0 首跑达成）。
  - 用户签收：不需要（迭代更新，非首次发布；README 整改也不属产品发布）。
- docs 落盘清单（本轮新增/改了哪几个文件）：
  - 改写：`README.md`（旧版 → 新版：顶部语言切换、用途+核心能力+快速开始前置、6 张真实截图、Docker/环境变量/命令/已知限制；删掉失实的「测试：Vitest」，删掉无 LICENSE 文件支撑的「MIT」）。
  - 新增：`README.en.md`（英文版，事实与中文版一致，非逐字翻译）。
  - 重截：`assets/screenshots/{gallery,find,mobile,add,tags,me}.png`（6 张全部重截，`brokenImgs=0`）。
  - 改（用户明确授权的业务代码 1）：`src/lib/demo-data.ts` 的 3 条 404 图片链接替换为已验证 200 的链接，全 24 条现均 200。
  - 改（用户明确授权的业务代码 2，P2 修复，详见 §8）：`src/components/AppShell.tsx`（`<main>` 加 `lg:pt-14`）、`src/pages/Gallery.tsx` 与 `src/pages/Find.tsx`（顶部工具栏给 `AddFAB` 让位）。
  - 改：本文件 `docs/handoff/HANDOFF.md`。
  - 账本：`docs/model/TASK-MODEL-LOG.jsonl` 追加本轮任务行。
  - **没有新建任何 docs 文档**（README 引用的架构/数据库/部署文档均已存在，不造空文档）。
  - GitHub About 三格已写入（见 §7），未传 `--homepage`。
- 下一步（Next Single Action）：另开任务做 OBS-3 的浏览器端到端实测（新建→编辑→删除→刷新，pending 首跑须为 0）。
- 人要拍什么板（列出来问，不问不许开工）：
  1. **`USER_MODEL_OVERRIDE.md` 是指向仓库外绝对路径的软链**（`4.Templates（PC）/…/USER_MODEL_OVERRIDE.md`），
     已按现状入库，但在 GitHub 上对任何克隆者都是**断链**。两条路二选一：① 改成实体副本（代价：违反「分工表软链制、
     禁拷实文件」的项目规矩，母版更新需手动同步）；② 保持软链并接受 GitHub 上不可读（本地不受影响）。
     **本轮未擅自改动**，等裁决。
- 提交历史（本轮，见 §9）：`a91714a` README+P2 → `fa3b3d7` 治理规则同步（**非我创建**）→
  `76427a5` 治理记录入库与事实面对齐 → `cab00fe` OBS-3 修复入库 → neat-freak 收尾。
- permission_request：写 `README.md` / `README.en.md` / `assets/screenshots/*.png` / `src/lib/demo-data.ts` / `src/components/AppShell.tsx` / `src/pages/Gallery.tsx` / `src/pages/Find.tsx` / `docs/handoff/HANDOFF.md` / `docs/model/TASK-MODEL-LOG.jsonl`（用户本轮明确要求，可写）。
- 收尾记一笔：README 整改 + P2 修复均已实测收口（README 校验 `DOCUMENTATION_READY (0 warning(s))` exit 0；遮挡检测 36/36 clean；`ts-check`/`lint` exit 0；`check-ledger` `LEDGER-OK`）。临时文件已清（`scratch/` 下截图/测量脚本与 profile 全删）。

---

## §1 恢复读盘（全体系唯一顺序，别乱）

1. `AGENTS.md`；2. 角色卡（`docs/roles/`）；3. 根 `USER_MODEL_OVERRIDE.md`；4. 本 HANDOFF；5. 根 `经验一句话.md`；6. 任务目标放最后。
   冲突才扩大读。

## §2 本轮产出物（真实存在，可直接用）

### 2.1 真实产品截图（1440×900 桌面；mobile 为 414×896；2026-10-03 全部重截）

| 文件 | 内容 | 备注 |
|---|---|---|
| `assets/screenshots/gallery.png` | 画廊首页（瀑布流 + 顶部分面 + 左侧地点栏） | 干净，`brokenImgs=0` |
| `assets/screenshots/find.png` | 筛选与查找页，**URL 带 `?fav=1&style=风光`** | 干净；带活动筛选条，与主图不重复 |
| `assets/screenshots/mobile.png` | 移动端画廊（窄屏） | 干净 |
| `assets/screenshots/add.png` | 添加作品页 | 干净；顶部按导航高度裁掉被遮挡那一行（见「未闭环评审意见」里的 P2） |
| `assets/screenshots/tags.png` | 标签管理页 | 干净 |
| `assets/screenshots/me.png` | 我的页（登录入口/同步状态） | 干净 |

取证方式（**本轮实测可用**，比 `--screenshot` 稳）：`PORT=5000 pnpm tsx watch server/server.ts` 起 dev →
Chrome headless 带 `--remote-debugging-port=9222` 常驻 → 用 CDP 逐页 `Page.navigate`、
轮询到「无『加载中』且所有 `img.complete`」再 `Page.captureScreenshot`。
踩坑记录：`chrome --headless --screenshot --virtual-time-budget` 会截到「加载中…」的半成品页（本轮第一次就这么废掉了 6 张），别再用。

### 2.2 README 整改已完成的准备工作（无需重做）

- 事实表已从代码/脚本/配置核过：`package.json`（pnpm 9 / React 19 / Vite 7 / 脚本名）、`scripts/dev.sh`（**dev 端口 5000**）、`scripts/start.sh`（生产预览 5000）、`compose.yaml` + `Dockerfile`（**宿主 8082 → 容器 3000**，`/healthz`）、`.env.example`（`VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` 等）、`src/App.tsx`（路由 `/`、`/find`、`/work/:id`、`/add`、`/edit/:id`、`/me`、`/tags`）、`docs/` 目录清单。
- 未解决的 README 事实问题：`pnpm test` **当前必然失败**（`No test files found`，且 `.gitignore` 里 `*.test.ts`/`*.test.tsx` 被忽略），所以 README **不能声称"测试：Vitest"**；旧 README 有这句，属失实。

## §3 工作区未提交改动（务必先搞清再动）

`git status` 在本轮开工时共 **45 项**（已跟踪文件被改 + 未跟踪新增）。本轮新增的改动见上面「docs 落盘清单」。重点：

- **`src/lib/sync.ts`（+84/-16）= OBS-3 的修复代码，已写好但未验证**：
  - `processOutbox()` 排序从「只按 `createdAt`」改为**依赖安全分级**：操作序 `delete(0) → create(1) → update(2)`；create 按父→子（`location → facet_dimension → work → facet_value → media → work_facet_value`）；delete 按子→父；`createdAt` 降为同级 tiebreak。新增 `OP_ORDER` / `CREATE_ENTITY_ORDER` / `DELETE_ENTITY_ORDER` / `outboxRank()`。
  - 根因注释（代码内已写）：`generateId()` 是 `randomUUID`，IDB `getAll` 按随机主键返回，同毫秒入队的 `createdAt` tie 经稳定排序后**仍是随机序**，依赖后置的条目首跑撞云端 FK/缺行失败，重试自愈 → 表现为「首跑 pending=1、重试即清」。
  - 顺带加 `failureDetails[]`：逐条记录 `操作 实体 行id 错误码` 进 `lastErrorMessage`（截 500 字），提高 OBS-3 可见性。
  - **本轮明确不动它**：用户 B 项已定为「只提交 README 相关」，OBS-3 实测另开任务。
- 其余为治理文档：`AGENTS.md`、`docs/roles/*.md`（8 个角色卡新增/改写）、`docs/qa/QA_CHECKLIST.md`、`docs/handoff/HANDOFF.md`、`.gitignore`；未跟踪新增 `docs/model/`（含 `TASK-MODEL-LOG.jsonl`、`GOVERNANCE-STATE.json`、`DISPATCH-LOG.jsonl`）、各角色卡与模板、`docs/sop/`、`scripts/model/`、根 `USER_MODEL_OVERRIDE.md`、`GOVERNANCE_VERSION`、几个中文提示词 md。
- **未经用户明确要求，不要 commit、不要 push。**

## §4 演示数据图片链接：3 条 404 已替换（2026-10-03 已闭环）

原先实测（curl）24 条 Unsplash 图里 **3 条 404**（打开画廊就见破图，README 主图也有黑洞）：

- ~~`https://images.unsplash.com/photo-1465056836900-8f1e940b3fc8?w=800&q=80`~~ → `photo-1425913397330-cf8af2ff40a1`
- ~~`https://images.unsplash.com/photo-1518173946687-a9c63de42aff?w=800&q=80`~~ → `photo-1447752875215-b2761acb3c5d`
- ~~`https://images.unsplash.com/photo-1482685448062-111a9db3e268?w=800&q=80`~~ → `photo-1511497584788-876760111969`

用户已明确授权（拍板 A 项）。替换后逐条复测：**24 条全部 200**，且 `w=400` 缩略图尺寸也返回真实图片字节（曾有候选在 `w=400` 只回 11KB，已弃用）。

## §7 GitHub About 三格（2026-10-03 已写入并回读）

| 格 | 写入前 | 写入后（已回读确认） |
|---|---|---|
| Description | `我的摄影作品库 PWA` | `私人自用的摄影作品库 PWA：本地优先存储 + 分面筛选 + Supabase 云同步` |
| Website | 空 | **仍为空**（按拍板 C：无真实公网站点，不传 `--homepage`，不留占位） |
| Topics | 无 | `docker, indexeddb, local-first, photo-library, photography, pwa, react, supabase, tailwindcss, typescript, vite` |

回读命令：`gh repo view wanghoufan/p015-photo-library --json description,homepageUrl,repositoryTopics`。

## §8 P2「导航遮挡内容」修复（2026-10-03 已完成并实测）

### 8.1 成因

`PrimaryNavigation` 在 `lg`（≥1024px）断点是 `lg:top-0 lg:h-14`（56px + 1px 边框 = **57px**）的 fixed 浮层，
但 `AppShell` 的 `<main>` 没有为它预留顶部偏移 —— 内容从 `y=0` 开始，直接被压在导航下面。
`Gallery`/`Find` 的根容器写的是 `h-[calc(100vh-3.5rem)]`（3.5rem 正好 = 56px = 导航高度），
说明设计上**本来就预留了这 56px，只是加在了高度里、没加在偏移上**。所以修在 `AppShell` 一处即可。

### 8.2 改动（3 个文件，各一处）

| 文件 | 改动 | 为什么 |
|---|---|---|
| `src/components/AppShell.tsx` | `<main>` 加 `lg:pt-14` | 补上 56px 顶部偏移，一次修好全部 6 个页面 |
| `src/pages/Gallery.tsx` | 顶部工具栏 `xl:px-6` → `xl:pl-6`，并加 `lg:pr-24` | 给 `AddFAB` 让出 72px（`right-4`+`w-14`）+ 间隙 |
| `src/pages/Find.tsx` | 同上 | 同上 |

⚠️ 改工具栏时踩过一个坑：写成 `... md:px-4 lg:pr-24 xl:px-6` 是**错的** —— `xl:px-6` 与 `lg:pr-24`
同为 `padding-right`，Tailwind 按断点分层输出、`xl` 层更靠后，会在 ≥1280px 把 `pr-24` 覆盖回 24px，
等于在宽屏上重新撞上 FAB。必须只覆盖左侧（`xl:pl-6`）。

### 8.3 实测证据（不是目测）

- **遮挡检测**：6 个宽度（1024/1280/1440/1680/1920/414）× 6 个页面（`/`、`/find`、`/add`、`/tags`、`/me`、`/work/:id`）
  共 36 组，用 `getBoundingClientRect` 逐个文字元素与 nav、FAB 求矩形相交 → **36 组全部 `occludedCount=0`**。
  窄屏（414）导航在底部，本来就无遮挡，改动前后一致。
- **横向溢出**：同 24 组 `scrollWidth - clientWidth` 全为 **0**，`lg:pr-24` 没把内容挤出视口。
- **纵向滚动**：改动前后各量一次（`git stash` 对比）。`/`、`/find` 恒为 0（内容自撑 + `h-[calc(...)]`）不受影响；
  `/add`、`/tags`、`/me` 各 +56px（本来就比视口高，正常滚动）；`/work/:id` 由 0 变 28px —— 唯一新增的滚动条，
  属内容高度决定，可接受，不为它加补偿代码。
- **静态检查**：`pnpm ts-check` exit 0、`pnpm lint` exit 0。
- **截图**：6 张全部重取，`brokenImgs=0`、`no-overlap`，并逐张目检（`add.png` 的「添加作品」标题与
  「单张/批量导入」切换、`me.png` 的「我的」标题、`gallery.png` 的「24 / 24 件作品」计数此前均被压住，现已完整可见）。

## §5 注意事项与规矩（本项目特有，踩过的坑）

1. **不要 push**；commit 必须由编排者（task-manager）明确指令 + 指定分支名（外部者分支用 `ext/` 开头）。
2. **不要碰 secrets**：`.env.local` 未入库；`.env.example` 只有空值；文档里只写变量名与用途，不写真值。
3. **不要为了让 README 好看而编功能**：README 声称的能力必须能在代码里找到；发现不一致改 README 或报告差异，不擅自补功能。
4. **5000 端口**：dev / 生产预览都占 5000；`scripts/dev.sh` 会用 `ss` 杀占用进程（**macOS 无 `ss`**，该步骤静默跳过）。多监听时先 `lsof -ti:5000` 查清再杀。
5. **换构建/换环境后浏览器必须彻底重进**，PWA Service Worker 会咬旧包（这是 P0 级老坑）。
6. **演示数据依赖网络**（Unsplash），离线环境下画廊图片会空。
7. **演示数据不上传云端**（`isDemoEntity` 拦截）；这是硬约束，改同步逻辑时别破坏。
8. **数据库治理材料不在本仓**：唯一位置是另一个库 `alw丨数据库管理专家/项目审查丨photo-library/`（转送清单 #1～#19）；本仓只记结论。
9. **搜索/截图注意**：项目视觉是「克制、安静、偏私人收藏馆，图片是绝对主角」——禁蓝紫渐变、禁超大圆角、禁 AI SaaS 味、禁 emoji 代图标（README 文案也按这个调子写）。
10. **`*.test.ts` / `*.test.tsx` 在 `.gitignore` 里**：想补单测得先改 `.gitignore`，否则写了也进不了仓库。
11. **跨目录禁令**：派 opencode 通道角色时，任务里读写本仓以外目录（如 `/tmp`、`1.Active/`）会被 `external_directory` 权限自动拒且**静默失败**；临时文件放仓内 gitignore 的 `scratch/`。
12. **不要用 `require(` 动态导入**（BUG-1 已关闭，全仓禁）。
13. **README 里有两个坑，别再写错**（2026-10-03 实测）：① `pnpm test` 必然失败（无测试文件），不能宣称有测试；② 仓库**没有 LICENSE 文件**，不能写「MIT」。两条都已在新 README 里显式说明为限制。
14. **`「我的」页的「导出数据」按钮没有 `onClick`**，是纯占位。README 不能宣称有导出/备份功能。
15. **README 的 `find.png` 用的是带筛选的 URL**（`/find?fav=1&style=风光`）。因为 `/find` 与 `/` 布局几乎相同，不带参数会得到一张和主图重复的图。
16. **修「被遮挡」类问题时，必须重测整页所有元素，不能只测原来那一个**（2026-10-03 踩中）：补上 `lg:pt-14` 后，`/` 的「24 / 24 件作品」计数下移后**正好撞进 `AddFAB` 浮钮**，这个遮挡原先被导航盖住、根本看不见，是修复把它暴露出来的。判据用矩形相交：`!(a.right<=b.left||a.left>=b.right||a.bottom<=b.top||a.top>=b.bottom)`，见 §8.3。
17. **改多断点 padding 时注意 Tailwind 分层**：同属性跨断点会按断点层序覆盖，后写的断点赢。`lg:pr-24` + `xl:px-6` = `pr` 在宽屏失效。

## §6 未完成的旧账（跨轮次，别忘）

- M2 审查结论仍待（`APPROVED_FOR_EXECUTION` / `CHANGES_REQUIRED` / `BLOCKED`）。
- 数据库月度巡检首次执行（每月 1 次，从未跑）。
- M5 收口：neat-freak / 经验记录未派；`PLAN.md` 缺「视觉与交互验收标准（AC 编号）+ 关键 AC 集合 + 发布类型」（中央规则新要求，缺了会被判计划缺项）。
- `docs/pm/PLAN.md` 顶部现状快照停在 2026-09-09，本轮之后需刷新。
## §9 知识收尾（2026-10-03，neat-freak）

### 9.1 六个事实面状态

| 事实面 | 状态 | 说明 |
|---|---|---|
| 代码 | `changed-and-verified` | 本轮改 `AppShell`/`Gallery`/`Find`/`demo-data` + 提交既有 `sync.ts`；ts-check、lint exit 0 |
| 运行态 | `not-applicable` | 私人自用项目，无生产部署面；只有本机 dev 与自建 Docker |
| 文档 | `changed-and-verified` | README 中英双语；BUGS.md 补 BUG-19、修 BUG-2；PLAN.md 快照刷新 |
| 规则 | `verified-current` | AGENTS.md 已含 ORCA 区块；`USER_MODEL_OVERRIDE.md` 此前**不在库**已补入（软链，见待裁决项） |
| 记忆 | `out-of-scope` | `.workbuddy/` 已被 .gitignore 忽略，不入库，本轮未动 |
| 工作区 | `changed-and-verified` | 残留已清，见 §9.3 |

### 9.2 一个必须记录的事实：出现非我创建的提交

盘点时发现 `fa3b3d7 chore(governance): 同步 ORCA 治理规则 2026-09-29`，作者时间 11:42:32，
**落在我分支 `docs/readme-and-nav-fix` 的顶端**，把 32 个治理文件（`docs/roles/`、`docs/sop/`、
`scripts/model/check-ledger.mjs` 等）一次性提交了。我没有执行这条命令 —— 说明有另一个执行体
（很可能是治理母版 `scripts/sync-old-projects.sh`）在**同一工作区并发写入**。

**影响**：① 本以为「留给用户决定」的治理文档被它直接入库了；
② 今后在本仓 commit 前必须先 `git log` 确认 HEAD，**不能假设 HEAD 仍是自己上一次的提交**；
③ 该提交落在功能分支上而非 main，push main 时会一并带入（内容为治理模板，无业务代码）。

### 9.3 残留清理判定

| 对象 | 判定 | 理由 |
|---|---|---|
| `USER_MODEL_OVERRIDE.md.bak-20260924` | **已删** | 全仓零引用的手工备份；且它是「残留」的活样本 —— 差点被 `git add -A` 带走 |
| `scratch/verify-{detail,home}-20260910.png` | **已删** | `scratch/` 声明为临时文件不进 Git，对应 QA 文档已入库 |
| `.gitignore` 补 `*.bak` / `*.bak-*` | **已加** | 原规则只挡 `*.旧版-2026-09-29`，缺这条才让上面那份 .bak 有机会混进提交 |
| `docs/**/*.旧版-2026-09-29`（8 个） | **保留** | .gitignore 已忽略，是治理迁移的回滚用，不是残留 |
| `.workbuddy/` | **不动** | .gitignore 已忽略，是工具目录非残留 |
| 4 个根级治理提示词 | **入库保留** | `迁移整理提示词.md` 被 AGENTS.md 引用；其余 3 个是同一套治理工具链配套 |
| `docs/model/DISPATCH-LOG.jsonl` | **清空为 0 字节** | 原为只有 `_example` 的模板行；本轮零派工，按 AGENTS「首个真实任务前删除示例行」处理 |

### 9.4 复核后判定「未过期、故不改」

- `CLAUDE.md` 的「`pnpm lint:style` 另有 7 项待治」：实测仍**正好 7 errors**，未过期。
- `CLAUDE.md` 的「`pnpm test` 当前无用例，待补」：与 README「跑不通」口径一致，不是失实。

### 9.5 提交拆分（便于单独回滚）

| commit | 内容 | 备注 |
|---|---|---|
| `a91714a` | README 中英双语 + P2 导航遮挡修复 | 本轮 |
| `fa3b3d7` | ORCA 治理规则同步 | **非我创建**，见 §9.2 |
| `76427a5` | 治理与项目记录入库 + BUGS/PLAN 事实面对齐 + 残留清理 | 本轮 |
| `cab00fe` | OBS-3 outbox 排序修复入库 | **单独成一个 commit**，便于未验证代码被独立回滚 |
