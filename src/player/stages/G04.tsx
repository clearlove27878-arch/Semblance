import { useState } from 'react';
import type { StageViewProps } from '../types';
import { EvidenceModal, Panel, StageFooter, StageIntro, SubmitButton, TextAreaField, Choice } from '../components';

export const meta = { id: 'G04', chapter: '家', title: '邻居线真正留下什么', view: 'case' as const };

export default function G04({ state, updateDraft, openEvidence, submit }: StageViewProps) {
  const draft = state.stage_states.G04.draft as { step?: number; selectedFact?: string; timeText?: string };
  const step = draft.step ?? 1;
  const [modal, setModal] = useState<string | null>(null);
  return <div className="stage-board"><div className="stage-heading"><h1>邻居线真正留下什么</h1><p>先保留一个真实事实，再处理录音形成的时间。</p></div>
    <StageIntro question={step === 1 ? '偷情故事被拆掉以后，哪一个事实仍然需要解释？' : '为什么这段声音会出现在这些旧儿童磁带里？'} />
    <Panel title={step === 1 ? '第一步｜选择仍需解释的事实' : '第二步｜录音时间'}>
      {step === 1 ? <div className="choice-grid"><Choice selected={draft.selectedFact === 'A'} onClick={() => updateDraft('G04', { selectedFact: 'A' })}>A｜赵振华真的长期洗带</Choice><Choice selected={draft.selectedFact === 'B'} onClick={() => updateDraft('G04', { selectedFact: 'B' })}>B｜女儿真的听见程岚</Choice><Choice selected={draft.selectedFact === 'C'} onClick={() => updateDraft('G04', { selectedFact: 'C' })}>C｜没有任何偷情录音被确认</Choice></div> : <><div className="evidence-grid"><button type="button" className="choice" onClick={() => { openEvidence('E013'); setModal('E013'); }}>查看 E013｜女儿听见的声音</button><button type="button" className="choice" onClick={() => { openEvidence('E012'); setModal('E012'); }}>查看 E012｜长期清洗习惯</button></div><TextAreaField label="时间判断" value={draft.timeText ?? ''} onChange={(value) => updateDraft('G04', { timeText: value })} placeholder="例如：形成时间早于案发当天" /></>}
    </Panel>
    <StageFooter><SubmitButton onClick={() => submit({ step, selectedFact: draft.selectedFact, timeText: draft.timeText ?? '' })}>{step === 1 ? '提交第一步' : '提交时间判断'}</SubmitButton></StageFooter>
    {modal ? <EvidenceModal title={modal} body={<p>{modal === 'E013' ? '声音可以确认是程岚，但录音形成时间仍需单独判断。' : '长期清洗是赵振华的生活习惯。'}</p>} onClose={() => setModal(null)} /> : null}
  </div>;
}
