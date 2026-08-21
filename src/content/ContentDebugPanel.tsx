import { useMemo, useState } from 'react';
import { contentRegistry } from './ContentRegistry';
import type { PlayerContentRecord, RegistryGate } from './types';
import { FINAL_GATE_DEFINITION, FORCE_GATE_DEFINITION, TAPPING_GATE_DEFINITION } from '../caseDesk/gates/caseGateDefinitions';
import { matchesAcceptedTextAnswer, matchesFinalSlots, matchesRelationSet } from '../caseDesk/gates/reasoningGate';
import type { FinalSlotId, ReasoningGateDefinition, ReasoningGateStatus } from '../caseDesk/gates/reasoningGate';
import { ReasoningGate } from '../caseDesk/components/ReasoningGate';

const DEFINITIONS: Record<string, ReasoningGateDefinition> = {
  tapping: TAPPING_GATE_DEFINITION,
  force: FORCE_GATE_DEFINITION,
  final: FINAL_GATE_DEFINITION
};

function blocksToText(blocks: readonly string[]): string {
  return blocks.join('\n\n');
}

function recordTitle(record: PlayerContentRecord): string {
  return `${record.displayTitle} · ${record.type}`;
}

function GateDebugControls({ gate, definition }: { gate: RegistryGate; definition: ReasoningGateDefinition }) {
  const [textAnswer, setTextAnswer] = useState('');
  const [relationIds, setRelationIds] = useState<string[]>([]);
  const [slotValues, setSlotValues] = useState<Partial<Record<FinalSlotId, string>>>({});
  const [status, setStatus] = useState<ReasoningGateStatus>('available');
  const [feedback, setFeedback] = useState('');

  const objectIds = useMemo(() => definition.type === 'relation'
    ? [...new Set(definition.standardSets?.flatMap((item) => item.objectIds) ?? [])]
    : [], [definition]);

  const submit = () => {
    if (definition.type === 'text_answer') {
      const accepted = matchesAcceptedTextAnswer(textAnswer, definition.acceptedAnswers);
      const partial = definition.partialAnswers?.some((answer) => matchesAcceptedTextAnswer(textAnswer, [answer])) ?? false;
      setStatus(accepted ? 'success' : 'incorrect');
      setFeedback(accepted ? '' : partial ? blocksToText(gate.player.feedback.partial) : blocksToText(gate.player.feedback.incorrect));
      return;
    }
    if (definition.type === 'relation') {
      const forceId = matchesRelationSet(relationIds, definition.standardSets ?? []);
      setStatus(forceId ? 'success' : 'incorrect');
      setFeedback(forceId ? `DEV 命中：${forceId}` : blocksToText(gate.player.feedback.incorrect));
      return;
    }
    const passed = matchesFinalSlots(slotValues, definition.slots ?? []);
    setStatus(passed ? 'success' : 'incorrect');
    setFeedback(passed ? '' : blocksToText(gate.player.feedback.incorrect));
  };

  if (definition.type === 'text_answer') {
    return (
      <div className="content-debug-controls">
        <label>text_answer <input value={textAnswer} onChange={(event) => { setTextAnswer(event.target.value); setStatus('active'); setFeedback(''); }} placeholder="输入测试答案" /></label>
        <button type="button" className="primary-button" onClick={submit}>提交 text Gate</button>
        {status === 'success' ? <pre>{blocksToText(gate.player.feedback.reveal)}</pre> : feedback ? <pre>{feedback}</pre> : null}
      </div>
    );
  }

  if (definition.type === 'relation') {
    return (
      <div className="content-debug-controls">
        <p>relation / unordered_set · 选择一组 3 对象（共 {definition.requiredCount ?? 4} 个标准 Force）</p>
        <div className="content-debug-object-grid">
          {objectIds.map((objectId) => {
            const object = contentRegistry.getGateObject(objectId);
            const selected = relationIds.includes(objectId);
            return <button type="button" className={`secondary-button${selected ? ' is-selected' : ''}`} key={objectId} onClick={() => setRelationIds((current) => selected ? current.filter((item) => item !== objectId) : current.length < 3 ? [...current, objectId] : current)}>{object?.label ?? objectId}</button>;
          })}
        </div>
        <button type="button" className="primary-button" disabled={relationIds.length !== 3} onClick={submit}>提交 relation Gate</button>
        {status === 'success' ? <pre>{blocksToText(gate.player.feedback.success)}</pre> : feedback ? <pre>{feedback}</pre> : null}
      </div>
    );
  }

  return (
    <div className="content-debug-controls">
      <p>final / semantic_slots</p>
      {(definition.slots ?? []).map((slot) => {
        const options = definition.slots?.map((item) => item.objectId) ?? [];
        return (
          <label key={slot.slotId}>{slot.slotId}
            <select value={slotValues[slot.slotId] ?? ''} onChange={(event) => { setSlotValues((current) => ({ ...current, [slot.slotId]: event.target.value })); setStatus('active'); setFeedback(''); }}>
              <option value="">选择对象</option>
              {options.map((objectId) => <option value={objectId} key={objectId}>{contentRegistry.getGateObject(objectId)?.label ?? objectId}</option>)}
            </select>
          </label>
        );
      })}
      <button type="button" className="primary-button" onClick={submit}>提交 final Gate</button>
      {status === 'success' ? <pre>{blocksToText(gate.player.feedback.success)}</pre> : feedback ? <pre>{feedback}</pre> : null}
    </div>
  );
}

export function ContentDebugPanel() {
  const contents = contentRegistry.getAllContents();
  const gates = contentRegistry.getAllGates();
  const [contentId, setContentId] = useState(contents[0]?.id ?? '');
  const [gateId, setGateId] = useState(gates[0]?.id ?? 'tapping');
  const [gateOpen, setGateOpen] = useState(false);
  const selectedContent = contents.find((item) => item.id === contentId) ?? null;
  const selectedGate = gates.find((item) => item.id === gateId) ?? null;
  const definition = DEFINITIONS[gateId];

  return (
    <main className="content-debug-page">
      <header className="content-debug-header">
        <p className="eyebrow">DEV / DEBUG ONLY</p>
        <h1>ContentRegistry</h1>
        <p>构建摘要：{JSON.stringify(contentRegistry.getSummary().counts)}；PLAYER payload 不包含 authoring source metadata。</p>
      </header>
      <section className="content-debug-section">
        <label>内容对象
          <select value={contentId} onChange={(event) => setContentId(event.target.value)}>
            {contents.map((item) => <option value={item.id} key={item.id}>{recordTitle(item)}</option>)}
          </select>
        </label>
        {selectedContent ? <article className="content-debug-record"><h2>{selectedContent.displayTitle}</h2><p>id: {selectedContent.id} · type: {selectedContent.type}</p>{selectedContent.image ? <img src={selectedContent.image} alt="内容资产" /> : null}<div>{selectedContent.bodyBlocks.map((block, index) => block.kind === 'pageBreak' ? <hr key={index} /> : block.kind === 'divider' ? <hr key={index} /> : <p className={block.kind === 'highlight' ? 'content-key-emphasis' : undefined} key={index}>{block.text}</p>)}</div></article> : null}
      </section>
      <section className="content-debug-section">
        <label>Gate
          <select value={gateId} onChange={(event) => { setGateId(event.target.value); setGateOpen(false); }}>
            {gates.map((item) => <option value={item.id} key={item.id}>{item.displayTitle} · {item.type}</option>)}
          </select>
        </label>
        {selectedGate && definition ? <>
          <ReasoningGate gate={definition} status={gateOpen ? 'active' : 'available'} open={gateOpen} onOpen={() => setGateOpen(true)} onBack={() => setGateOpen(false)} />
          {gateOpen ? <GateDebugControls gate={selectedGate} definition={definition} /> : null}
        </> : null}
      </section>
    </main>
  );
}

export default ContentDebugPanel;
