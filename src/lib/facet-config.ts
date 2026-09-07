import type { FacetDefinition } from './types';

export const FACET_DEFINITIONS: FacetDefinition[] = [
  {
    key: 'location',
    label: '地点',
    location: 'sidebar',
    mode: 'multi',
    operator: 'or',
    valueSource: 'locations',
    showCounts: true,
    disableZeroResults: true,
  },
  {
    key: 'style',
    label: '风格',
    location: 'top',
    mode: 'multi',
    operator: 'or',
    valueSource: 'facet:style',
    showCounts: true,
    disableZeroResults: true,
  },
  {
    key: 'composition',
    label: '构图',
    location: 'top',
    mode: 'multi',
    operator: 'or',
    valueSource: 'facet:composition',
    showCounts: true,
    disableZeroResults: true,
  },
  {
    key: 'year',
    label: '年份',
    location: 'top',
    mode: 'single',
    operator: 'and',
    valueSource: 'computed:year',
    showCounts: true,
    disableZeroResults: true,
  },
  {
    key: 'orientation',
    label: '方向',
    location: 'top',
    mode: 'single',
    operator: 'and',
    valueSource: 'computed:orientation',
    showCounts: true,
    disableZeroResults: true,
  },
  {
    key: 'favorite',
    label: '收藏',
    location: 'top',
    mode: 'single',
    operator: 'and',
    valueSource: 'computed:favorite',
    showCounts: false,
    disableZeroResults: false,
  },
];

export const STYLE_OPTIONS = [
  '风光', '人文', '街拍', '建筑', '静物', '人像', '纪实', '抽象', '黑白', '极简',
];

export const COMPOSITION_OPTIONS = [
  '中心构图', '三分法', '对称', '引导线', '框架构图', '对角线', '留白', '俯拍', '仰拍', '平视',
];

export const COMMON_TAGS = [
  '日出', '日落', '夜景', '雨天', '雪景', '雾', '海边', '山峦', '城市', '乡村',
  '古镇', '森林', '沙漠', '湖泊', '河流', '花卉', '动物', '食物', '旅行', '日常',
];

export function getFacetDefinition(key: string): FacetDefinition | undefined {
  return FACET_DEFINITIONS.find(f => f.key === key);
}

export function getSidebarFacets(): FacetDefinition[] {
  return FACET_DEFINITIONS.filter(f => f.location === 'sidebar');
}

export function getTopFacets(): FacetDefinition[] {
  return FACET_DEFINITIONS.filter(f => f.location === 'top');
}
