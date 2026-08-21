import { useState } from 'react';
import type { StageViewProps } from '../types';
import { EvidenceModal, Panel, StageFooter, StageIntro, SubmitButton, TextField } from '../components';

export const meta = { id: 'G02', chapter: '尸', title: '死亡前活动地点', view: 'case' as const };

export default function G02({ state, updateDraft, openEvidence, submit }: StageViewProps) {
  const draft = state.stage_states.G02.draft as { conclusion?: string; supportIds?: string[] };
  const [modal, setModal] = useState(false);
  const supported = draft.supportIds?.includes('E004') ?? false;
  return <div className="stage-board">
    <div className="stage-heading"><h1>死亡前活动地点</h1><p>结论需要由材料支撑，不能只靠人物关系猜出地点。</p></div>
    <StageIntro question="请确定死者坠落前最后一个重要活动地点，并放入支撑材料。" />
    <Panel title="地点结论">
      <TextField label="地点" value={draft.conclusion ?? ''} onChange={(value) => updateDraft('G02', { conclusion: value })} placeholder="输入一个地点" />
    </Panel>
    <Panel title="证据支撑">
      {state.evidence.E004?.availability === 'AVAILABLE' ? <button type="button" className={`evidence-button ${supported ? 'is-selected' : ''}`} onClick={() => { openEvidence('E004'); updateDraft('G02', { supportIds: supported ? [] : ['E004'] }); }}><span className="evidence-id">E004</span><span>死前活动地点材料</span></button> : <div className="notice notice-quiet">地点材料尚未进入当前调查范围。</div>}
    </Panel>
    <StageFooter><SubmitButton onClick={() => submit({ conclusion: draft.conclusion ?? '', supportIds: draft.supportIds ?? [] })}>提交地点判断</SubmitButton></StageFooter>
    {modal ? <EvidenceModal title="E004｜死前活动地点" body={<p>材料确认：程岚坠落前进入过周枫家。</p>} onClose={() => setModal(false)} /> : null}
  </div>;
}
