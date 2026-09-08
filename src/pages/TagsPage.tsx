import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, MoreHorizontal, MapPin } from 'lucide-react';
import { useWorkStore } from '@/stores/WorkStore';

type MenuTarget =
  | { kind: 'location'; id: string; name: string }
  | { kind: 'facet'; id: string; name: string; dimensionKey: string; parentId: string | null }
  | { kind: 'custom'; name: string };

export function TagsPage() {
  const navigate = useNavigate();
  const {
    works, locations, facetValues, facetDimensions,
    renameCustomTag, deleteCustomTag,
    renameLocationEntry, deleteLocationEntry, addLocationEntry,
    addFacetValueItem, renameFacetValue, deleteFacetValueItem,
  } = useWorkStore();

  const [menuTarget, setMenuTarget] = useState<MenuTarget | null>(null);
  const [addingChild, setAddingChild] = useState<{ dimKey: string; dimLabel: string; parentId: string | null; parentName?: string } | null>(null);
  const [addingLocation, setAddingLocation] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [renameValue, setRenameValue] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<MenuTarget | null>(null);

  // 使用计数
  const locationUse = useMemo(() => {
    const map = new Map<string, number>();
    for (const w of works) {
      if (w.locationId) map.set(w.locationId, (map.get(w.locationId) ?? 0) + 1);
    }
    return map;
  }, [works]);

  const facetUse = useMemo(() => {
    const map = new Map<string, number>();
    for (const w of works) {
      for (const fv of w.facetValues) map.set(fv.id, (map.get(fv.id) ?? 0) + 1);
    }
    return map;
  }, [works]);

  const customTags = useMemo(() => {
    const map = new Map<string, number>();
    for (const w of works) {
      for (const t of w.tags) map.set(t, (map.get(t) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-CN'));
  }, [works]);

  const valuesForDim = (key: string) => {
    const ids = new Set(
      facetDimensions.filter(d => d.key === key).map(d => d.id),
    );
    ids.add(key); // demo 值直接以 key 作 dimensionId
    return facetValues.filter(v => ids.has(v.dimensionId));
  };

  const openMenu = (t: MenuTarget) => {
    setMenuTarget(t);
    setRenameValue(t.name);
  };

  const handleAddChild = async () => {
    if (!addingChild || !inputValue.trim()) return;
    await addFacetValueItem(addingChild.dimKey, inputValue.trim(), addingChild.parentId);
    setAddingChild(null);
    setInputValue('');
  };

  const handleAddLocation = async () => {
    if (!inputValue.trim()) return;
    await addLocationEntry(inputValue.trim());
    setAddingLocation(false);
    setInputValue('');
  };

  const handleRename = async () => {
    if (!menuTarget || !renameValue.trim()) return;
    const to = renameValue.trim();
    if (menuTarget.kind === 'custom') {
      await renameCustomTag(menuTarget.name, to);
    } else if (menuTarget.kind === 'location') {
      await renameLocationEntry(menuTarget.id, to);
    } else {
      await renameFacetValue(menuTarget.id, to);
    }
    setMenuTarget(null);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const t = confirmDelete;
    if (t.kind === 'custom') {
      await deleteCustomTag(t.name);
    } else if (t.kind === 'location') {
      await deleteLocationEntry(t.id);
    } else {
      await deleteFacetValueItem(t.id);
    }
    setConfirmDelete(null);
    setMenuTarget(null);
  };

  const useText = (n: number) => n > 0 ? `· ${n} 次使用` : '· 未使用';

  const renderDimSection = (dimKey: string, label: string) => {
    const values = valuesForDim(dimKey);
    const parents = values.filter(v => !v.parentId).sort((a, b) => a.sortOrder - b.sortOrder);
    return (
      <section className="rounded-lg border border-gallery-800 bg-gallery-900/50 p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-medium text-gallery-300">{label}</h2>
          <button
            onClick={() => { setAddingChild({ dimKey, dimLabel: label, parentId: null }); setInputValue(''); }}
            className="flex items-center gap-1 rounded-full border border-gallery-700 px-2.5 py-1 text-xs text-gallery-300 hover:bg-gallery-800"
          >
            <Plus className="h-3 w-3" /> 标签
          </button>
        </div>
        {parents.length === 0 && <p className="py-1 text-xs text-gallery-600">还没有标签</p>}
        <div className="divide-y divide-gallery-800/60">
          {parents.map(p => {
            const children = values.filter(v => v.parentId === p.id);
            const used = (facetUse.get(p.id) ?? 0) + children.reduce((n, c) => n + (facetUse.get(c.id) ?? 0), 0);
            return (
              <div key={p.id} className="py-2.5">
                <div className="flex items-center gap-1">
                  <button
                    className="min-w-0 flex-1 text-left"
                    onClick={() => openMenu({ kind: 'facet', id: p.id, name: p.name, dimensionKey: dimKey, parentId: null })}
                  >
                    <span className="text-[15px] font-medium text-gallery-200">{p.name}</span>
                    <span className="ml-2 text-xs text-gallery-600">{useText(used)}</span>
                  </button>
                  <button
                    aria-label={`${p.name} 更多操作`}
                    className="shrink-0 rounded-full p-2 text-lg leading-none text-gallery-500 hover:bg-gallery-800"
                    onClick={() => openMenu({ kind: 'facet', id: p.id, name: p.name, dimensionKey: dimKey, parentId: null })}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
                {children.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5 pl-1">
                    {children.map(c => (
                      <button
                        key={c.id}
                        className="chip !py-1"
                        onClick={() => openMenu({ kind: 'facet', id: c.id, name: c.name, dimensionKey: dimKey, parentId: c.parentId })}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    );
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-6 lg:py-8">
      <div className="mb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="focus-ring rounded-lg p-1 text-gallery-400 hover:text-gallery-200">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-medium text-gallery-100">标签管理</h1>
      </div>
      <p className="mb-4 text-xs text-gallery-600">点标签可改名、删除；父标签还能加子标签。删除只移除引用，作品本身保留。</p>

      <div className="space-y-4">
        {/* 地点 */}
        <section className="rounded-lg border border-gallery-800 bg-gallery-900/50 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-sm font-medium text-gallery-300">
              <MapPin className="h-3.5 w-3.5" /> 地点
            </h2>
            <button
              onClick={() => { setAddingLocation(true); setInputValue(''); }}
              className="flex items-center gap-1 rounded-full border border-gallery-700 px-2.5 py-1 text-xs text-gallery-300 hover:bg-gallery-800"
            >
              <Plus className="h-3 w-3" /> 地点
            </button>
          </div>
          <div className="divide-y divide-gallery-800/60">
            {locations.map(loc => (
              <div key={loc.id} className="flex items-center gap-1 py-2.5">
                <button
                  className="min-w-0 flex-1 text-left"
                  onClick={() => openMenu({ kind: 'location', id: loc.id, name: loc.name })}
                >
                  <span className="text-[15px] font-medium text-gallery-200">{loc.name}</span>
                  <span className="ml-2 text-xs text-gallery-600">{useText(locationUse.get(loc.id) ?? 0)}</span>
                </button>
                <button
                  aria-label={`${loc.name} 更多操作`}
                  className="shrink-0 rounded-full p-2 text-gallery-500 hover:bg-gallery-800"
                  onClick={() => openMenu({ kind: 'location', id: loc.id, name: loc.name })}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </section>

        {renderDimSection('style', '风格')}
        {renderDimSection('composition', '构图')}

        {/* 自定义标签 */}
        <section className="rounded-lg border border-gallery-800 bg-gallery-900/50 p-4">
          <h2 className="mb-2 text-sm font-medium text-gallery-300">自定义标签</h2>
          {customTags.length === 0 && <p className="py-1 text-xs text-gallery-600">还没有自定义标签，给作品打标签后会出现在这里</p>}
          <div className="flex flex-wrap gap-1.5">
            {customTags.map(([name, count]) => (
              <button
                key={name}
                className="chip"
                onClick={() => openMenu({ kind: 'custom', name })}
              >
                {name}
                <span className="text-gallery-600">·{count}</span>
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* 操作菜单 */}
      {menuTarget && !confirmDelete && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70" onClick={() => setMenuTarget(null)}>
          <div
            className="w-full max-w-lg rounded-t-2xl bg-gallery-900 p-5 pb-8"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="mb-1 text-center text-base font-medium text-gallery-100">{menuTarget.name}</h3>
            <div className="mt-4 space-y-2">
              <div className="flex gap-2">
                <input
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleRename(); }}
                  placeholder="新名称"
                  className="focus-ring flex-1 rounded-lg border border-gallery-700 bg-gallery-800 px-3 py-2.5 text-sm text-gallery-200 placeholder:text-gallery-600"
                />
                <button
                  onClick={handleRename}
                  disabled={!renameValue.trim() || renameValue.trim() === menuTarget.name}
                  className="rounded-lg bg-gallery-200 px-4 py-2.5 text-sm font-medium text-gallery-900 hover:bg-gallery-300 disabled:opacity-40"
                >
                  改名
                </button>
              </div>
              {menuTarget.kind === 'facet' && !menuTarget.parentId && (
                <button
                  onClick={() => {
                    setAddingChild({ dimKey: menuTarget.dimensionKey, dimLabel: '', parentId: menuTarget.id, parentName: menuTarget.name });
                    setInputValue('');
                    setMenuTarget(null);
                  }}
                  className="w-full rounded-xl bg-gallery-800 py-3 text-sm font-medium text-gallery-200 hover:bg-gallery-700"
                >
                  ＋ 加子标签
                </button>
              )}
              <button
                onClick={() => setConfirmDelete(menuTarget)}
                className="w-full rounded-xl bg-red-950/60 py-3 text-sm font-medium text-red-400 hover:bg-red-950"
              >
                删除
              </button>
              <button
                onClick={() => setMenuTarget(null)}
                className="w-full rounded-xl py-2.5 text-sm text-gallery-500"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 新增标签/子标签 */}
      {addingChild && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70" onClick={() => setAddingChild(null)}>
          <div className="w-full max-w-lg rounded-t-2xl bg-gallery-900 p-5 pb-8" onClick={e => e.stopPropagation()}>
            <h3 className="mb-4 text-center text-base font-medium text-gallery-100">
              {addingChild.parentName ? `给「${addingChild.parentName}」加子标签` : `新增${addingChild.dimLabel}标签`}
            </h3>
            <div className="flex gap-2">
              <input
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddChild(); }}
                placeholder="标签名称"
                autoFocus
                className="focus-ring flex-1 rounded-lg border border-gallery-700 bg-gallery-800 px-3 py-2.5 text-sm text-gallery-200 placeholder:text-gallery-600"
              />
              <button
                onClick={handleAddChild}
                disabled={!inputValue.trim()}
                className="rounded-lg bg-gallery-200 px-4 py-2.5 text-sm font-medium text-gallery-900 hover:bg-gallery-300 disabled:opacity-40"
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 新增地点 */}
      {addingLocation && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70" onClick={() => setAddingLocation(false)}>
          <div className="w-full max-w-lg rounded-t-2xl bg-gallery-900 p-5 pb-8" onClick={e => e.stopPropagation()}>
            <h3 className="mb-4 text-center text-base font-medium text-gallery-100">新增地点</h3>
            <div className="flex gap-2">
              <input
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddLocation(); }}
                placeholder="地点名称"
                autoFocus
                className="focus-ring flex-1 rounded-lg border border-gallery-700 bg-gallery-800 px-3 py-2.5 text-sm text-gallery-200 placeholder:text-gallery-600"
              />
              <button
                onClick={handleAddLocation}
                disabled={!inputValue.trim()}
                className="rounded-lg bg-gallery-200 px-4 py-2.5 text-sm font-medium text-gallery-900 hover:bg-gallery-300 disabled:opacity-40"
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认 */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70" onClick={() => setConfirmDelete(null)}>
          <div className="w-full max-w-lg rounded-t-2xl bg-gallery-900 p-5 pb-8" onClick={e => e.stopPropagation()}>
            <h3 className="mb-2 text-center text-base font-medium text-gallery-100">
              删除「{confirmDelete.name}」？
            </h3>
            <p className="mb-4 text-center text-xs text-gallery-500">
              作品上对它的引用会一并移除，作品本身不受影响。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 rounded-xl border border-gallery-700 py-3 text-sm text-gallery-300"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-medium text-white hover:bg-red-700"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
