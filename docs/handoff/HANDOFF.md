# 交接文档 (HANDOFF.md)

> 最后更新：2026-09-08（恢复开发会话暂停点）。下一 Agent 先读本文件 + `AGENTS.md`，再开工。

## §0 当前服务状态（先看这个）

- **5000 端口现在跑的是开发服务**（`pnpm dev` → `scripts/dev.sh` → `tsx watch server/server.ts`，
  本会话内由恢复任务启动，PID 91258，日志 `/tmp/photo-dev.log`）。`/api/health` 实测 **200**。
- **Git 已干净**：上一会话遗留的 14 个未提交文件已入库为 `52f14f5 feat: M2 本地优先闭环 + 批量导入 + 标签管理 + S1 送审同步`。
  唯一未跟踪文件是 `备份本文件夹.command`（用户个人脚本，不动它）。
- `.env.local`：`VITE_SUPABASE_URL` 为裸 host、`publishable key` 已填、`PUBLIC_APP_URL` 空。仅公开变量，无私密值。
- **lint 已通过**：`d414c3c` 修完 4 处 `unused-vars` 后，本会话复测 `pnpm lint` 与
  `pnpm lint:build` 均为 exit=0，`pnpm ts-check` 通过（dev 服务仍在 PID 91258，`/api/health` 200）。
- **M4 已本地验证通过**（本会话，见 §1）：镜像 `photo-library:20260908-m4` 构建成功；
  `compose up` 后容器 `healthy`，`/healthz`、`/`、`/find`、`/tags` 全 200；镜像内无 env 文件。
  修了 2 个 Dockerfile/compose 问题（`apk add bash`、健康检查改 `127.0.0.1`）。
  验证完已 `compose down`，现场无残留容器。改动未提交：`Dockerfile`、`compose.yaml`。

## §1 本会话已完成的工作

### 阶段 1：环境与页面验证 ✅（上一会话，回顾）
- 空目录克隆 `https://github.com/wanghoufan/photo-library.git`，`pnpm install` 通过。
- `pnpm run dev`（5000）+ `/api/health` + 全路由 200；5 页逐页代码核查通过。
- `ts-check` 通过；`build` 通过；`lint` 10→4（剩余全历史遗留）。

### 修阻塞 bug（`docs/qa/BUGS.md` BUG-1～BUG-9）✅（上一会话，回顾）
- BUG-3：Express 错误中间件缺第 4 参数（崩溃 `res.status is not a function`）。
- BUG-4：`server/vite.ts` 未设 `configFile:false` → Vite 二次加载配置，react 插件双实例，
  dev 白屏（`RefreshRuntime 重复声明`）。
- BUG-5：补 `"type": "module"`；alias 改 `process.cwd()` 方案（兼容 tsup CJS 打包）。
- BUG-6：生产包顶层静态导入 vite 链崩溃 → 延迟动态导入；产物改名 `server.cjs`，`start.sh` 同步。
- BUG-7：分面按 `fv.id` 比对致风格/构图计数全 0 → 改按名称。
- BUG-8：HEIC 等解码失败静默跳过 → webp→原文件直存→可展示报错三级处理。
- BUG-9：编辑页直连空表单 → `seedKey` 回填。另：标题/说明改为可选（空标题取文件名）。

### Supabase S1 ✅（已发布，上一会话，回顾）
- 送审包在 `alw丨数据库管理专家/项目审查丨photo-library/`：
  接入申请 25 项 + 草案 0001（表/RLS）/0002（Storage）+ `setup_stub.sql`/`verify.sql`/`verify_result.txt`
  + 审查意见 S1 V1.0（CHANGES_REQUIRED）+ 增量复审 V1.1（**APPROVED_FOR_EXECUTION**）。
- R1-1～R1-5/R1-7 已修并复审通过；R1-6 归 M2。
- S1 已发布（正式 Migration `20260908021427/29`，平台记录 Local=Remote=10）。
- S2 Expose：匿名 `Accept-Profile` 实测 `42501 + 401`（Schema 可达、anon 无权限），判定**已生效**。
- 阻塞：Google 登录回跳 `http://localhost:5000` 未进 Redirect 白名单，OAuth 会落到共享
  Site URL（`192.168.31.60:3100`）。**需 Dashboard 增补** `http://localhost:5000` 与
  `http://192.168.31.60:5000`（纯增补，不影响其他工具），然后才能 L1。

### M2 接线 ✅（代码完成，已入库，已送审，待审查结论）
- `sync.ts` 重写：snake_case 映射 + owner 注入、update 剥离非 DB 列 + `revision=base+1`、
  wfv 删建、`pullRemote` 补 4 表、Storage `<uid>/` 上传、未登录只排队。
- `WorkStore` 真接 IDB/outbox（种子→关系重建→blob 重 hydration→signedUrl 内存补水→登录联动）；
  demo 行本地通道。`AddWork` blob 流 + 批量导入面板（一图一件 + AI 标签 JSON 映射）；
  `Me` 加 Google 登录区；新增 `/tags` 标签管理页（地点/风格/构图/自定义标签的增删改查+子标签）。
- 送审：`字段映射表丨M2.md` + `M2接线送审丨photo-library.md`（转送清单第 9–10 行）。
- 离线闭环已自测：新增→刷新→编辑（rev 递增合并）→删除；批量导入 3 张实测（映射/未匹配/分面挂载全对）；
  标签改名/删除联动实测。L1（登录态读写/revision/清理/越权）待 S2 Redirect + 人工登录后补。

### 移动端验证 ✅（用户桌面 Chrome 实测，上一会话，回顾）
- 手机宽度布局正确：无侧栏、无顶部分面条、双列大图、底部导航、+ 按钮。
- 卡片手机常显日期+地点（桌面 hover 不变）。
- 缺口：手机端无地点筛选入口（拟加筛选页地点抽屉，待用户拍板）；年份/方向/收藏摆放待用户拍板。

### 本会话（恢复开发）实际干的事 ✅
1. 杀掉 5000 端口的生产构建（`node dist-server/server.cjs`，PID 62518，PPID=1 的孤儿进程，
   `lsof` 确认单监听后 `kill -9`，复查回 0）。
2. 切回开发服务：后台启动 `pnpm dev`（日志 `/tmp/photo-dev.log`），`Server running at
   http://localhost:5000`，`/api/health` 实测 200。
3. 实测 `pnpm lint`：剩 **4 个 error，清一色 `unused-vars`**，精确位置：
   - `src/components/FacetBar.tsx:1` — `getOrientationLabel` 定义未用
   - `src/lib/demo-data.ts:2` — `generateId` 定义未用
   - `src/lib/filter-engine.ts:88` — `computeWorkOrientation` 定义未用
   - `src/pages/Gallery.tsx:27` — `allMedia` 赋值未用
   （修法：确认无外部引用后删定义/删变量即可。后补记：洁癖收口会话已修完，
   commit `d414c3c`，`pnpm lint:build` exit=0、`ts-check` 通过，本会话复测确认。）
4. 核对 M4 现状：`Dockerfile`、`compose.yaml`、`server.mjs`（含 `/healthz`）、
   `docker/env.template` **四个文件都已存在**，但从未真实验证
   （`docker build / up / healthz` 一次没跑过）。所以 PLAN M4 仍算未完成。
   （后补记：本会话已验证通过，见下「M4 本地验证」节。）

### M4 本地验证 ✅（本会话，2026-09-08）
- 镜像 `photo-library:20260908-m4`：`docker compose build` 成功（VITE_* 由 `.env.local` 注入，
  仅构建期烘焙，不回显密钥）。
- 修了 2 个阻塞问题（记 `docs/qa/BUGS.md` BUG-10/BUG-11）：
  1. `node:22-alpine` 无 bash，`pnpm build`（调 `bash ./scripts/build.sh`）失败 →
     builder 阶段加 `apk add --no-cache bash`。
  2. 容器内 `wget localhost` 走 `::1` 被拒（`server.mjs` 只听 `0.0.0.0`），健康检查起不来 →
     `Dockerfile` HEALTHCHECK 与 `compose.yaml` 健康检查 URL 改 `127.0.0.1`。
- `compose up -d` 后容器状态 `healthy`；宿主 8082：`/healthz` 200、`/` 200、
  深路由 `/find` 200、`/tags` 200；`docker exec` 确认镜像内无 env 文件（`.dockerignore` 生效）。
- 验证完已 `docker compose down`（连带 network 删除），`docker ps` 确认无残留。
  故意不停留验证容器：容器名 `photo-library` 会和正式部署副本冲突。
- 待办：`MAC_MINI_DOCKER_HANDOFF.md` 状态翻为已验证（本会话未改，等用户确认改动后一起）；

## §2 下一步任务（按序）

1. **清 lint ✅ 已完成（`d414c3c`，本会话复测 exit=0 + ts-check 通过）**。
2. **验证 M4 Docker ✅ 已完成（本会话）**：build/up/healthy/healthz/深路由/无env进镜像全过，
   容器已 down。剩：`MAC_MINI_DOCKER_HANDOFF.md` 状态翻已验证 + PLAN M4 打勾（等用户确认本次改动后一起）。
3. **Dashboard 补 Redirect URL**（用户/管理员手动）：增补 `http://localhost:5000`、
   `http://192.168.31.60:5000`。完成后复核既有工具登录一次。
4. **用户在 Orca 内嵌浏览器或本机 Chrome 的本应用 `/me` 点 Google 登录过同意屏**（只能人工），
   然后通知 Agent 采集 L1：uid 打码 → 读写 → 刷新重读 → revision 1→2 → 清理 → 越权自测 → 出 L1 记录。
5. **等 M2 审查结论**（`APPROVED_FOR_EXECUTION` / `CHANGES_REQUIRED` / `BLOCKED`），按结论修。
6. **等用户拍板两个产品决策**：① 筛选页地点抽屉做不做；② 年份/方向/收藏放哪（不动/侧栏底/折叠）。
7. L3/L4（双设备/冲突/断网）、备份恢复演练，另排期。

## §3 注意事项与规矩

### 来自两份规范（必守）
- 共享 Supabase 规范 V1.4（`Downloads/大模型 HANDOFF/2026-09-03…V1.4.md`）：
  独立 Schema `photo_library`；Migration 唯一来源是平台仓库，业务仓只留草案；
  治理材料唯一位置 `alw丨数据库管理专家/项目审查丨photo-library/`；未获批准不碰生产库/Dashboard；
  红线见接入包 `00_接入指引.md`（尤其：页面显示≠云端保存；realtime 只能通知）。
- Docker 规范 V1.1：四类目录职责；`docker` 部署副本未经授权不动；dev 目录不放生产私密值；
  `VITE_*` 改动必须重建镜像（构建期烘焙）。

### 实操教训（踩过）
1. **PWA Service Worker 会咬住旧包**：每次 `pnpm build` + 换环境服务后，浏览器必须彻底关标签重进
   （或清 SW），否则看到的是旧代码。手机看不到新功能先做这一步。
2. **5000 端口多进程**：`tsx watch` 父进程会复活子进程；`lsof -ti:5000 | kill` 后用
   `lsof -ti:5000 | wc -l` 确认只剩 1 个（或 0 个）监听再继续。生产孤儿进程（PPID=1）可直接杀。
3. **HMR websocket 连不上是已知现象**（vite.config 的 hmr 指向云端 6000/443），改完代码靠手动刷新验证。
4. **macOS 窗口最小 500px**，真 390px 测不了；断点 `lg=1024`，<1024 同一套手机布局。
5. **用户授权操作其桌面 Chrome**（computer-use，bundleId `com.google.Chrome`）；
   地址栏合成按键不稳定，打开 URL 用 `open -a "Google Chrome" <url>`；窗口复原尺寸 `1660x985`。
6. **密钥红线**：绝不在输出/日志/截图/文档里贴完整 key、token、access_token；
   `.env.local` 已在 `.gitignore`；验证连通只看状态码与错误码（PGRST125/42501/401）。
7. **OAuth 同意屏只能用户点**；登录态证据必须在已登录的浏览器 profile 里采，
   Orca 内嵌浏览器与用户 Chrome 的 IndexedDB 不互通。
8. **未登录 = 只排队不推送**（M2 红线）；demo 数据永不上云；批量导入默认一图一件；
   未知风格/构图名降级为普通标签不丢失。
9. `verify.sql` 头部复现命令与 `/t/` 目录约定是审查资产，改脚本同步改头部；
   `verify_result.txt` 头时间 + SHA 每次重跑必须刷新。
10. **dev 服务是后台起的**：日志看 `/tmp/photo-dev.log`（`tail -f`），停服先 `lsof -ti:5000`
    查清再杀。`scripts/dev.sh` 启动前会自动清端口，直接 `pnpm dev` 即可，不要手杀后再起两遍。
11. **commit/push 必须获用户明确授权**：上一会话 14 文件未授权未提交，本会话恢复时发现已入库
    （`52f14f5`）。新改动同样先放工作区，报出 diff 等用户拍板。
