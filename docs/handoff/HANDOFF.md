# 交接文档 (HANDOFF.md)

> 最后更新：2026-09-08（开发暂停点）。下一 Agent 先读本文件 + `AGENTS.md`，再开工。

## §0 当前服务状态（先看这个）

- **5000 端口现在跑的是生产构建**（`COZE_PROJECT_ENV=PROD node dist-server/server.cjs`，静态 `dist/`），
  切给用户手机预览用的。恢复开发第一件事：杀掉它，切回 `pnpm run dev`。
  ```bash
  lsof -ti:5000 | xargs kill -9
  pnpm run dev   # scripts/dev.sh，tsx watch server/server.ts
  ```
- **Git 有 14 个文件未提交**（本会话全部改动，未获授权故未 commit/push）：
  `package.json`、`vite.config.ts`、`server/server.ts`、`server/vite.ts`、`scripts/start.sh`、
  `src/lib/{idb,sync,types}.ts`、`src/stores/WorkStore.tsx`、`src/pages/{AddWork,Me}.tsx`、
  `src/components/{MediaCard,BatchImportPanel}.tsx`、`src/pages/TagsPage.tsx`（新）、
  `src/lib/{filter-engine,image}.ts`、`docs/architecture/DATA_CONTRACT.md`、
  `docs/db/drafts/0001_init.pending.sql`（头注）、`docs/qa/BUGS.md`。
- `.env.local`：`VITE_SUPABASE_URL` 为裸 host（曾误带 `/rest/v1/` 后缀，已修正）、
  publishable key 已填、`PUBLIC_APP_URL` 空。仅公开变量，无私密值。

## §1 本会话已完成的工作

### 阶段 1：环境与页面验证 ✅
- 空目录克隆 `https://github.com/wanghoufan/photo-library.git`，`pnpm install` 通过。
- `pnpm run dev`（5000）+ `/api/health` + 全路由 200；5 页逐页代码核查通过。
- `ts-check` 通过；`build` 通过；`lint` 10→4（剩余全历史遗留）。

### 修阻塞 bug（`docs/qa/BUGS.md` BUG-1～BUG-9）✅
- BUG-3：Express 错误中间件缺第 4 参数（崩溃 `res.status is not a function`）。
- BUG-4：`server/vite.ts` 未设 `configFile:false` → Vite 二次加载配置，react 插件双实例，
  dev 白屏（`RefreshRuntime 重复声明`）。根因定位过程见会话记录。
- BUG-5：补 `"type": "module"`；alias 改 `process.cwd()` 方案（兼容 tsup CJS 打包）。
- BUG-6：生产包顶层静态导入 vite 链崩溃 → 延迟动态导入；产物改名 `server.cjs`，`start.sh` 同步。
- BUG-7：分面按 `fv.id` 比对致风格/构图计数全 0 → 改按名称。
- BUG-8：HEIC 等解码失败静默跳过 → webp→原文件直存→可展示报错三级处理。
- BUG-9：编辑页直连空表单 → `seedKey` 回填。另：标题/说明改为可选（空标题取文件名）。

### Supabase S1 ✅（已发布）
- 送审包在 `alw丨数据库管理专家/项目审查丨photo-library/`：
  接入申请 25 项 + 草案 0001（表/RLS）/0002（Storage）+ `setup_stub.sql`/`verify.sql`/`verify_result.txt`
  + 审查意见 S1 V1.0（CHANGES_REQUIRED）+ 增量复审 V1.1（**APPROVED_FOR_EXECUTION**）。
- R1-1～R1-5/R1-7 已修并复审通过；R1-6 归 M2。
- S1 已发布（正式 Migration `20260908021427/29`，平台记录 Local=Remote=10）。
- S2 Expose：匿名 `Accept-Profile` 实测 `42501 + 401`（Schema 可达、anon 无权限），判定**已生效**。
- 阻塞：Google 登录回跳 `http://localhost:5000` 未进 Redirect 白名单，OAuth 会落到共享
  Site URL（`192.168.31.60:3100`）。**需 Dashboard 增补** `http://localhost:5000` 与
  `http://192.168.31.60:5000`（纯增补，不影响其他工具），然后才能 L1。

### M2 接线 ✅（代码完成，已送审，待审查结论）
- `sync.ts` 重写：snake_case 映射 + owner 注入、update 剥离非 DB 列 + `revision=base+1`、
  wfv 删建、`pullRemote` 补 4 表、Storage `<uid>/` 上传、未登录只排队。
- `WorkStore` 真接 IDB/outbox（种子→关系重建→blob 重 hydration→signedUrl 内存补水→登录联动）；
  demo 行本地通道。`AddWork` blob 流 + 批量导入面板（一图一件 + AI 标签 JSON 映射）；
  `Me` 加 Google 登录区；新增 `/tags` 标签管理页（地点/风格/构图/自定义标签的增删改查+子标签）。
- 送审：`字段映射表丨M2.md` + `M2接线送审丨photo-library.md`（转送清单第 9–10 行）。
- 离线闭环已自测：新增→刷新→编辑（rev 递增合并）→删除；批量导入 3 张实测（映射/未匹配/分面挂载全对）；
  标签改名/删除联动实测。L1（登录态读写/revision/清理/越权）待 S2 Redirect + 人工登录后补。

### 移动端验证 ✅（用户桌面 Chrome 实测）
- 手机宽度布局正确：无侧栏、无顶部分面条、双列大图、底部导航、+ 按钮。
- 卡片手机常显日期+地点（桌面 hover 不变）。
- 缺口：手机端无地点筛选入口（拟加筛选页地点抽屉，待用户拍板）；年份/方向/收藏摆放待用户拍板。

## §2 下一步任务（按序）

1. **Dashboard 补 Redirect URL**（用户/管理员手动）：增补 `http://localhost:5000`、
   `http://192.168.31.60:5000`。完成后复核既有工具登录一次。
2. **用户在 Orca 内嵌浏览器或本机 Chrome 的本应用 `/me` 点 Google 登录过同意屏**（只能人工），
   然后通知 Agent 采集 L1：uid 打码 → 读写 → 刷新重读 → revision 1→2 → 清理 → 越权自测 → 出 L1 记录。
3. **等 M2 审查结论**（`APPROVED_FOR_EXECUTION` / `CHANGES_REQUIRED` / `BLOCKED`），按结论修。
4. **等用户拍板两个产品决策**：① 筛选页地点抽屉做不做；② 年份/方向/收藏放哪（不动/侧栏底/折叠）。
5. L3/L4（双设备/冲突/断网）、备份恢复演练、M4 Docker 部署，另排期。
6. `lint` 剩余 4 个历史 `unused-vars`，顺手可清（非阻塞）。

## §3 注意事项与规矩

### 来自两份规范（必守）
- 共享 Supabase 规范 V1.4（`Downloads/大模型 HANDOFF/2026-09-03…V1.4.md`）：
  独立 Schema `photo_library`；Migration 唯一来源是平台仓库，业务仓只留草案；
  治理材料唯一位置 `alw丨数据库管理专家/项目审查丨photo-library/`；未获批准不碰生产库/Dashboard；
  红线见接入包 `00_接入指引.md`（尤其：页面显示≠云端保存；realtime 只能通知）。
- Docker 规范 V1.1：四类目录职责；`docker` 部署副本未经授权不动；dev 目录不放生产私密值；
  `VITE_*` 改动必须重建镜像（构建期烘焙）。

### 实操教训（本会话踩过）
1. **PWA Service Worker 会咬住旧包**：每次 `pnpm build` + 换环境服务后，浏览器必须彻底关标签重进
   （或清 SW），否则看到的是旧代码。手机看不到新功能先做这一步。
2. **5000 端口多进程**：`tsx watch` 父进程会复活子进程；`lsof -ti:5000 | kill` 后用
   `lsof -ti:5000 | wc -l` 确认只剩 1 个监听再继续。
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
