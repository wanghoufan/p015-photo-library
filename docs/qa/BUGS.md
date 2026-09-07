# Bug 清单 (BUGS.md)

> 同一 Agent 自检记录，非独立 QA。

## 已知问题

### BUG-1: SyncStatus 组件使用 require 动态导入
- **严重度**: P2
- **状态**: VERIFY
- **描述**: `SyncStatus.tsx` 中使用了 `require('@/lib/sync')` 动态导入，应改为静态 import
- **影响**: 可能在某些构建配置下失败

### BUG-2: 演示数据使用外部 Unsplash 图片
- **严重度**: P3
- **状态**: OPEN
- **描述**: 演示图片依赖网络访问 Unsplash CDN
- **影响**: 离线环境下演示图片无法加载

## 已关闭
（暂无）
