import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReasoningObject, ReasoningObjectKind } from '../../content/ReasoningObjectRegistry';
import type { FinalSlotId } from '../gates/reasoningGate';
import { filterReasoningObjects } from '../../content/ReasoningObjectRegistry';
import { acquireScrollLock } from '../../core/scrollLock';

type PickerCategory = 'all' | ReasoningObjectKind;

export interface ReasoningObjectPickerProps {
  open: boolean;
  selectionMode: 'relation' | 'slot';
  title?: string;
  targetSlot?: FinalSlotId;
  allowedKinds: readonly ReasoningObjectKind[];
  maxObjects?: number;
  objects: readonly ReasoningObject[];
  unlockedObjectIds: readonly string[];
  selectedObjectIds: readonly string[];
  usedObjectIds?: readonly string[];
  onSelect: (objectId: string, targetSlot?: FinalSlotId) => void;
  onViewSource?: (object: ReasoningObject) => void;
  onClose: () => void;
}

const KIND_LABELS: Record<ReasoningObjectKind, string> = {
  person: '人物',
  clue: '线索',
  fact: '事实'
};

const SLOT_LABELS: Record<FinalSlotId, string> = {
  killer_slot: '真凶',
  medium_slot: '真正承载危险的物品',
  action_slot: '使程岚接触危险的行为习惯',
  wound_slot: '与之对应的身体创口',
  disposal_slot: '凶手怎么处理凶器'
};

function focusableElements(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')];
}

export function ReasoningObjectPicker({ open, selectionMode, title, targetSlot, allowedKinds, maxObjects = 3, objects, unlockedObjectIds, selectedObjectIds, usedObjectIds = [], onSelect, onViewSource, onClose }: ReasoningObjectPickerProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [category, setCategory] = useState<PickerCategory>('all');
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!open) return undefined;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const releaseScrollLock = acquireScrollLock();
    const focusTimer = window.setTimeout(() => searchRef.current?.focus(), 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = focusableElements(dialogRef.current);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKeyDown);
      releaseScrollLock();
      if (previousFocusRef.current && document.contains(previousFocusRef.current)) previousFocusRef.current.focus();
    };
  }, [onClose, open]);

  useEffect(() => {
    if (!open) return;
    setCategory('all');
    setQuery('');
    setNotice('');
  }, [open, selectionMode, targetSlot]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(''), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const availableIdSet = useMemo(() => new Set(unlockedObjectIds), [unlockedObjectIds]);
  const selectedIdSet = useMemo(() => new Set(selectedObjectIds), [selectedObjectIds]);
  const usedIdSet = useMemo(() => new Set(usedObjectIds), [usedObjectIds]);
  const allowedKindSet = useMemo(() => new Set(allowedKinds), [allowedKinds]);
  const visibleObjects = useMemo(() => {
    const available = objects.filter((object) => object.unlocked && availableIdSet.has(object.id) && allowedKindSet.has(object.kind));
    const categorized = category === 'all' ? available : available.filter((object) => object.kind === category);
    return filterReasoningObjects(categorized, query);
  }, [allowedKindSet, availableIdSet, category, objects, query]);

  if (!open) return null;

  const selectedCount = selectedObjectIds.length;
  const heading = title ?? (selectionMode === 'slot' && targetSlot ? `选择：${SLOT_LABELS[targetSlot]}` : '选择推理对象');
  const categories: Array<{ id: PickerCategory; label: string }> = [
    { id: 'all', label: '全部' },
    ...(['person', 'clue', 'fact'] as ReasoningObjectKind[])
      .filter((kind) => allowedKindSet.has(kind))
      .map((kind) => ({ id: kind, label: KIND_LABELS[kind] }))
  ];

  const handleSelect = (object: ReasoningObject) => {
    if (usedIdSet.has(object.id)) {
      setNotice('已用于当前推理。');
      return;
    }
    if (selectedIdSet.has(object.id)) {
      setNotice('已经加入当前推理。');
      return;
    }
    if (selectionMode === 'relation' && selectedCount >= maxObjects) {
      setNotice('当前关联已满，请先删除一个对象。');
      return;
    }
    onSelect(object.id, targetSlot);
  };

  return (
    <div className="reasoning-object-picker-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={dialogRef} className="reasoning-object-picker" role="dialog" aria-modal="true" aria-labelledby="reasoning-object-picker-title">
        <header className="reasoning-object-picker-header">
          <div>
            <p className="eyebrow">案件资料</p>
            <h2 id="reasoning-object-picker-title">{heading}</h2>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="关闭推理对象选择器">×</button>
        </header>

        <div className="reasoning-object-picker-controls">
          <label className="reasoning-object-picker-search">
            <span aria-hidden="true">⌕</span>
            <span className="sr-only">搜索已解锁推理对象</span>
            <input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索已有对象……" aria-label="搜索已解锁推理对象" />
          </label>
          <div className="reasoning-object-picker-tabs" role="tablist" aria-label="推理对象类型">
            {categories.map((item) => (
              <button key={item.id} type="button" role="tab" aria-selected={category === item.id} aria-controls="reasoning-object-picker-list" className={`reasoning-object-picker-tab${category === item.id ? ' is-active' : ''}`} onClick={() => setCategory(item.id)}>{item.label}</button>
            ))}
          </div>
        </div>

        <div id="reasoning-object-picker-list" className="reasoning-object-picker-list" role="tabpanel" aria-label="可选择的推理对象">
          {visibleObjects.length > 0 ? visibleObjects.map((object) => {
            const selected = selectedIdSet.has(object.id);
            const used = usedIdSet.has(object.id);
            return (
              <article className={`reasoning-object-row${selected ? ' is-selected' : ''}${used ? ' is-used' : ''}`} key={object.id}>
                <button type="button" className="reasoning-object-select" aria-pressed={selected} onClick={() => handleSelect(object)}>
                  {object.thumbnail ? <img className="reasoning-object-thumb" src={object.thumbnail} alt="" /> : <span className="reasoning-object-thumb reasoning-object-thumb-empty" aria-hidden="true">档</span>}
                  <span className="reasoning-object-copy">
                    <span className="reasoning-object-title">{object.displayName}</span>
                    <span className="reasoning-object-meta">{KIND_LABELS[object.kind]}{selected ? ' · 已加入当前推理' : used ? ' · 已用于当前推理' : ''}</span>
                    {import.meta.env.DEV ? <span className="reasoning-object-debug">{object.id} · {object.sourceContentIds.join(', ')}</span> : null}
                  </span>
                  <span className="reasoning-object-state" aria-hidden="true">{selected ? '✓' : used ? '—' : '选择'}</span>
                </button>
                {onViewSource && object.sourceContentIds.length > 0 ? <button type="button" className="reasoning-object-view" onClick={() => onViewSource(object)}>查看{object.kind === 'clue' ? '' : '来源'}</button> : null}
              </article>
            );
          }) : <p className="reasoning-object-empty">没有找到已解锁的对象。</p>}
        </div>

        <footer className="reasoning-object-picker-footer">
          <span aria-live="polite">{selectionMode === 'relation' ? `当前已选 ${selectedCount} / ${maxObjects}` : '选择后会填入当前槽位'}</span>
          {notice ? <span className="reasoning-object-notice" role="status">{notice}</span> : null}
        </footer>
      </section>
    </div>
  );
}

export default ReasoningObjectPicker;
