# CLAUDE.md - 项目快速入口

## 项目概述
摄影作品库 PWA，React + TypeScript + Vite + Tailwind CSS + IndexedDB + Supabase

## 关键命令
- `pnpm run dev` - 开发模式
- `pnpm run build` - 构建
- `pnpm run ts-check` - 类型检查
- `pnpm run test` - 运行测试

## 技术栈
- React 19, TypeScript, Vite 7
- Tailwind CSS, Lucide React
- IndexedDB (idb), Supabase JS
- React Router v7, vite-plugin-pwa
- Express (服务端), Vitest (测试)

## 目录结构
- `src/` - 前端源码
- `server/` - Express 服务端
- `docs/` - 项目文档
- `scripts/` - 构建脚本

## 重要约束
- 使用 pnpm（禁止 npm/yarn）
- TypeScript strict 模式
- 分面配置数据驱动
- 不硬编码 Supabase Schema
- 演示数据标记 isDemo=true

## 文档入口
- AGENTS.md - 多 Agent 协作规范
- docs/pm/PLAN.md - 项目计划
- docs/handoff/HANDOFF.md - 交接文档
