# 代码审查 (CODE_REVIEW.md)

> 同一 Agent 自检记录，非独立审查。

## 审查范围
M1 阶段全部源码

## 发现

### CR-1: 分面引擎性能
- **严重度**: P3
- **描述**: `computeFacetCounts` 对每个选项都遍历全部作品，数据量大时可能较慢
- **建议**: 当前几百条数据无问题；未来数据量增长时考虑增量计算

### CR-2: 图片处理在 UI 线程
- **严重度**: P3
- **描述**: `processImage` 使用 Canvas 在 UI 线程处理图片，大图可能阻塞
- **建议**: 考虑使用 OffscreenCanvas 或 Web Worker

### CR-3: 演示数据 ID 确定性
- **严重度**: P3
- **描述**: `generateDemoWorks` 使用 `Math.random()` 选择风格和构图，每次刷新结果不同
- **建议**: 可使用 seeded random 保持一致性

## 已关闭
（暂无）
