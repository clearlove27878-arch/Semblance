import { useEffect, useState } from 'react';
import { CaseDesk } from './caseDesk/CaseDesk';
import { IntroView } from './caseDesk/IntroView';
import { clearCaseDeskSave, loadCaseDeskState, saveCaseDeskState } from './caseDesk/persistence';
import { createInitialCaseState } from './caseDesk/state';
import { loadDeskContent } from './caseDesk/contentLoader';
import { FinalEndingView } from './caseDesk/FinalEndingView';
import { investigationFlow, projectLegacyState, resetProgress, type FlowEvent } from './caseDesk/flow/InvestigationFlow';
import { clearAllReasoningGateDrafts } from './caseDesk/reasoningDraftPersistence';
import { ContentDebugPanel } from './content/ContentDebugPanel';
import type { DeskContent } from './caseDesk/content/types';
import { READING_CHAPTER_ORDER } from './caseDesk/readingIndex';
import { StartResume, hasValidProgress } from './StartResume';
import { AmbientScene } from './visual/AmbientScene';
import './styles.css';

function LoadingPage({ error = false }: { error?: boolean }) {
  return (
    <main className="center-page">
      <section className="center-card" role={error ? 'alert' : undefined}>
        {error ? (
          <>
            <h1>暂时无法打开案件桌</h1>
            <p className="loading-copy">请重新打开当前页面。</p>
            <button type="button" className="primary-button" onClick={() => window.location.reload()}>重新打开</button>
          </>
        ) : <p className="loading-copy">正在打开……</p>}
      </section>
    </main>
  );
}

const APP_ENTRY_HISTORY_KEY = 'siAppEntered';

function hasEnteredAppEntry(): boolean {
  const state = window.history.state;
  return Boolean(state && typeof state === 'object' && (state as Record<string, unknown>)[APP_ENTRY_HISTORY_KEY] === true);
}

function markAppEntryEntered(): void {
  try {
    const current = window.history.state;
    const safeCurrent = current && typeof current === 'object' ? current : {};
    window.history.replaceState({ ...safeCurrent, [APP_ENTRY_HISTORY_KEY]: true }, '', window.location.href);
  } catch {
    // The player can still enter the case when history state is unavailable.
  }
}

function createTerminalDevState() {
  const initial = createInitialCaseState();
  return projectLegacyState({
    ...initial,
    screen: 'DESK',
    currentPhase: 'TERMINAL_REVEAL',
    solvedGateIds: ['tapping', 'force', 'final'],
    unlockedContentIds: ['novel-ling', 'novel-feng'],
    unlockedReadingChapterIds: READING_CHAPTER_ORDER.filter((id) => id.startsWith('lan-')),
    openedContentIds: ['novel-ling'],
    terminalProgress: { chapterId: 'novel-ling', pageIndex: 0 },
    completedTerminalIds: []
  });
}

function PlayerApp({ devFlow = false, devTerminal = false }: { devFlow?: boolean; devTerminal?: boolean }) {
  const [loaded] = useState(() => devTerminal
    ? { state: createTerminalDevState(), incompatible: false, legacySaveDetected: false }
    : devFlow
      ? { state: createInitialCaseState(), incompatible: false, legacySaveDetected: false }
      : loadCaseDeskState());
  const [state, setState] = useState(loaded.state);
  const [incompatible, setIncompatible] = useState(loaded.incompatible);
  const [showStartResume, setShowStartResume] = useState(() => !devFlow && !devTerminal && loaded.state.screen !== 'ENDING' && !hasEnteredAppEntry());
  const [content, setContent] = useState<DeskContent | null>(null);
  const [contentError, setContentError] = useState(false);

  useEffect(() => {
    if (!incompatible && !devFlow && !devTerminal) saveCaseDeskState(state);
  }, [devFlow, devTerminal, incompatible, state]);

  useEffect(() => {
    if (state.screen !== 'DESK') {
      setContent(null);
      setContentError(false);
      return;
    }
    let cancelled = false;
    setContentError(false);
    void loadDeskContent(state).then((nextContent) => {
      if (!cancelled) setContent(nextContent);
    }).catch(() => {
      if (!cancelled) setContentError(true);
    });
    return () => { cancelled = true; };
  }, [state.currentPhase, state.screen, state.unlockedContentIds, state.unlockedDeductionIds]);

  const dispatch = (event: FlowEvent) => setState((previous) => investigationFlow.dispatch(previous, event));
  const start = () => {
    markAppEntryEntered();
    setShowStartResume(false);
    dispatch({ type: 'START_CASE' });
  };
  const resume = () => {
    // The persisted CaseState is already the canonical resume target.  The
    // existing screen/phase renderer decides INTRO, CaseDesk, Gate, Terminal, or Ending.
    markAppEntryEntered();
    setShowStartResume(false);
  };
  const reset = () => {
    clearCaseDeskSave();
    clearAllReasoningGateDrafts();
    setState((previous) => resetProgress(previous));
    setIncompatible(false);
    setShowStartResume(true);
  };
  const restart = () => {
    if (!window.confirm('要重新开始这次故事吗？')) return;
    reset();
  };
  const resetIncompatible = () => reset();
  const returnToStart = () => {
    markAppEntryEntered();
    setShowStartResume(true);
  };

  if (incompatible) return <StartResume hasValidProgress={false} saveStatus="incompatible" onStart={() => undefined} onResume={() => undefined} onReset={resetIncompatible} />;
  if (showStartResume || state.screen === 'START') {
    return <StartResume hasValidProgress={hasValidProgress(state)} onStart={start} onResume={resume} onReset={reset} />;
  }
  if (state.screen === 'ENDING') return <FinalEndingView onReturnToStart={returnToStart} />;
  if (state.screen === 'INTRO') {
    return (
      <AmbientScene sceneKey="intro" variant="normal">
        <IntroView state={state} onPrevious={() => dispatch({ type: 'PREVIOUS_INTRO' })} onContinue={() => dispatch({ type: 'CONTINUE_INTRO' })} onReturnToCase={() => dispatch({ type: 'CLOSE_INTRO_REVIEW' })} />
      </AmbientScene>
    );
  }
  if (contentError) return <AmbientScene sceneKey="loading-error" variant="normal"><LoadingPage error /></AmbientScene>;
  if (!content) return <AmbientScene sceneKey="loading" variant="normal"><LoadingPage /></AmbientScene>;

  return <CaseDesk state={state} onFlowEvent={dispatch} content={content} onIntroReview={() => dispatch({ type: 'OPEN_INTRO_REVIEW' })} onRestart={restart} devTerminal={devTerminal} />;
}

function App() {
  const params = new URLSearchParams(window.location.search);
  const showContentDebug = import.meta.env.DEV && params.get('__content_debug') === '1';
  const devFlow = import.meta.env.DEV && params.get('__flow_dev') === '1';
  const devTerminal = import.meta.env.DEV && params.get('__terminal_dev') === '1';
  return showContentDebug ? <ContentDebugPanel /> : <PlayerApp devFlow={devFlow} devTerminal={devTerminal} />;
}

export default App;
