import { useState } from 'react';
import type { StageViewProps } from '../types';
import { EvidenceModal, EvidenceShelf, Panel, SecondaryButton, StageFooter, StageIntro, SubmitButton, TextField, Choice } from '../components';

export const meta = { id: 'G01', chapter: '尸', title: '死因矛盾', view: 'case' as const };

export default function G01({ state, updateDraft, openEvidence, openIntroReview, submit }: StageViewProps) {
  const draft = state.stage_states.G01.draft as { selectedFacts?: string[]; conclusion?: string };
  const selected = draft.selectedFacts ?? [];
  const [modal, setModal] = useState<{ title: string; body: string } | null>(null);
  const toggle = (fact: string) => updateDraft('G01', { selectedFacts: selected.includes(fact) ? selected.filter((item) => item !== fact) : [...selected, fact] });
  const open = (id: string, title: string, body: string) => { openEvidence(id); setModal({ title, body }); };
  return <div className="stage-board">
    <div className="stage-heading"><h1>死因矛盾</h1><p>先把尸体上不同性质的事实放在同一个时间问题里。</p></div>
    <StageIntro question="真正的死亡顺序是什么？"><p className="small-note">第一批现场和法医材料已经整理完成。当前只处理法医顺序，不处理具体毒源。</p></StageIntro>
    <Panel title="现场材料">
      <div className="evidence-grid"><button type="button" className="choice" onClick={() => open('E002', '野道尸体现场', '现场存在明显坠落伤，同时有一处新鲜的右拇指小伤。小伤来源未确认。')}>E002｜查看尸体现场</button>{state.evidence.E003?.availability === 'AVAILABLE' ? <button type="button" className="choice" onClick={() => open('E003', '法医补充结论', '法医事实：蛇毒已经产生明显作用；坠落伤发生在后；具体毒源不能确认。')}>E003｜查看法医补充</button> : <div className="notice notice-quiet">法医补充事实尚未进入当前材料栏。</div>}</div>
    </Panel>
    <Panel title="选择两个法医事实">
      <div className="choice-grid"><Choice selected={selected.includes('tox')} onClick={() => toggle('tox')}>蛇毒已经产生明显作用</Choice><Choice selected={selected.includes('fall_after')} onClick={() => toggle('fall_after')}>坠落伤发生在后</Choice></div>
      <TextField label="死亡顺序" value={draft.conclusion ?? ''} onChange={(value) => updateDraft('G01', { conclusion: value })} placeholder="例如：先……，后……" />
    </Panel>
    <StageFooter><SubmitButton onClick={() => submit({ selectedFacts: selected, conclusion: draft.conclusion ?? '' })}>提交死亡顺序</SubmitButton>{state.intro_completed ? <SecondaryButton onClick={openIntroReview}>回看序章</SecondaryButton> : null}</StageFooter>
    {modal ? <EvidenceModal title={modal.title} body={<p>{modal.body}</p>} onClose={() => setModal(null)} /> : null}
  </div>;
}
