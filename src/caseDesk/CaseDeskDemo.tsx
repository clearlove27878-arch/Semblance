import { useMemo, useState } from 'react';
import { CaseDeskHeader } from './components/CaseDeskHeader';
import { ClueCollection } from './components/ClueCollection';
import { ClueDrawer } from './components/ClueDrawer';
import { copyText } from './components/clipboard';
import { CASE_DESK_DEMO_CLUES } from './components/demoContent';
import { MainEvidencePanel } from './components/MainEvidencePanel';
import { ReasoningGate } from './components/ReasoningGate';
import { ReasoningBar } from './components/ReasoningBar';
import type { CaseClue, ReasoningMode } from './components/types';
import { filterClues } from './components/types';
import { TAPPING_GATE_DEFINITION } from './gates/caseGateDefinitions';
import { matchesAcceptedTextAnswer } from './gates/reasoningGate';
import type { ReasoningGateStatus } from './gates/reasoningGate';

export function CaseDeskDemo() {
  const [clues, setClues] = useState(CASE_DESK_DEMO_CLUES);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [mode, setMode] = useState<ReasoningMode>('search');
  const [relationIds, setRelationIds] = useState<string[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [gateOpen, setGateOpen] = useState(false);
  const [gateStatus, setGateStatus] = useState<Exclude<ReasoningGateStatus, 'locked'>>('available');
  const [gateAnswer, setGateAnswer] = useState('');
  const [gateFeedback, setGateFeedback] = useState('');
  const selectedClue = clues.find((item) => item.id === selectedId) ?? null;
  const searchedClues = useMemo(() => filterClues(clues, searchTerm), [clues, searchTerm]);
  const visibleClues = mode === 'search' ? searchedClues : clues;
  const relationChips = relationIds.map((id) => clues.find((item) => item.id === id)).filter((item): item is CaseClue => Boolean(item)).map((item) => ({ id: item.id, label: item.standardName ?? item.title }));

  const openClue = (item: CaseClue) => {
    setSelectedId(item.id);
    setClues((previous) => previous.map((clue) => clue.id === item.id ? { ...clue, viewed: true } : clue));
  };

  const addRelation = (item: CaseClue) => setRelationIds((previous) => previous.includes(item.id) || previous.length >= 4 ? previous : [...previous, item.id]);
  const removeRelation = (id: string) => setRelationIds((previous) => previous.filter((item) => item !== id));
  const copyName = async (item: CaseClue) => {
    const copied = await copyText(item.standardName ?? item.title);
    if (!copied) return;
    setCopiedId(item.id);
    window.setTimeout(() => setCopiedId((previous) => previous === item.id ? null : previous), 1600);
  };

  const openGate = () => {
    setGateOpen(true);
    setGateStatus('available');
    setGateAnswer('');
    setGateFeedback('');
    setMode('answer');
  };

  const closeGate = () => {
    setGateOpen(false);
    setGateStatus('available');
    setMode('search');
  };

  const updateGateAnswer = (value: string) => {
    setGateAnswer(value);
    setGateStatus(value.trim() ? 'active' : 'available');
    setGateFeedback('');
  };

  const submitGate = () => {
    if (matchesAcceptedTextAnswer(gateAnswer, TAPPING_GATE_DEFINITION.acceptedAnswers)) {
      setGateStatus('success');
      setGateFeedback('');
    } else {
      setGateStatus('incorrect');
      setGateFeedback('这个解释还不能对应现有材料。');
    }
  };

  return (
    <div className="desk-page case-desk-demo-page">
      <CaseDeskHeader caseName="CaseDesk 组件预览" stage="灰盒组件" clueCount={clues.length} onOpenClues={() => setDrawerOpen(true)} />
      <ClueCollection items={visibleClues} totalCount={clues.length} selectedId={selectedId} onSelect={openClue} />
      <main className="desk-layout case-desk-demo-layout">
        <section className="desk-main">
          <section className="demo-intro-panel">
            <p className="eyebrow">DEMO DATA ONLY</p>
            <h2>{selectedClue ? selectedClue.title : '选择一条线索'}</h2>
            <p>{selectedClue ? '当前展示的是数据驱动的线索详情。' : '桌面端可直接点击线索卡；手机端通过“线索”打开抽屉。'}</p>
          </section>
          <section className="demo-gate-preview">
            <ReasoningGate gate={TAPPING_GATE_DEFINITION} status={gateStatus} open={gateOpen} feedback={gateFeedback} onOpen={openGate} onBack={closeGate} />
          </section>
          {selectedClue ? <MainEvidencePanel clue={selectedClue} onAddRelation={() => addRelation(selectedClue)} onCopyName={() => void copyName(selectedClue)} relationAdded={relationIds.includes(selectedClue.id)} copied={copiedId === selectedClue.id} /> : null}
        </section>
        <aside className="demo-side-panel">
          <p className="eyebrow">布局预留</p>
          <h2>主内容区域</h2>
          <p>后续 Gate、Force 与终盘阅读可以沿用这里的案件桌容器，不需要改变底部推理栏。</p>
        </aside>
      </main>
      <ClueDrawer open={drawerOpen} items={searchedClues} totalCount={clues.length} selectedId={selectedId} searchTerm={searchTerm} onSearchChange={setSearchTerm} onSelect={openClue} onClose={() => setDrawerOpen(false)} />
      <ReasoningBar
        mode={gateOpen ? 'answer' : mode}
        query={gateOpen ? gateAnswer : searchTerm}
        relationChips={relationChips}
        onModeChange={gateOpen ? () => undefined : setMode}
        onQueryChange={gateOpen ? updateGateAnswer : setSearchTerm}
        onRemoveRelation={removeRelation}
        onClearRelations={() => setRelationIds([])}
        onSubmit={gateOpen ? submitGate : undefined}
        inputDisabled={gateStatus === 'success'}
        modeLocked={gateOpen}
        submitDisabled={!gateAnswer.trim()}
        autoFocus={gateOpen && gateStatus !== 'success'}
      />
    </div>
  );
}

export default CaseDeskDemo;
