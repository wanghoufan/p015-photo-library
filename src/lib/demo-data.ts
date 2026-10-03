import type { WorkWithRelations, Location, FacetValue, MediaAsset } from './types';
import { STYLE_OPTIONS, COMPOSITION_OPTIONS } from './facet-config';

const LOCATIONS_DATA: Array<{ name: string; country: string; province: string; city: string; area: string }> = [
  { name: '京都·岚山', country: '日本', province: '京都府', city: '京都市', area: '岚山' },
  { name: '冰岛·黑沙滩', country: '冰岛', province: '', city: 'Vík', area: 'Reynisfjara' },
  { name: '云南·大理', country: '中国', province: '云南', city: '大理', area: '洱海' },
  { name: '西藏·纳木错', country: '中国', province: '西藏', city: '拉萨', area: '纳木错' },
  { name: '挪威·罗弗敦', country: '挪威', province: '', city: 'Reine', area: 'Lofoten' },
  { name: '四川·稻城', country: '中国', province: '四川', city: '甘孜', area: '稻城亚丁' },
  { name: '新西兰·皇后镇', country: '新西兰', province: '', city: 'Queenstown', area: 'Lake Wakatipu' },
  { name: '北京·故宫', country: '中国', province: '北京', city: '北京', area: '故宫' },
  { name: '法国·普罗旺斯', country: '法国', province: '', city: 'Avignon', area: 'Lavender fields' },
  { name: '贵州·西江', country: '中国', province: '贵州', city: '黔东南', area: '西江千户苗寨' },
  { name: '美国·羚羊谷', country: '美国', province: 'Arizona', city: 'Page', area: 'Antelope Canyon' },
  { name: '福建·霞浦', country: '中国', province: '福建', city: '宁德', area: '霞浦' },
];

const PHOTO_TITLES = [
  '晨光中的竹林', '潮汐的痕迹', '洱海边的黄昏', '雪山倒影',
  '极光下的峡湾', '牛奶海的日出', '湖畔的秋天', '红墙金瓦',
  '薰衣草田的午后', '苗寨灯火', '光影之隙', '滩涂上的渔船',
  '岚山小径', '黑沙巨浪', '苍山雪月', '圣湖之蓝',
  '渔村晨曦', '彩池秋色', '角楼晚照', '田园牧歌',
  '狭缝之光', '紫菜架的韵律', '竹林深处', '冰与火之岸',
];

const SAMPLE_IMAGE_URLS = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&q=80',
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80',
  'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=800&q=80',
  'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=80',
  'https://images.unsplash.com/photo-1425913397330-cf8af2ff40a1?w=800&q=80',
  'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=800&q=80',
  'https://images.unsplash.com/photo-1504893524553-b855bce32c67?w=800&q=80',
  'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=800&q=80',
  'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=800&q=80',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80',
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&q=80',
  'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=800&q=80',
  'https://images.unsplash.com/photo-1511497584788-876760111969?w=800&q=80',
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80',
  'https://images.unsplash.com/photo-1490730141103-6cac27aaab94?w=800&q=80',
  'https://images.unsplash.com/photo-1500534623283-312aade485b7?w=800&q=80',
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80',
  'https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=800&q=80',
  'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=800&q=80',
  'https://images.unsplash.com/photo-1414609245224-afa02bfb3fda?w=800&q=80',
  'https://images.unsplash.com/photo-1505765050516-f72dcac9c60e?w=800&q=80',
  'https://images.unsplash.com/photo-1439853949127-fa647821eba0?w=800&q=80',
];

const ORIENTATIONS: Array<'landscape' | 'portrait' | 'square'> = [
  'landscape', 'landscape', 'landscape', 'landscape', 'landscape',
  'portrait', 'portrait', 'portrait',
  'square',
];

function randomPick<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function randomDate(startYear: number, endYear: number): string {
  const start = new Date(startYear, 0, 1).getTime();
  const end = new Date(endYear, 11, 31).getTime();
  return new Date(start + Math.random() * (end - start)).toISOString().split('T')[0];
}

export function generateDemoLocations(): Location[] {
  return LOCATIONS_DATA.map((loc, i) => ({
    id: `loc-demo-${i + 1}`,
    name: loc.name,
    country: loc.country,
    province: loc.province,
    city: loc.city,
    area: loc.area,
    revision: 1,
    syncStatus: 'synced' as const,
    isDemo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
}

export function generateDemoFacetValues(): FacetValue[] {
  const values: FacetValue[] = [];
  let idx = 0;

  for (const style of STYLE_OPTIONS) {
    values.push({
      id: `fv-style-${idx++}`,
      dimensionId: 'style',
      parentId: null,
      name: style,
      sortOrder: values.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  for (const comp of COMPOSITION_OPTIONS) {
    values.push({
      id: `fv-comp-${idx++}`,
      dimensionId: 'composition',
      parentId: null,
      name: comp,
      sortOrder: values.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return values;
}

export function generateDemoWorks(): WorkWithRelations[] {
  const locations = generateDemoLocations();
  const facetValues = generateDemoFacetValues();
  const styleValues = facetValues.filter(fv => fv.dimensionId === 'style');
  const compValues = facetValues.filter(fv => fv.dimensionId === 'composition');

  return PHOTO_TITLES.map((title, i): WorkWithRelations => {
    const id = `work-demo-${i + 1}`;
    const location = locations[i % locations.length];
    const orientation = ORIENTATIONS[i % ORIENTATIONS.length];
    const width = orientation === 'portrait' ? 600 : orientation === 'square' ? 800 : 1200;
    const height = orientation === 'portrait' ? 900 : orientation === 'square' ? 800 : 800;
    const shotAt = randomDate(2019, 2025);
    const mediaId = `media-demo-${i + 1}`;

    const media: MediaAsset = {
      id: mediaId,
      workId: id,
      displayUrl: SAMPLE_IMAGE_URLS[i % SAMPLE_IMAGE_URLS.length],
      thumbUrl: SAMPLE_IMAGE_URLS[i % SAMPLE_IMAGE_URLS.length].replace('w=800', 'w=400'),
      mimeType: 'image/jpeg',
      byteSize: Math.floor(200000 + Math.random() * 800000),
      width,
      height,
      orientation,
      sortOrder: 0,
      uploadStatus: 'uploaded',
      displayPath: null,
      thumbPath: null,
      createdAt: shotAt,
      updatedAt: shotAt,
    };

    const selectedStyles = randomPick(styleValues, 1 + Math.floor(Math.random() * 2));
    const selectedComps = randomPick(compValues, 1 + Math.floor(Math.random() * 2));
    const tags = randomPick(['日出', '日落', '夜景', '雨天', '海边', '山峦', '城市', '乡村', '古镇', '森林', '湖泊', '花卉', '旅行', '日常', '建筑', '人文'], 2 + Math.floor(Math.random() * 3));

    return {
      id,
      title,
      privateNote: '',
      shotAt,
      locationId: location.id,
      coverMediaId: mediaId,
      isFavorite: Math.random() > 0.7,
      mediaCount: 1,
      revision: 1,
      baseRevision: 1,
      syncStatus: 'synced' as const,
      isDemo: true,
      createdAt: shotAt,
      updatedAt: shotAt,
      location,
      media: [media],
      facetValues: [...selectedStyles, ...selectedComps],
      tags,
    };
  });
}
