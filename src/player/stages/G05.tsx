import { useState } from 'react';
import type { StageViewProps } from '../types';
import { EvidenceModal, EvidenceShelf, Panel, StageFooter, StageIntro, SubmitButton, TextAreaField } from '../components';

export const meta = { id: 'G05', chapter: '似', title: '两次“嗒、嗒”', view: 'case' as const };

export default function G05({ state, updateDraft, openEvidence, submit }: StageViewProps) {
  const draft = state.stage_states.G05.draft as { linkedIds?: string[]; meaning?: string };
  const linkedIds = draft.linkedIds ?? [];
  const [modal, setModal] = useState<string | null>(null);
  const toggle = (id: string) => updateDraft('G05', { linkedIds: linkedIds.includes(id) ? linkedIds.filter((item) => item !== id) : [...linkedIds, id] });
  return <div className="stage-board"><div className="stage-heading"><h1>两次“嗒、嗒”</h1><p>先把重复动作放在一起，再解释共同功能。</p></div><StageIntro question="这两次动作具有同一功能。是什么？" />
    <Panel title="并列证据"><div className="two-col"><button type="button" className={`choice ${linkedIds.includes('E001') ? 'is-selected' : ''}`} onClick={() => { toggle('E001'); openEvidence('E001'); setModal('E001'); }}>E001｜《喊魂》中的两敲</button><button type="button" className={`choice ${linkedIds.includes('E021') ? 'is-selected' : ''}`} onClick={() => { toggle('E021'); openEvidence('E021'); setModal('E021'); }}>E021｜旧治疗磁带中的两敲</button></div></Panel>
    <Panel title="建立关联后解释共同功能"><EvidenceShelf title="当前关联" items={[{ id: 'E001', title: '《喊魂》中的两敲' }, { id: 'E021', title: '旧治疗磁带中的两敲' }]} selected={linkedIds} onToggle={toggle} /><TextAreaField label="共同功能" value={draft.meaning ?? ''} onChange={(value) => updateDraft('G05', { meaning: value })} placeholder="例如：否定、纠错、你理解错了" /></Panel>
    <StageFooter><SubmitButton onClick={() => submit({ linkedIds, meaning: draft.meaning ?? '' })}>提交关联判断</SubmitButton></StageFooter>
    {modal ? <EvidenceModal title={modal === 'E001' ? 'E001｜《喊魂》旧案片段' : 'E021｜旧磁带 C'} body={<p>材料中出现了两次连续敲击：“嗒、嗒”。请与另一段材料并置理解。</p>} onClose={() => setModal(null)} /> : null}
  </div>;
}
