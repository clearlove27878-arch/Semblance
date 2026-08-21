import { useEffect, useRef, type ReactNode } from 'react';
import type { ContentTextBlock } from '../../content/types';
import type { ReasoningGateDefinition, ReasoningGateStatus } from '../gates/reasoningGate';
import { acquireScrollLock } from '../../core/scrollLock';

export interface ReasoningGateProps {
  id?: string;
  gate: ReasoningGateDefinition;
  status: ReasoningGateStatus;
  open: boolean;
  feedback?: string;
  feedbackBlocks?: readonly ContentTextBlock[];
  onOpen?: () => void;
  onBack: () => void;
  onSolved?: (gateId: string) => void;
  children?: ReactNode;
}

const STATUS_LABELS: Record<ReasoningGateStatus, string> = {
  locked: '尚未开放',
  available: '可以进入',
  active: '正在作答',
  incorrect: '再看看材料',
  success: '推理成立'
};

function renderGateText(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => part.startsWith('**') && part.endsWith('**')
    ? <strong key={`${index}-${part}`}>{part.slice(2, -2)}</strong>
    : <span key={`${index}-${part}`}>{part}</span>);
}

function GateProgress({ current, total }: { current: number; total: number }) {
  return <p className="reasoning-gate-progress" aria-label={`已完成 ${current} / ${total}`}>已完成 {current} / {total}</p>;
}

function renderTextBlocks(blocks: readonly ContentTextBlock[]) {
  return blocks.map((block, index) => (
    <p className={block.kind === 'highlight' ? 'content-key-emphasis' : undefined} key={`${index}-${block.text.slice(0, 12)}`}>
      {renderGateText(block.text)}
    </p>
  ));
}

function GateFeedback({ status, feedback, feedbackBlocks }: { status: ReasoningGateStatus; feedback?: string; feedbackBlocks?: readonly ContentTextBlock[] }) {
  if (status === 'success' || status === 'available' || !feedback) return null;
  return feedbackBlocks && feedbackBlocks.length > 0
    ? <div className="reasoning-gate-feedback" role="status">{renderTextBlocks(feedbackBlocks)}</div>
    : <p className="reasoning-gate-feedback" role="status">{renderGateText(feedback)}</p>;
}

function GateSuccess({ message, blocks, textBlocks, reveal, revealTextBlocks }: {
  message: string;
  blocks?: readonly string[];
  textBlocks?: readonly ContentTextBlock[];
  reveal?: readonly string[];
  revealTextBlocks?: readonly ContentTextBlock[];
}) {
  const hasReveal = Boolean((revealTextBlocks && revealTextBlocks.length > 0) || (reveal && reveal.length > 0));
  return (
    <div className="reasoning-gate-success" role="status" aria-live="polite">
      {textBlocks && textBlocks.length > 0
        ? renderTextBlocks(textBlocks)
        : blocks && blocks.length > 0
          ? blocks.map((block, index) => <p key={`${index}-${block.slice(0, 12)}`}>{renderGateText(block)}</p>)
          : <p>{renderGateText(message)}</p>}
      {hasReveal ? (
        <section className="reasoning-gate-reveal" aria-label="通过后揭露">
          <h3>通过后揭露</h3>
          {revealTextBlocks && revealTextBlocks.length > 0
            ? renderTextBlocks(revealTextBlocks)
            : reveal?.map((block, index) => <p key={`${index}-${block.slice(0, 12)}`}>{renderGateText(block)}</p>)}
        </section>
      ) : null}
      <small>案件桌已经收到这次判断。</small>
    </div>
  );
}

function GatePrompt({ gate, status, feedback, feedbackBlocks }: { gate: ReasoningGateDefinition; status: ReasoningGateStatus; feedback?: string; feedbackBlocks?: readonly ContentTextBlock[] }) {
  if (status === 'success') {
    return <GateSuccess
      message={gate.successMessage ?? '推理成立'}
      blocks={gate.feedback?.success}
      textBlocks={gate.feedbackTextBlocks?.success}
      reveal={gate.feedback?.reveal}
      revealTextBlocks={gate.feedbackTextBlocks?.reveal}
    />;
  }

  // The Force source keeps a static authoring placeholder in its prompt.
  // The live progress is already rendered by GateProgress; showing both would
  // leave the player with a stale "0 / 4" after the first Force is solved.
  const promptTextBlocks = (gate.promptTextBlocks ?? (gate.promptBlocks ?? [gate.prompt]).map((text) => ({ kind: 'paragraph' as const, text })))
    .filter((block) => !(gate.progress && /^\*\*已找到：\s*0\s*\/\s*\d+\*\*$/.test(block.text.trim())));

  return (
    <>
      <div className="reasoning-gate-prompt">
        <p className="reasoning-gate-label">需要提交的判断</p>
        {renderTextBlocks(promptTextBlocks)}
      </div>
      {gate.instructionsTextBlocks && gate.instructionsTextBlocks.length > 0 ? (
        <div className="reasoning-gate-instructions">
          {renderTextBlocks(gate.instructionsTextBlocks)}
        </div>
      ) : gate.instructionsBlocks && gate.instructionsBlocks.length > 0 ? (
        <div className="reasoning-gate-instructions">
          {gate.instructionsBlocks.map((block, index) => <p key={`${index}-${block.slice(0, 12)}`}>{renderGateText(block)}</p>)}
        </div>
      ) : gate.type === 'text_answer' ? <p className="reasoning-gate-input-note">在底部推理栏输入判断。</p> : null}
      <GateFeedback status={status} feedback={feedback} feedbackBlocks={feedbackBlocks} />
    </>
  );
}

export function ReasoningGate({ id, gate, status, open, feedback, feedbackBlocks, onOpen, onBack, onSolved, children }: ReasoningGateProps) {
  const reportedSuccess = useRef(false);

  useEffect(() => {
    if (!open || typeof window === 'undefined' || !window.matchMedia('(max-width: 900px)').matches) return undefined;
    return acquireScrollLock();
  }, [open]);

  useEffect(() => {
    if (status === 'success' && onSolved && !reportedSuccess.current) {
      reportedSuccess.current = true;
      onSolved(gate.id);
    }
    if (status !== 'success') reportedSuccess.current = false;
  }, [gate.id, onSolved, status]);

  if (status === 'locked') {
    return (
      <section id={id} className="reasoning-gate reasoning-gate-locked" aria-label="推理关卡">
        <p className="eyebrow">推理节点</p>
        <h2>推理节点尚未开放</h2>
        <p className="reasoning-gate-muted">案件桌还没有把这一层判断交给你。</p>
      </section>
    );
  }

  if (!open) {
    return (
      <section id={id} className="reasoning-gate reasoning-gate-launcher" aria-labelledby={`${gate.id}-launcher-title`}>
        <div>
          <p className="eyebrow">推理节点</p>
          <h2 id={`${gate.id}-launcher-title`}>{gate.title}</h2>
          <p className="reasoning-gate-muted">材料已经足够，可以提交一次判断。</p>
        </div>
        <button type="button" className="primary-button" onClick={onOpen}>打开推理关卡</button>
      </section>
    );
  }

  return (
    <section id={id} className="reasoning-gate reasoning-gate-open" aria-labelledby={`${gate.id}-title`}>
      <header className="reasoning-gate-header">
        <div>
          <p className="eyebrow">推理节点</p>
          <h2 id={`${gate.id}-title`}>{gate.title}</h2>
        </div>
        <span className={`reasoning-gate-status is-${status}`}>{STATUS_LABELS[status]}</span>
      </header>
      {gate.progress ? <GateProgress current={gate.progress.current} total={gate.progress.total} /> : null}
      <GatePrompt gate={gate} status={status} feedback={feedback} feedbackBlocks={feedbackBlocks} />
      {children}
      <div className="reasoning-gate-actions">
        <button type="button" className="secondary-button" onClick={onBack}>回到案件桌</button>
      </div>
    </section>
  );
}

export default ReasoningGate;
