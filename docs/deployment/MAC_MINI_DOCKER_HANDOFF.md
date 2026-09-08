# Mac Mini Docker 交接 (MAC_MINI_DOCKER_HANDOFF.md)

## 状态: ✅ 已本地验证（2026-09-08，镜像 photo-library:20260908-m4，验完已 down，现场无残留）

## 本次验证证据
- `docker compose build` 成功（VITE_* 由 `.env.local` 构建期注入）
- `docker compose up -d` 后容器 `healthy`；宿主 8082：`/healthz` 200、`/` 200、`/find` 200、`/tags` 200
- 镜像内无 env 文件（`.dockerignore` 生效，exec 实测）
- 附带修复：builder 加 `apk add --no-cache bash`（BUG-10）；健康检查改 `127.0.0.1`（BUG-11）

## 项目标识
- **project_slug**: `photo-library`
- **开发源码**: `/Users/zzymima0000/Developer/coding/1.Active/ing丨0907photo-library/`
- **正式部署副本**: `/Users/zzymima0000/Developer/coding/docker/photo-library/`
- **持久化业务文件**: `/Users/zzymima0000/DockerData/photo-library/`（当前无服务端文件，暂不需要）
- **备份与恢复演练**: `/Users/zzymima0000/DockerBackups/photo-library/`

## 端口
- Docker 宿主机: 8082
- 容器内部: 3000
- 开发: 5000（`pnpm run dev`，本地开发时）

## 环境变量接口
```
PROJECT_SLUG=photo-library
COMPOSE_PROJECT_NAME=photo-library
APP_PORT=8082
PUBLIC_APP_URL=
IMAGE_TAG=
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

## 升级步骤
1. 在开发目录完成代码修改和测试
2. 构建新镜像: `docker build -t photo-library:<tag> .`
3. 更新 compose.yaml 的 IMAGE_TAG
4. `docker compose up -d`
5. 验证 /healthz

## 回滚步骤
1. 修改 IMAGE_TAG 为上一版本
2. `docker compose up -d`
3. 验证 /healthz

## 备份
- Supabase 数据: 按数据库规范导出到 DockerBackups/photo-library/
- 当前无服务端本地文件需要备份

## 注意事项
- VITE_* 改动后必须重建镜像，不能只重启容器
- Docker Up + healthz 200 只证明 Runtime 工作
- 不证明 Supabase、RLS、图片上传或同步通过
