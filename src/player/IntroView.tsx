import { useEffect, useState } from 'react';
import type { CaseState } from '../core/types';
import { INTRO_STEP_COUNT } from '../core/constants';
import { loadIntroSegment, type IntroSegment } from './introSegments';

export default function IntroView({ state, onPrevious, onContinue, onReturnToCase }: { state: CaseState; onPrevious: () => void; onContinue: () => void; onReturnToCase: () => void }) {
  const maxUnlockedStep = Math.min(Math.max(state.max_unlocked_intro_step, 1), INTRO_STEP_COUNT);
  const step = Math.min(Math.max(state.current_intro_step, 1), maxUnlockedStep);
  const [loaded, setLoaded] = useState<{ step: number; segment: IntroSegment } | null>(null);
  useEffect(() => {
    let active = true;
    setLoaded(null);
    void loadIntroSegment(step).then((segment) => {
      if (active) setLoaded({ step, segment });
    });
    return () => { active = false; };
  }, [step]);
  const segment = loaded?.step === step ? loaded.segment : null;
  const isLast = step === INTRO_STEP_COUNT;
  const isReview = state.intro_completed;
  const canGoPrevious = step > 1;
  const primaryLabel = isReview && isLast ? '返回案件' : isLast ? '进入案件' : step < maxUnlockedStep ? '下一段' : '继续';
  const primaryAction = isReview && isLast ? onReturnToCase : onContinue;

  return <main className="intro-page">
    <div className="intro-shell">
      <header className="intro-header">
        <p className="intro-overline">序章</p>
        <h1>《似》</h1>
        {isReview && !isLast ? <button type="button" className="secondary-button" onClick={onReturnToCase}>返回案件</button> : null}
      </header>
      <article className="intro-card" aria-live="polite">
        {segment ? <><p className="intro-kicker">{segment.kicker}</p><div className="intro-text">{segment.body}</div></> : <div className="intro-loading">正在打开这一段故事……</div>}
      </article>
      <footer className="intro-footer">
        {canGoPrevious ? <button type="button" className="secondary-button intro-button" onClick={onPrevious} disabled={!segment}>上一段</button> : <span aria-hidden="true" />}
        <span className="intro-progress" aria-label={`第 ${step} 段，共 ${INTRO_STEP_COUNT} 段`}>{step} / {INTRO_STEP_COUNT}</span>
        <button type="button" className="primary-button intro-button" onClick={primaryAction} disabled={!segment}>{primaryLabel}</button>
      </footer>
    </div>
  </main>;
}
