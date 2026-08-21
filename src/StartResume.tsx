import { useEffect, useRef, useState } from 'react';
import type { CaseState } from './caseDesk/types';
import { acquireScrollLock } from './core/scrollLock';
import { AuthorCredit } from './visual/AuthorCredit';
import { InkMark } from './visual/InkMark';

export type StartResumeSaveStatus = 'ready' | 'incompatible';

export interface StartResumeProps {
  hasValidProgress: boolean;
  saveStatus?: StartResumeSaveStatus;
  onStart: () => void;
  onResume: () => void;
  onReset: () => void;
}

function focusableElements(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])')];
}

function focusWithoutScroll(element: HTMLElement | null): void {
  if (!element || !document.contains(element)) return;
  try {
    element.focus({ preventScroll: true });
  } catch {
    element.focus();
  }
}

/** A valid save is any state that has moved beyond the untouched START state. */
export function hasValidProgress(state: Pick<CaseState, 'screen' | 'current_intro_step' | 'unlockedContentIds' | 'viewedContentIds' | 'solvedGateIds' | 'terminalProgress' | 'unlockedDeductionIds'>): boolean {
  return state.screen !== 'START'
    || state.current_intro_step > 0
    || state.unlockedContentIds.length > 0
    || state.viewedContentIds.length > 0
    || state.solvedGateIds.length > 0
    || state.terminalProgress !== null
    || state.unlockedDeductionIds.length > 0;
}

export function StartResume({ hasValidProgress: progressExists, saveStatus = 'ready', onStart, onResume, onReset }: StartResumeProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const onResetRef = useRef(onReset);
  onResetRef.current = onReset;

  useEffect(() => {
    if (!confirmOpen) return undefined;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const releaseScrollLock = acquireScrollLock();
    const focusTimer = window.setTimeout(() => focusWithoutScroll(cancelButtonRef.current), 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setConfirmOpen(false);
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = focusableElements(dialogRef.current);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        focusWithoutScroll(last);
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        focusWithoutScroll(first);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKeyDown);
      releaseScrollLock();
      focusWithoutScroll(previousFocus);
    };
  }, [confirmOpen]);

  const openResetConfirmation = () => setConfirmOpen(true);
  const confirmReset = () => {
    setConfirmOpen(false);
    onResetRef.current();
  };

  const primaryLabel = saveStatus === 'incompatible'
    ? '重新开始调查'
    : progressExists
      ? '继续调查'
      : '开始调查';
  const primaryAction = saveStatus === 'incompatible' ? openResetConfirmation : progressExists ? onResume : onStart;

  return (
    <main className="start-page" aria-labelledby="start-resume-title">
      <section className="start-card">
        <h1 id="start-resume-title"><InkMark variant="intro" /></h1>
        <AuthorCredit />
        {saveStatus === 'incompatible' ? <p className="start-save-notice" role="status">现有调查记录无法恢复。可以重新开始调查。</p> : null}
        <div className="start-actions">
          <button type="button" className="primary-button start-button" onClick={primaryAction}>{primaryLabel}</button>
          {progressExists && saveStatus === 'ready' ? <button type="button" className="text-button start-reset-button" onClick={openResetConfirmation}>重新开始</button> : null}
        </div>
      </section>

      {confirmOpen ? (
        <div className="start-confirm-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setConfirmOpen(false); }}>
          <section ref={dialogRef} className="start-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="start-confirm-title" aria-describedby="start-confirm-copy">
            <p className="eyebrow">确认操作</p>
            <h2 id="start-confirm-title">重新开始调查？</h2>
            <p id="start-confirm-copy">重新开始会清除当前调查进度。</p>
            <div className="start-confirm-actions">
              <button ref={cancelButtonRef} type="button" className="secondary-button" onClick={() => setConfirmOpen(false)}>取消</button>
              <button type="button" className="primary-button" onClick={confirmReset}>重新开始</button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

export default StartResume;
