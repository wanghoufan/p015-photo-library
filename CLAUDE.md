# CLAUDE.md - 项目快速入口

> 规范真身为 `AGENTS.md`；本文件为同源精简镜像（保持 60 行内）。改约束请改 AGENTS.md 再同步此处。

## 项目概述
私人摄影作品库 PWA，单人自用，移动优先、桌面增强。本地优先 IndexedDB，登录后 Supabase 同步（Schema `photo_library`）。

## 关键命令
- `pnpm dev` — 开发（端口 5000，`scripts/dev.sh` → `tsx watch server/server.ts`）
- `pnpm build` — 构建（`scripts/build.sh` → Vite + tsup）
- `pnpm ts-check` — 类型检查
- `pnpm lint:build` — ESLint（`pnpm lint` 同义，`pnpm lint:style` 另有 7 项 stylelint 待治）
- `pnpm test` — Vitest（当前无用例，待补）

## 技术栈
- React 19, TypeScript, Vite 7, React Router v7, vite-plugin-pwa
- Tailwind CSS 3, Lucide React, idb, Supabase JS, Express, Vitest

## 目录结构
- `src/` 前端源码（`lib/` 分面引擎/IDB/sync，`pages/`/`components/`/`stores/`）
- `server/` Express + Vite 中间件；`scripts/` 构建/启动；`docs/` 多 Agent 文档

## 重要约束
- pnpm（禁止 npm/yarn），`type: module`，TS strict，分面数据驱动，不硬编码 Schema，demo `isDemo=true` 永不上云
- 独立 Schema `photo_library`；Migration 唯一来源为共享平台仓库

## 文档入口
- AGENTS.md — 权威协作规范与 Source of Truth 索引
- docs/pm/PLAN.md · docs/handoff/HANDOFF.md · docs/qa/BUGS.md · docs/qa/QA_CHECKLIST.md
