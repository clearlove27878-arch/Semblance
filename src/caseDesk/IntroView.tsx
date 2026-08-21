import type { BodyBlock } from '../content/types';
import type { CaseState } from './types';
import { loadPrologue } from './contentLoader';

interface IntroViewProps {
  state: CaseState;
  onPrevious: () => void;
  onContinue: () => void;
  onReturnToCase: () => void;
}

const PROLOGUE = loadPrologue();
const PAGES = PROLOGUE.pages ?? [PROLOGUE.bodyBlocks ?? []];

function renderBlock(block: BodyBlock, index: number) {
  if (block.kind === 'divider') return <hr className="intro-divider" key={`divider-${index}`} />;
  if (block.kind === 'pageBreak') return null;
  return <p className={block.kind === 'highlight' ? 'content-key-emphasis' : undefined} key={`${index}-${block.text.slice(0, 12)}`}>{block.text}</p>;
}

export function IntroView({ state, onPrevious, onContinue, onReturnToCase }: IntroViewProps) {
  const step = Math.min(Math.max(state.current_intro_step, 1), PAGES.length);
  const page = PAGES[step - 1] ?? [];
  const isLast = step === PAGES.length;

  return (
    <main className="intro-page">
      <div className="intro-frame">
        <header className="intro-header">
          <div className="intro-heading-row">
            <div><h1>{PROLOGUE.title}</h1></div>
            <span className="intro-count">{step} / {PAGES.length}</span>
          </div>
          <div className="intro-progress" aria-label={`序章进度 ${step} / ${PAGES.length}`}>
            {PAGES.map((_, index) => <span key={index} className={index + 1 <= step ? 'is-filled' : ''} />)}
          </div>
        </header>

        <article className="intro-card" aria-live="polite">
          <div className="intro-body">{page.map(renderBlock)}</div>
        </article>

        <footer className="intro-actions">
          <button type="button" className="secondary-button" onClick={onPrevious} disabled={step <= 1}>上一段</button>
          {isLast && state.intro_review_mode ? (
            <button type="button" className="primary-button" onClick={onReturnToCase}>回到调查</button>
          ) : (
            <button type="button" className="primary-button" onClick={onContinue}>{isLast ? '进入调查' : '下一段'}</button>
          )}
        </footer>
      </div>
    </main>
  );
}

export default IntroView;
