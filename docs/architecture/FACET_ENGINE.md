# 分面引擎设计 (FACET_ENGINE.md)

## 核心概念
分面筛选由配置驱动，不硬编码到 UI 组件。

## FacetDefinition
```typescript
type FacetDefinition = {
  key: string           // 唯一标识
  label: string         // 显示名
  location: 'sidebar' | 'top'  // 显示位置
  mode: 'single' | 'multi'     // 选择模式
  operator: 'and' | 'or'       // 同维度组合逻辑
  valueSource: string   // 数据来源
  showCounts: boolean   // 是否显示计数
  disableZeroResults: boolean  // 零结果是否置灰
}
```

## 当前分面配置
| key | label | location | mode | operator | valueSource |
|---|---|---|---|---|---|
| location | 地点 | sidebar | multi | or | locations |
| style | 风格 | top | multi | or | facet:style |
| composition | 构图 | top | multi | or | facet:composition |
| year | 年份 | top | single | and | computed:year |
| orientation | 方向 | top | single | and | computed:orientation |
| favorite | 收藏 | top | single | and | computed:favorite |

## 筛选逻辑
- 跨维度使用 AND
- 同维度多选默认使用 OR
- 每个选项显示当前结果数量
- 零结果选项置灰，但已选中的仍允许取消

## URL 同步
筛选状态通过 URLSearchParams 同步：
- `q` — 搜索关键词
- `loc` — 地点 ID（逗号分隔）
- `style` — 风格（逗号分隔）
- `composition` — 构图（逗号分隔）
- `year` — 年份
- `orient` — 方向
- `fav` — 收藏（1/0）
