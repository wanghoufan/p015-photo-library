# 交接文档 (HANDOFF.md)

## §0 快速开始

### 云端环境
```bash
pnpm install
pnpm dev          # 启动开发服务器（端口 5000）
pnpm build        # 生产构建
pnpm ts-check     # 类型检查
```

### 本地 Mac Mini 部署（待执行）
```bash
# 1. 克隆到开发目录
cd /Users/zzymima0000/Developer/coding/1.Active/
# 放置 photo-library 项目

# 2. 构建 Docker 镜像
docker build -t photo-library:latest .

# 3. 复制到部署目录
cp -r . /Users/zzymima0000/Developer/coding/docker/photo-library/

# 4. 配置环境变量
cp docker/env.template .env.local
# 编辑 .env.local 填入真实配置

# 5. 启动
cd /Users/zzymima0000/Developer/coding/docker/photo-library/
docker compose up -d
```

## §1 项目状态

### 已完成
- M0: 工程与协作骨架 ✅
- M1: 可点击的完整摄影库体验 ✅
- M2: IndexedDB 数据层 ✅（部分）
- M3: Supabase 客户端配置 ✅（未连接生产）

### 待完成
- M2: 离线操作完整闭环
- M3: RLS/Storage/Revision 实现
- M4: Docker 部署产物
- M5: 独立审查与回归

## §2 未验证项
- Supabase 生产接入：⏳ 待本地审核与验证
- Mac Mini Docker 部署：⏳ 待本地执行
- 真实手机 PWA：⏳ 待真机验证
- 多设备同步：⏳ 待双端验证

## §3 Supabase 接入
详见 `docs/db/SUPABASE_INTEGRATION_PROPOSAL.md`
SQL 草案: `docs/db/drafts/0001_init.pending.sql`

## §4 Docker 部署
详见 `docs/deployment/MAC_MINI_DOCKER_HANDOFF.md`

## §5 下一步
1. 本地 Agent 审核 Supabase 方案
2. 在共享平台仓库创建正式 Migration
3. 配置 Supabase 环境变量
4. 实现 M2 离线完整闭环
5. 完成 M4 Docker 部署
6. 真机 PWA 验证
