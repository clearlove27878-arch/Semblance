import type { ReactNode } from 'react';
import { AuthorCredit } from '../../visual/AuthorCredit';

interface CaseDeskHeaderProps {
  caseName: string;
  stage: string;
  clueCount: number;
  onOpenClues?: () => void;
  onIntroReview?: () => void;
  onRestart?: () => void;
  children?: ReactNode;
}

export function CaseDeskHeader({ caseName, stage, clueCount, onOpenClues, onIntroReview, onRestart, children }: CaseDeskHeaderProps) {
  return (
    <header className="case-desk-header desk-topbar">
      <div className="desk-brand">
        <span className="brand-mark">似</span>
        <div className="desk-header-copy">
          <p className="eyebrow">案件桌</p>
          <h1>{caseName}</h1>
          <AuthorCredit className="desk-author-credit" />
        </div>
      </div>

      <div className="desk-status" aria-label="案件桌状态">
        <span><small>当前调查阶段</small><strong>{stage}</strong></span>
        <span><small>已解锁线索</small><strong>{clueCount}</strong></span>
      </div>

      <div className="desk-actions">
        {children}
        {onIntroReview ? <button type="button" className="text-button" onClick={onIntroReview}>回看序</button> : null}
        {onRestart ? <button type="button" className="text-button" onClick={onRestart}>重新开始</button> : null}
      </div>
    </header>
  );
}

export default CaseDeskHeader;
