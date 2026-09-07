# 产品与技术规范

## 产品定位
私人摄影作品库 PWA。单人自用，移动优先、桌面增强。

## 信息架构
- 一级导航：画廊 / 筛选与查找 / 我的
- 画廊页内部：左侧地点分类 + 顶部风格/构图筛选 + 主体作品画廊

## 技术选择与理由

| 选择 | 理由 |
|---|---|
| React + Vite | 用户明确指定；轻量 SPA，不需要 SSR |
| TypeScript | 类型安全，多 Agent 协作必需 |
| Tailwind CSS | 快速迭代，一致的设计系统 |
| React Router | SPA 路由，URL 筛选同步 |
| vite-plugin-pwa | 官方 PWA 插件，Service Worker 管理 |
| idb | IndexedDB Promise 封装，类型安全 |
| Supabase JS | 用户既有共享项目，独立 Schema 接入 |
| Lucide React | 成熟图标库，tree-shakable |
| shadcn/ui 思路 | 使用 class-variance-authority + tailwind-merge 构建基础组件 |

## 开源复用与许可证

| 组件 | 许可证 | 说明 |
|---|---|---|
| React | MIT | 核心框架 |
| Vite | MIT | 构建工具 |
| Tailwind CSS | MIT | 样式框架 |
| React Router | MIT | 路由 |
| idb | ISC | IndexedDB 封装 |
| Supabase JS | MIT | 数据库客户端 |
| Lucide | ISC | 图标库 |
| class-variance-authority | Apache-2.0 | 组件变体 |
| Unsplash 样张 | Unsplash License | 演示数据图片，免费使用 |

## shadcn/ui blocks 参考
参考了 https://www.shadcn.io/blocks/gallery-grid-with-sidebar 的"左侧筛选 + 顶部筛选 + 画廊主体"结构。
该 Block 为 shadcn/ui 开源组件，MIT 许可证。本项目使用 shadcn/ui 开源基础组件独立实现同类交互，未复制受限源码。

## 视觉方向
- 图片是绝对主角
- 克制、安静、偏私人收藏馆的视觉气质
- 温暖但减少装饰，增加摄影展陈感
- 禁止蓝紫渐变、超大圆角、AI SaaS 风格
- 不使用 emoji 代替正式图标
