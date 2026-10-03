# 摄影作品库 (photo-library) — Agent 协作入口

<!-- ORCA-RULES-BLOCK:BEGIN -->
<!-- 本区块由治理母版 scripts/sync-old-projects.sh 于 2026-09-29 注入；只增不删，可重复运行原地更新。 -->
<!-- 本项目 AGENTS.md 的其余内容（项目专属规矩）保持原样，冲突时以本区块为准。 -->
## ORCA 规则增量（母版 2026-09-29-产品验收）

> 本区块只写**对外通用**的机制增量；派工细节见 `docs/roles/`，账本口径见下方条目。

- **产品验收（2026-09-28 定）**：开发完成的判断来自**用户可见要求的覆盖证据**，不只看单测／构建／代码审查／工具调用成功。
  - 验收标准写在计划里：Phase1 给每条用户可见要求编一条可观察可测的**验收条目（AC）**，并标出**关键 AC**（对应 P0／blocking P1／核心用户路径／必要视觉交互呈现）；**关键 AC 集合不得为空**。
  - 证据落 `docs/qa/` 的**产品验收追踪矩阵**（照 `docs/qa/BUGS.template.md` 同名节）。
  - **不可放行三情形**（命中任一不得判 `PASS`）：①关键产品 DoD／AC 未测；②关键任务涉及的**每个**可见操作控件未实际点击并观察到页面／锚点／状态变化（只验 `href` 存在不算）；③验收证据缺失。
  - 视觉验收最小覆盖：关键用户任务逐条走通、按项目要求检查桌面与窄屏、用边界样本（奇偶条目数／长标题长正文／空状态）检验对齐·换行·裁切·溢出·可读性、留真实浏览器截图。
  - **用户签收**：发布类型为**首次发布**的，用户签收通过才算完成（签收前状态记未完成）；迭代更新与局部修复不强制签收。签收属 **Human Gate 范畴（用户参与）**，**不是新增 QA Gate**。
- **体系更新三件套（2026-09-29 定）**：①本项目规则文件改动后与母版对齐（用 `bash scripts/sync-old-projects.sh` 或按《迁移整理提示词》取包，**备份不覆盖**）；②账本内容**不重写**（实绩历史），只做 schema 校验 `node scripts/model/check-ledger.mjs docs/model`（须 `LEDGER-OK`）；③**HANDOFF 记一行**。**老项目无两包概念，故母版的「同步两包＋更新对外概览」不适用。**
- **派工跨目录禁令（2026-09-29 定）**：派 opencode 通道角色（supervisor／neat-freak／experience-recorder）时，任务里读写本仓以外目录（如 `/tmp`、`1.Active/` 等）会被 `external_directory` 权限自动拒、步骤静默失败，可能让角色误报已做也易反复盲试烧额度（禁盲试）；派单前处置二选一——①临时文件改到仓内已 gitignore 的 `temp/`，②先取得用户授权；codebuddy／codex 通道无此限制。
- **红线（2026-09-29 增补）**：产品验收未落盘或关键 AC 未测、不得报完工/收工；首次发布未取得用户签收、不得报完工/收工。
- **本项目迁移状态**：`docs/model/GOVERNANCE-STATE.json`（`rules_version`／`synced_at`／`project_phase_field`／`task_ledger_rows`／`agents_needs_manual_merge`／`product_acceptance_ac_added`）。
- **存量项目待办（不自动做，需项目 TM 判断）**：本项目实绩 Plan 需补「视觉与交互验收标准（AC 编号）＋关键 AC 集合＋发布类型」，否则新规则下收尾会被判**计划缺项**；完成后把 `product_acceptance_ac_added` 置 `true`。
<!-- ORCA-RULES-BLOCK:END -->


> 所有 Agent 进入项目后必须先读本文件。

# AGENTS.md｜ORCA V2.1（全员遵守，一页）

## 角色（9 常驻 + 1 升级专用，不再新增）

task-manager=编排者（唯一对人说话）｜supervisor=监督者（只对编排者说话，编排者失联时除外）｜planner｜builder｜code-reviewer｜qa｜product-reviewer｜experience-recorder｜neat-freak｜senior-expert=高级开发（只接升级任务）。职责看 `docs/roles/`，一句话一张。

## 谁写哪（写错地方打回）

| 谁 | 写哪 | 模板 |
|---|---|---|
| planner | `docs/pm/` | PLAN.template.md |
| builder | 业务仓库本身 | — |
| code-reviewer | `docs/review/` | CODE_REVIEW.template.md |
| qa | `docs/qa/` | BUGS.template.md |
| product-reviewer | `docs/review/` | PRODUCT_BACKLOG.template.md |
| task-manager | `docs/handoff/` | HANDOFF.template.md |
| supervisor | 无独立文档，打回写被检文件评论区 | — |
| experience-recorder | 根 `经验一句话.md`，追加一句 | — |
| neat-freak | 改对应 docs 原文+交接记一笔 | — |
| senior-expert | 业务仓库本身（只接升级任务） | — |

业务文件（src/assets/配置/AGENTS.md/旧交接）原地不动；搬了会 broken 的留原地记映射。

## 派工顺序

planner 拆→builder 写→code-reviewer 复核→qa 测→product-reviewer 验→supervisor 复检→编排者收齐找人。经验/neat-freak 只在收尾派一次。本窗口内派 subagent，全自动。
跳步：单文件小修可跳 planner/product，不可跳 code-reviewer+qa+supervisor；跳了记一句原因。分歧听谁的：技术分歧听 code-reviewer，范围分歧听 Task Manager。
续 session：同一功能/Bug 链（开发→QA→返工→再 QA）尽量续上一个 session（codex 用 resume），不要每轮新开；返工派必须续。用完不急着关，关了重开更贵。resume 由派工基础设施保持，编排者不手动开终端；升级换 senior-expert 时开新链，不续旧 session。

## 模型

每次派前读根 `USER_MODEL_OVERRIDE.md`，有就用它。精确 ID，禁别名。换谁、用到几时，用户定。

## 升级（普通→高级，只对当次任务）

- 触发：① builder 同一任务连续失败 2 次自动升 ② 编排者判定 P0-hard 手动升。满足一条即升。
- 计数口径：以 supervisor 复检“打回”为准，同一 Task 累计被打回 2 次即升；rework=打回次数，升级后延续计数不归零。
- 只升当次，不永久转正。换模型即开新链（旧链结论进 HANDOFF，缓存不跨链）。升级原因 + 返工次数记进任务账本。
- senior 模型读 `USER_MODEL_OVERRIDE.md` 的 senior-expert 行。

## 任务账本（换模型的依据，一个项目一个文件）

- 文件：`docs/model/TASK-MODEL-LOG.jsonl`，一行一任务，跨项目同名同 schema，分析时拼起来直接统计。模板自带的 `{"_example":true}` 行不参与统计，首个真实任务前删除。
- schema（全单行，枚举锁死）：`{"task","project","date","role","model","result":"PASS/FAIL","rework":数字,"escalated":"YES/NO","escalation_reason":null或一句,"tokens":数字或null,"cost_cny":数字或null}`。`cost_cny` 与 `tokens` 拿不到填 `null`，不许编；`project` 取当前项目名，`date` 取 `YYYY-MM-DD`。
- 分工：builder/senior 写一行初版→supervisor 校验 JSON 合法+返工数→编排者判结果落盘。
- 换模型决策先读账本：返工多、常升级的任务类型优先换强模型。

## 缓存五条（各家通用，够用就行）

- 静态打头：派工先读同一批文件，顺序全体系唯一：AGENTS→角色卡→override 表→HANDOFF→经验一句话→任务目标放最后。prefix 稳定命中，谁也不许自创顺序。
- 动态押后：任务目标、git 状态、时间戳、随机 ID 永远放最后，system prompt 前面只放不变的东西。
- 同链续 session：一链之内不换 prompt/工具/skill，要换就开新链重起。
- 长了就压：上下文太长编排者做一次 compaction（结论+未闭环进 HANDOFF，历史扔掉），别拖几十万 token 硬扛。
- 缓存 best-effort，几小时到几天过期正常，不定 KPI，只定动作。

## 红线

- P0 没完+人没喊停，不准收工，不准“先到这里”。
- 每轮末三行心跳：目标/剩 P0/下一步。
- 不 push（commit 需编排者明确指令，含分支名，外部者用 `ext/` 开头）；不碰 secrets；不改 V1.10。
- 换模型的事用户决策，不许自作主张、不许写恢复类条件。


## 项目概述

私人摄影作品库 PWA。单人自用，移动优先、桌面增强。用户可以添加摄影作品，按地点、风格、构图和自定义标签整理；在画廊中总览作品，通过分面筛选和搜索快速找到照片。数据首先保存在本地 IndexedDB，登录后同步到用户自己的 Supabase。

## 项目结构事实

```
src/                    # React + TypeScript + Vite 前端源码
├── main.tsx            # React 入口
├── App.tsx             # 路由配置
├── index.css           # 全局样式 (Tailwind)
├── lib/                # 核心库
│   ├── types.ts        # 类型定义
│   ├── utils.ts        # 工具函数
│   ├── facet-config.ts # 分面配置（数据驱动）
│   ├── filter-engine.ts# 分面筛选引擎
│   ├── demo-data.ts    # 演示数据生成
│   ├── idb.ts          # IndexedDB 数据层
│   ├── sync.ts         # 同步/Outbox
│   ├── supabase.ts     # Supabase 客户端
│   └── image.ts        # 图片处理
├── components/         # UI 组件
│   ├── AppShell.tsx
│   ├── PrimaryNavigation.tsx
│   ├── AddFAB.tsx
│   ├── GalleryGrid.tsx
│   ├── MediaCard.tsx
│   ├── BatchImportPanel.tsx
│   ├── TagsPage.tsx → 见 pages/TagsPage.tsx（标签管理页）
│   ├── Lightbox.tsx
│   ├── FacetSidebar.tsx
│   ├── FacetBar.tsx
│   ├── SearchInput.tsx
│   ├── ActiveFilterList.tsx
│   ├── SyncStatus.tsx
│   └── EmptyResults.tsx
├── pages/              # 页面
│   ├── Gallery.tsx     # 画廊首页
│   ├── Find.tsx        # 筛选与查找
│   ├── WorkDetail.tsx  # 作品详情
│   ├── AddWork.tsx     # 添加/编辑作品（单张 + 批量导入）
│   ├── TagsPage.tsx    # 标签管理（地点/风格/构图/自定义）
│   └── Me.tsx          # 我的（含 Google 登录入口）
├── stores/             # 状态管理
│   └── WorkStore.tsx   # 作品数据 Context
└── hooks/              # 自定义 Hooks（预留）

server/                 # Express 服务端
scripts/                # 构建/启动脚本
docs/                   # 多 Agent 协作文档
├── roles/              # 角色定义
├── pm/                 # 计划
├── architecture/       # 架构文档
├── db/                 # 数据库方案
├── deployment/         # 部署交接
├── qa/                 # 测试与 Bug
├── review/             # 审查与产品反馈
└── handoff/            # 交接文档
scratch/                # 临时文件（不进 Git）
```

## 技术栈

- **框架**: React 19 + TypeScript + Vite 7
- **样式**: Tailwind CSS 3
- **路由**: React Router v7
- **PWA**: vite-plugin-pwa
- **本地存储**: IndexedDB (idb)
- **云端**: Supabase JS (独立 Schema: photo_library)
- **图标**: Lucide React
- **测试**: Vitest + React Testing Library
- **包管理**: pnpm（禁止 npm/yarn）

## 关键 Source of Truth

| 内容 | 位置 |
|---|---|
| 分面配置 | `src/lib/facet-config.ts` |
| 类型定义 | `src/lib/types.ts` |
| 筛选引擎 | `src/lib/filter-engine.ts` |
| 数据合同 | `docs/architecture/DATA_CONTRACT.md` |
| 分面引擎设计 | `docs/architecture/FACET_ENGINE.md` |
| 同步架构 | `docs/architecture/LOCAL_FIRST_SYNC.md` |
| Supabase 方案 | `docs/db/SUPABASE_INTEGRATION_PROPOSAL.md` |
| 开发计划 | `docs/pm/PLAN.md` |
| QA 回归基线 | `docs/qa/QA_CHECKLIST.md` |
| Bug 清单 | `docs/qa/BUGS.md` |
| 代码审查 | `docs/review/CODE_REVIEW.md` |
| 产品反馈 | `docs/review/PRODUCT_BACKLOG.md` |
| 交接文档 | `docs/handoff/HANDOFF.md` |

## 运行与预览

- 开发预览: `pnpm dev`（端口 5000）
- 构建: `pnpm build`
- 类型检查: `pnpm ts-check`
- Lint: `pnpm lint`
- 测试: `pnpm test`

## 用户偏好与长期约束

1. **独立 Schema**: 只使用 `photo_library`，不碰其他工具 Schema
2. **本地优先**: 先写 IndexedDB，UI 立即可见，再由 outbox 推送
3. **演示数据隔离**: demo 数据不上传云端
4. **分面配置数据驱动**: 不硬编码到 UI 组件
5. **视觉气质**: 克制、安静、偏私人收藏馆。图片是绝对主角
6. **禁止**: 蓝紫渐变、超大圆角、AI SaaS 风格、emoji 代替图标

## 常见问题和预防（2026-09-08 复核）

- ~~SyncStatus 使用 `require` 动态导入~~ 已关闭：全仓无 `require(`（BUG-1）
- Gallery.tsx 中 debounce 需要正确类型处理
- 演示数据使用 Unsplash 图片，需要网络访问
- 换构建/换环境服务后浏览器必须彻底重进（PWA SW 会咬旧包）
- 5000 端口出现多监听时先 `lsof -ti:5000` 查清再杀（tsx watch 父进程会复活子进程）
- **macOS 转交文本的剪贴板流程（2026-10-03 记）**：转交提示词/材料给用户或其他智能体时，流程固定为
  ① 提示词先落盘到项目根 `temp/`（该目录须在 `.gitignore` 里，不上传 GitHub，用完清理）；
  ② `pbcopy` 写入后**必须**立刻 `pbpaste` 回读，比对字节数 + 开头文本，两项都一致才允许说「已复制」；
  ③ 校验不一致就重试，不许报告成功、不许假装复制好了；长文本优先分段写入或直接给 md 文件绝对路径。
- 转交材料统一放项目根 `temp/`，不许散落在别处，也不许让用户去文档里手动复制正文。



