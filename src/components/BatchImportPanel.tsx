import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Image as ImageIcon, X } from 'lucide-react';
import { useWorkStore, type BatchItemInput } from '@/stores/WorkStore';
import { processImage } from '@/lib/image';
import { generateId } from '@/lib/utils';
import { STYLE_OPTIONS, COMPOSITION_OPTIONS } from '@/lib/facet-config';
import { cn } from '@/lib/utils';

interface StagedFile {
  key: string;
  file: File;
  preview: string;
  processed?: {
    thumbBlob: Blob;
    displayBlob: Blob;
    orientation: BatchItemInput['orientation'];
    width: number;
    height: number;
  };
  error?: string;
}

interface MappingRow {
  file?: string;
  title?: string;
  tags?: string[];
  style?: string[] | string;
  composition?: string[] | string;
  location?: string;
  shotAt?: string;
}

const EXAMPLE_JSON = `[
  {"file": "IMG_001.HEIC", "tags": ["日出", "海边"], "style": ["风光"], "composition": ["三分法"], "location": "霞浦"},
  {"file": "IMG_002.HEIC", "tags": ["夜景"], "style": ["街拍"], "composition": ["对称"]}
]`;

function toArray(v: string[] | string | undefined): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

export function BatchImportPanel() {
  const navigate = useNavigate();
  const { batchImport } = useWorkStore();
  const [staged, setStaged] = useState<StagedFile[]>([]);
  const [jsonText, setJsonText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<{ created: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files) return;
    setIsProcessing(true);
    const next: StagedFile[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/') && file.type !== '') continue;
      const preview = URL.createObjectURL(file);
      try {
        const r = await processImage(file);
        next.push({
          key: `batch-${generateId()}`,
          file,
          preview,
          processed: {
            thumbBlob: r.thumbBlob,
            displayBlob: r.displayBlob,
            orientation: r.orientation,
            width: r.width,
            height: r.height,
          },
        });
      } catch (err) {
        next.push({
          key: `batch-${generateId()}`,
          file,
          preview,
          error: err instanceof Error ? err.message : `无法读取「${file.name}」`,
        });
      }
    }
    setStaged(prev => [...prev, ...next]);
    setIsProcessing(false);
  }, []);

  const removeStaged = (key: string) => {
    setStaged(prev => {
      const target = prev.find(s => s.key === key);
      if (target) {
        try { URL.revokeObjectURL(target.preview); } catch { /* ignore */ }
      }
      return prev.filter(s => s.key !== key);
    });
  };

  // 解析映射：返回 { rows, errors, unmatchedFiles }
  const parsed = (() => {
    if (!jsonText.trim()) return { rows: [] as MappingRow[], errors: [] as string[], byFile: new Map<string, MappingRow>() };
    try {
      const arr = JSON.parse(jsonText);
      if (!Array.isArray(arr)) return { rows: [], errors: ['JSON 顶层必须是数组'], byFile: new Map() };
      const byFile = new Map<string, MappingRow>();
      const errors: string[] = [];
      for (const [i, row] of (arr as MappingRow[]).entries()) {
        if (!row || typeof row.file !== 'string') {
          errors.push(`第 ${i + 1} 行缺少 file 文件名`);
          continue;
        }
        byFile.set(row.file, row);
        const lower = row.file.toLowerCase();
        if (!byFile.has(lower)) byFile.set(lower, row);
      }
      return { rows: arr, errors, byFile };
    } catch {
      return { rows: [], errors: ['JSON 解析失败，请检查格式'], byFile: new Map() };
    }
  })();

  const matchFor = (fileName: string): MappingRow | undefined => {
    return parsed.byFile.get(fileName) ?? parsed.byFile.get(fileName.toLowerCase());
  };

  const readyItems: BatchItemInput[] = staged
    .filter(s => s.processed && !s.error)
    .map(s => {
      const row = matchFor(s.file.name);
      const styles = toArray(row?.style).filter(n => STYLE_OPTIONS.includes(n));
      const comps = toArray(row?.composition).filter(n => COMPOSITION_OPTIONS.includes(n));
      // 未知风格/构图名不丢弃，降级为普通标签
      const unknownAsTags = [
        ...toArray(row?.style).filter(n => !STYLE_OPTIONS.includes(n)),
        ...toArray(row?.composition).filter(n => !COMPOSITION_OPTIONS.includes(n)),
      ];
      return {
        file: s.file,
        thumbBlob: s.processed!.thumbBlob,
        displayBlob: s.processed!.displayBlob,
        orientation: s.processed!.orientation,
        width: s.processed!.width,
        height: s.processed!.height,
        title: row?.title,
        tags: [...(row?.tags ?? []), ...unknownAsTags],
        styles,
        comps,
        location: row?.location,
        shotAt: row?.shotAt,
      };
    });

  const unmatchedCount = staged.filter(s => s.processed && !s.error && !matchFor(s.file.name)).length;
  const failedCount = staged.filter(s => s.error).length;

  const handleImport = async () => {
    if (readyItems.length === 0 || isImporting) return;
    setIsImporting(true);
    try {
      const res = await batchImport(readyItems);
      setResult({ created: res.created });
      setStaged([]);
      setJsonText('');
    } finally {
      setIsImporting(false);
    }
  };

  if (result) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="mb-2 text-lg text-gallery-100">导入完成</p>
        <p className="mb-6 text-sm text-gallery-400">成功创建 {result.created} 件作品（一图一件）</p>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="rounded-lg bg-gallery-200 px-6 py-2.5 text-sm font-medium text-gallery-900 hover:bg-gallery-300"
          >
            去画廊看看
          </button>
          <button
            onClick={() => setResult(null)}
            className="rounded-lg border border-gallery-700 px-6 py-2.5 text-sm text-gallery-300 hover:bg-gallery-800"
          >
            继续导入
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 步骤1: 选照片 */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gallery-300">
          第 1 步：选择照片 <span className="font-normal text-gallery-600">（可多选{staged.length > 0 ? ` · 已选 ${staged.length} 张` : ''}）</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {staged.map(s => (
            <div key={s.key} className="group relative h-20 w-20 overflow-hidden rounded">
              <img src={s.preview} alt={s.file.name} className="h-full w-full object-cover" />
              {matchFor(s.file.name) && !s.error && (
                <span className="absolute bottom-0.5 left-0.5 rounded bg-emerald-900/80 px-1 text-[10px] text-emerald-200">
                  已匹配
                </span>
              )}
              {s.error && (
                <span className="absolute bottom-0.5 left-0.5 rounded bg-red-900/80 px-1 text-[10px] text-red-200">
                  失败
                </span>
              )}
              <button
                onClick={() => removeStaged(s.key)}
                className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white opacity-0 group-hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex h-20 w-20 items-center justify-center rounded border-2 border-dashed border-gallery-700 text-gallery-500 hover:border-gallery-500 hover:text-gallery-300"
          >
            {isProcessing ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-gallery-600 border-t-gallery-300" />
            ) : (
              <ImageIcon className="h-6 w-6" />
            )}
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />
        {failedCount > 0 && (
          <p className="mt-2 text-xs text-red-400">{failedCount} 张读取失败（已跳过，可继续导入其余）</p>
        )}
      </div>

      {/* 步骤2: 标签映射 */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gallery-300">
          第 2 步：粘贴 AI 标签 JSON <span className="font-normal text-gallery-600">（按文件名匹配，不贴则只建图）</span>
        </label>
        <textarea
          value={jsonText}
          onChange={e => setJsonText(e.target.value)}
          placeholder={EXAMPLE_JSON}
          rows={8}
          spellCheck={false}
          className="focus-ring w-full resize-y rounded-lg border border-gallery-800 bg-gallery-900 px-3 py-2 font-mono text-xs text-gallery-200 placeholder:text-gallery-600"
        />
        {parsed.errors.map((err, i) => (
          <p key={i} className="mt-1 text-xs text-red-400">{err}</p>
        ))}
        {jsonText.trim() && parsed.errors.length === 0 && (
          <p className="mt-1 text-xs text-gallery-500">
            已解析 {parsed.rows.length} 行 · {staged.length - unmatchedCount - failedCount} 张已匹配
            {unmatchedCount > 0 && ` · ${unmatchedCount} 张无匹配（将只建图）`}
          </p>
        )}
      </div>

      {/* 导入 */}
      <button
        onClick={handleImport}
        disabled={readyItems.length === 0 || isImporting}
        className={cn(
          'w-full rounded-lg py-2.5 text-sm font-medium',
          readyItems.length === 0 || isImporting
            ? 'cursor-not-allowed bg-gallery-800 text-gallery-600'
            : 'bg-gallery-200 text-gallery-900 hover:bg-gallery-300',
        )}
      >
        {isImporting ? '导入中…' : readyItems.length > 0 ? `导入 ${readyItems.length} 张（一图一件）` : '先选择照片'}
      </button>
    </div>
  );
}
