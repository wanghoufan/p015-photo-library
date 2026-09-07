# 开发计划 (PLAN.md)

## 当前阶段：M1 — 可点击的完整摄影库体验

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

### M2：本地优先闭环（进行中）
- [x] IndexedDB 数据层（idb stores）
- [x] 图片处理（缩略图 + 展示图）
- [x] Outbox 入队
- [ ] 离线新增、编辑、删除完整闭环
- [ ] 同步状态 UI 实时更新
- [ ] 刷新后本地数据仍存在

### M3：Supabase 适配准备
- [x] Repository/Service 边界（supabase.ts）
- [x] photo_library Schema 数据合同
- [ ] RLS、Storage、revision、备份方案
- [ ] 待审 SQL 草案
- [ ] 隔离验证材料

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
