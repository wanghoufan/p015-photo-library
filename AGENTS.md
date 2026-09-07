# 摄影作品库 (photo-library) — Agent 协作入口

> 所有 Agent 进入项目后必须先读本文件。

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
│   ├── AddWork.tsx     # 添加/编辑作品
│   └── Me.tsx          # 我的
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

## 常见问题和预防

- SyncStatus 组件使用了 `require` 动态导入，应改为静态 import
- Gallery.tsx 中 debounce 需要正确类型处理
- 演示数据使用 Unsplash 图片，需要网络访问
