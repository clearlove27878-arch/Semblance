import { useEffect, useMemo, useRef, useState } from 'react';
import { getInvestigationNavModel } from '../navigation/investigationNav';
import type { InvestigationNavState, NavRouteTarget, NavSectionId } from '../navigation/types';
import { acquireScrollLock } from '../../core/scrollLock';

interface InvestigationNavProps {
  state: InvestigationNavState;
  activeSection?: NavSectionId | null;
  activeGateId?: InvestigationNavState['solvedGateIds'][number] | null;
  onNavigate: (target: NavRouteTarget) => void;
}

function focusableElements(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')];
}

function UnreadMark({ count }: { count: number }) {
  if (count <= 0) return null;
  return <span className="investigation-nav-unread" aria-label={`${count} 条未读`}>{count}</span>;
}

function SectionButton({
  section,
  onClick,
  compact = false
}: {
  section: ReturnType<typeof getInvestigationNavModel>['sections'][number];
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      className={`investigation-nav-section${section.active ? ' is-active' : ''}${section.status === 'active' ? ' is-current' : ''}${compact ? ' is-sheet-item' : ''}`}
      aria-current={section.active ? 'location' : undefined}
      data-section-id={section.id}
      onClick={onClick}
    >
      <span className="investigation-nav-section-main">
        <span className="investigation-nav-section-label">{section.label}</span>
        <UnreadMark count={section.unreadCount} />
      </span>
      {section.detail ? <small>{section.detail}</small> : null}
      {import.meta.env.DEV ? <small className="investigation-nav-debug">{section.id} · {section.status ?? 'open'}</small> : null}
    </button>
  );
}

export function InvestigationNav({ state, activeSection = null, activeGateId = null, onNavigate }: InvestigationNavProps) {
  const model = useMemo(() => getInvestigationNavModel(state, { activeSection, activeGateId }), [activeGateId, activeSection, state]);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!mobileSheetOpen) return undefined;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const releaseScrollLock = acquireScrollLock();
    const focusTimer = window.setTimeout(() => focusableElements(sheetRef.current ?? document.body)[0]?.focus(), 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setMobileSheetOpen(false);
        return;
      }
      if (event.key !== 'Tab' || !sheetRef.current) return;
      const focusable = focusableElements(sheetRef.current);
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
      else triggerRef.current?.focus();
    };
  }, [mobileSheetOpen]);

  const navigate = (target: NavRouteTarget) => {
    setMobileSheetOpen(false);
    onNavigate(target);
  };

  return (
    <nav className={`investigation-nav${model.terminalMode ? ' is-terminal-mode' : ''}`} aria-label="调查索引">
      <div className="investigation-nav-desktop">
        <span className="investigation-nav-kicker">调查索引</span>
        <div className="investigation-nav-rail" role="list">
          {model.sections.map((section, index) => (
            <div className="investigation-nav-rail-item" role="listitem" key={section.id}>
              <SectionButton section={section} onClick={() => navigate(section.routeTarget)} />
              {index < model.sections.length - 1 ? <span className="investigation-nav-divider" aria-hidden="true">—</span> : null}
            </div>
          ))}
        </div>
      </div>

      <div className="investigation-nav-mobile">
        <button
          ref={triggerRef}
          type="button"
          className="investigation-nav-mobile-trigger"
          aria-expanded={mobileSheetOpen}
          aria-controls="investigation-nav-sheet"
          onClick={() => setMobileSheetOpen(true)}
        >
          <span className="investigation-nav-mobile-trigger-label">调查</span>
          <span className="investigation-nav-mobile-trigger-current">当前：{model.currentLabel}</span>
          <span className="investigation-nav-mobile-trigger-icon" aria-hidden="true">⌄</span>
        </button>
      </div>

      {mobileSheetOpen ? (
        <div className="investigation-nav-sheet-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setMobileSheetOpen(false); }}>
          <section ref={sheetRef} id="investigation-nav-sheet" className="investigation-nav-sheet" role="dialog" aria-modal="true" aria-labelledby="investigation-nav-sheet-title">
            <header className="investigation-nav-sheet-header">
              <div>
                <p className="eyebrow">调查索引</p>
                <h2 id="investigation-nav-sheet-title">当前：{model.currentLabel}</h2>
              </div>
              <button type="button" className="modal-close" onClick={() => setMobileSheetOpen(false)} aria-label="关闭调查索引">×</button>
            </header>
            <div className="investigation-nav-sheet-current">
              <span>当前阶段</span>
              <strong>{model.currentLabel}</strong>
            </div>
            <nav className="investigation-nav-sheet-list" aria-label="已开放的调查区域">
              {model.sections.map((section) => <SectionButton key={section.id} section={section} compact onClick={() => navigate(section.routeTarget)} />)}
            </nav>
          </section>
        </div>
      ) : null}
    </nav>
  );
}

export default InvestigationNav;
