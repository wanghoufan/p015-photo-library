# 开发计划 (PLAN.md)

> 现状快照 2026-10-03：M0～M4 已完成并发布（画廊／筛选／添加与批量导入／详情／标签管理、
> 本地优先闭环、Supabase S1 云同步、Docker 部署），M5 收口未做。
> README 中英双语已整改（真实截图入仓，GitHub About 已填）。
> 桌面端 P2「lg 断点导航遮挡内容」已修（BUG-19，36 组实测无遮挡）。
> **仍挂**：OBS-3 的 outbox 依赖排序修复代码已写但**未跑过端到端实测**；
> M2 接线送审结论仍待；数据库月度巡检从未执行。
> 细节与逐条状态见 `docs/handoff/HANDOFF.md`。

## 当前阶段：M5 收口（发布已完成，收尾未做）

### M0：工程与协作骨架 ✅
- [x] 建立多 Agent 文档结构
- [x] 完成产品、技术、数据、同步和部署计划
- [x] 完成依赖与授权评估
- [x] 建立第一版 QA_CHECKLIST
- [x] 不连接生产数据库

### M1：可点击的完整摄影库体验 ✅
- [x] 使用真实感演示数据（Unsplash 样张）
- [x] 画廊首页（瀑布流/网格切换）
- [x] 筛选与查找页（分面侧栏 + 顶部分面 + URL 同步）
- [x] 添加/编辑作品页
- [x] 作品详情页（灯箱 + 键盘/触摸操作）
- [x] 我的页（同步状态、数据管理、PWA 说明）
- [x] 桌面分面布局 + 移动端折叠布局
- [x] URL 筛选同步和死路置灰
- [x] 空状态、加载状态

### M2：本地优先闭环（代码完成，送审待结论）
- [x] IndexedDB 数据层（idb stores + media_blobs v2）
- [x] 图片处理（缩略图 + 展示图 + HEIC 降级直存）
- [x] Outbox 入队（含合并语义 enqueueSave/enqueueDelete）
- [x] 离线新增、编辑、删除完整闭环（含刷新持久化，浏览器实测）
- [x] 同步状态 UI 实时更新（待同步计数 + 登录区）
- [x] 刷新后本地数据仍存在
- [x] 批量导入（一图一件 + AI 标签 JSON）+ 标签管理页（地点/风格/构图/自定义）
- [x] L1 本地 + 云端读写通过（2026-09-09，见 QA L8；修 BUG-15/16/17/18，R2-1 乐观锁）
- [ ] M2 审查结论（`APPROVED_FOR_EXECUTION` / `CHANGES_REQUIRED` / `BLOCKED`）

### M3：Supabase 接入（S1 已发布）
- [x] Repository/Service 边界（supabase.ts）
- [x] photo_library Schema 数据合同
- [x] S1 审查通过并发布（正式 Migration `20260908021427/29`）
- [x] S2 Expose 生效（匿名 401 实测）
- [x] Redirect 白名单增补（localhost:5000、192.168.31.60:5000，用户已加，curl 302 验证）
- [x] L1 证据（登录态读写/刷新/revision/清理，本地 + 云端均通过）

### M4：Docker 与下载交接（2026-09-08 本地验证通过，镜像 photo-library:20260908-m4）
- [x] Dockerfile（含 builder 装 bash 修 BUG-10）
- [x] compose.yaml（健康检查改 127.0.0.1 修 BUG-11）
- [x] server.mjs 静态服务
- [x] /healthz 健康检查（容器 healthy，宿主 8082 实测 200）
- [x] docker/env.template
- [x] MAC_MINI_DOCKER_HANDOFF.md（已验证，`7349155`）

### M5：独立审查与回归
- [ ] Code Reviewer 输出 CODE_REVIEW.md
- [ ] QA 输出 BUGS.md 和 QA 结果
- [ ] Product Reviewer 输出 PRODUCT_BACKLOG.md
- [ ] 修复 P0/P1
- [ ] neat-freak 收口
