# Bug 清单 (BUGS.md)

> 同一 Agent 自检记录，非独立 QA。

## 已知问题

### BUG-2: 演示数据使用外部 Unsplash 图片
- **严重度**: P3
- **状态**: OPEN
- **描述**: 演示图片依赖网络访问 Unsplash CDN
- **影响**: 离线环境下演示图片无法加载

### BUG-3: Express 全局错误中间件签名缺第 4 参数
- **严重度**: P1
- **状态**: FIXED (2026-09-07)
- **描述**: `server/server.ts` 错误处理中间件只有 `(err, req, res)` 3 参数，Express 不识别为错误中间件，`res` 实为 `next`，报错时二次崩溃 `res.status is not a function`
- **修复**: 补 ` _next: express.NextFunction` 第 4 参数

### BUG-4: dev 下 Vite 重复加载配置导致页面白屏
- **严重度**: P0
- **状态**: FIXED (2026-09-07)
- **描述**: `server/vite.ts` 内联传入完整 config 的同时未设 `configFile: false`，Vite 又从 cwd 加载一次 `vite.config.ts`，`react()` 实例化两次，所有 tsx 被双重 refresh transform，浏览器报 `Identifier 'RefreshRuntime' has already been declared`，`#root` 空白
- **修复**: `createViteServer` 加 `configFile: false`；已在内嵌浏览器逐页验证恢复

### BUG-5: package.json 缺少 "type": "module"
- **严重度**: P1
- **状态**: FIXED (2026-09-07)
- **描述**: 无 type 字段时 tsx 把配置链按 CJS 加载，`@vitejs/plugin-react-swc` 内 `import.meta.dirname` 为 undefined，`/@react-refresh` 500；且 Node 对 `.js` 报 MODULE_TYPELESS 警告
- **修复**: 加 `"type": "module"`；`vite.config.ts` 的 `__dirname` 改为 `process.cwd()` 方案（同时兼容 tsup CJS 打包，见 BUG-6）

### BUG-6: 生产包启动崩溃（顶层静态导入 vite 链 + start.sh 路径过期）
- **严重度**: P1
- **状态**: FIXED (2026-09-07)
- **描述**: `dist-server` 顶层 require `@swc/core`（tsup external，pnpm 下解析不到）；且加 type:module 后产物改名为 `server.cjs`，`scripts/start.sh` 仍指向 `server.js`
- **修复**: `server/vite.ts` 对 `vite` 与 `../vite.config` 改延迟动态导入（生产走静态服务分支，永不执行）；`start.sh` 改为 `server.cjs`；已验证 `COZE_PROJECT_ENV=PROD node dist-server/server.cjs` 正常启动，`/me` 显示已配置

### BUG-7: 分面筛选按 id 比对导致风格/构图计数全 0 且选中筛空
- **严重度**: P1
- **状态**: FIXED (2026-09-08)
- **描述**: `filter-engine.ts matchesFacetValues` 用选项名称去比 `facetValues[].id`，
  恒为 false：计数全 0，选中任一风格即筛空画廊
- **修复**: 改按 `fv.name` 比对（与 UI/URL 存名称一致）；桌面端已验证真实计数

### BUG-8: 图片读取失败静默跳过（HEIC 等）
- **严重度**: P1
- **状态**: FIXED (2026-09-08)
- **描述**: `processImage` 抛错即 `continue`，用户侧表现为“传不上去”且无任何提示
- **修复**: 解码失败降级为原文件直存（读尺寸）；彻底读不出则抛可展示错误，UI 逐条显示

## 已关闭
- BUG-1: SyncStatus 曾用 `require('@/lib/sync')`（P2）— 2026-09-07 复查 `src`/`server`/配置内已无 `require(`，关闭。

### BUG-9: 编辑页直连时表单空（IDB 异步到达晚于首渲染）
- **严重度**: P1
- **状态**: FIXED (2026-09-08)
- **描述**: `AddWork` 全用 `useState` 初始值，直连 `/edit/:id` 时既有数据到不了表单，
  提交按钮 permanent disabled
- **修复**: `seedKey(id+updatedAt)` 到达后回填一次，不覆盖用户输入
