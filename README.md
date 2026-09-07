# 我的摄影作品库 (Photo Library)

私人摄影作品库 PWA，支持本地优先存储、分面筛选和 Supabase 云同步。

## 技术栈

- **前端**: React 19 + TypeScript + Vite 7
- **样式**: Tailwind CSS
- **路由**: React Router v7
- **存储**: IndexedDB (idb) + Supabase
- **PWA**: vite-plugin-pwa
- **图标**: Lucide React
- **测试**: Vitest
- **部署**: Docker + Node 22

## 快速开始

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm run dev

# 构建
pnpm run build

# 生产预览
pnpm run start
```

## 项目结构

```
photo-library/
├── src/
│   ├── components/     # 通用组件
│   ├── pages/          # 页面组件
│   ├── lib/            # 核心库（类型、分面引擎、IndexedDB、同步）
│   ├── stores/         # 状态管理
│   └── hooks/          # React Hooks
├── server/             # Express 服务端
├── docs/               # 项目文档
│   ├── architecture/   # 架构文档
│   ├── db/             # 数据库设计
│   ├── deployment/     # 部署文档
│   ├── qa/             # QA 文档
│   └── review/         # 审查文档
└── scripts/            # 构建脚本
```

## 核心功能

- **画廊**: 网格/瀑布流视图，灯箱浏览
- **分面筛选**: 地点、风格、构图、年份、方向、收藏
- **本地优先**: IndexedDB 存储，离线可用
- **云同步**: Supabase 同步（待配置）
- **PWA**: 支持添加到主屏幕，离线访问

## 环境变量

复制 `.env.example` 为 `.env.local`：

```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
```

## Docker 部署

```bash
# 构建镜像
docker build -t photo-library:latest .

# 启动容器
docker compose up -d

# 访问 http://localhost:8082
```

## 文档

- [AGENTS.md](./AGENTS.md) - 多 Agent 协作规范
- [PLAN.md](./docs/pm/PLAN.md) - 项目计划
- [HANDOFF.md](./docs/handoff/HANDOFF.md) - 交接文档
- [QA_CHECKLIST.md](./docs/qa/QA_CHECKLIST.md) - QA 检查清单

## 许可证

MIT
