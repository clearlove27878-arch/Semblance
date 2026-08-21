import { useEffect, useRef } from 'react';
import { MATERIAL_SECTION_LABELS, type MaterialSectionFilter } from './ClueCollection';
import type { CaseClue } from './types';
import { ClueCard } from './ClueCard';
import { acquireScrollLock } from '../../core/scrollLock';

interface ClueDrawerProps {
  open: boolean;
  items: CaseClue[];
  totalCount: number;
  selectedId: string | null;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onSelect: (item: CaseClue) => void;
  onClose: () => void;
  activeSection?: MaterialSectionFilter;
  availableSections?: readonly MaterialSectionFilter[];
  onSectionChange?: (section: MaterialSectionFilter) => void;
}

function focusableElements(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')];
}

export function ClueDrawer({ open, items, totalCount, selectedId, searchTerm, onSearchChange, onSelect, onClose, activeSection = 'all', availableSections = ['all'], onSectionChange }: ClueDrawerProps) {
  const drawerRef = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

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
      if (event.key !== 'Tab' || !drawerRef.current) return;
      const focusable = focusableElements(drawerRef.current);
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

  if (!open) return null;

  return (
    <div className="clue-drawer-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <aside ref={drawerRef} className="clue-drawer" role="dialog" aria-modal="true" aria-labelledby="clue-drawer-title">
        <header className="clue-drawer-header">
          <div>
            <p className="eyebrow">已解锁线索</p>
            <h2 id="clue-drawer-title">线索 {totalCount}</h2>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="关闭线索列表">×</button>
        </header>
        <label className="clue-drawer-search">
          <span className="sr-only">搜索线索</span>
          <span aria-hidden="true">⌕</span>
          <input ref={searchRef} value={searchTerm} onChange={(event) => onSearchChange(event.target.value)} placeholder="搜索线索……" />
        </label>
        {onSectionChange && availableSections.length > 1 ? (
          <div className="clue-collection-filters clue-drawer-filters" role="tablist" aria-label="案件资料范围">
            {availableSections.map((section) => <button key={section} type="button" role="tab" aria-selected={activeSection === section} className={`clue-collection-filter${activeSection === section ? ' is-active' : ''}`} onClick={() => onSectionChange(section)}>{MATERIAL_SECTION_LABELS[section]}</button>)}
          </div>
        ) : null}
        <div className="clue-drawer-list">
          {items.length > 0 ? items.map((item) => <ClueCard key={item.id} item={item} selected={item.id === selectedId} onSelect={() => { onSelect(item); onClose(); }} />) : <p className="clue-empty">没有匹配的线索。</p>}
        </div>
      </aside>
    </div>
  );
}

export default ClueDrawer;
