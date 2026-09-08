# 开发计划 (PLAN.md)

> 现状快照 2026-09-08：M2 代码完成并送审（待审查结论），S1 已发布，S2 Expose 已生效，
> L1 待 Redirect 白名单 + 人工登录。细节见 `docs/handoff/HANDOFF.md`。

## 当前阶段：M2 送审 + L1 待办

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
- [ ] M2 审查结论（`APPROVED_FOR_EXECUTION` / `CHANGES_REQUIRED` / `BLOCKED`）

### M3：Supabase 接入（S1 已发布）
- [x] Repository/Service 边界（supabase.ts）
- [x] photo_library Schema 数据合同
- [x] S1 审查通过并发布（正式 Migration `20260908021427/29`）
- [x] S2 Expose 生效（匿名 401 实测）
- [ ] Redirect 白名单增补（localhost:5000、192.168.31.60:5000）
- [ ] L1 真机证据（登录态读写/刷新/revision/清理）

### M4：Docker 与下载交接
- [ ] Dockerfile
- [ ] compose.yaml
- [ ] server.mjs 静态服务
- [ ] /healthz 健康检查
- [ ] docker/env.template
- [ ] MAC_MINI_DOCKER_HANDOFF.md

### M5：独立审查与回归
- [ ] Code Reviewer 输出 CODE_REVIEW.md
- [ ] QA 输出 BUGS.md 和 QA 结果
- [ ] Product Reviewer 输出 PRODUCT_BACKLOG.md
- [ ] 修复 P0/P1
- [ ] neat-freak 收口
