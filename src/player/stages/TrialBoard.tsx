import type { StageViewProps } from '../types';
import { Panel, StageFooter, StageIntro, SubmitButton, TextAreaField, EvidenceShelf } from '../components';

export interface TrialConfig { id: 'T01' | 'T02' | 'T03' | 'T04'; title: string; statement: string; items: Array<{ id: string; title: string }>; prompt: string; }

export function TrialBoard({ config, state, updateDraft, openEvidence, submit }: StageViewProps & { config: TrialConfig }) {
  const draft = state.stage_states[config.id].draft as { selectedEvidenceIds?: string[]; objection?: boolean; gapText?: string };
  const selected = draft.selectedEvidenceIds ?? [];
  const toggle = (id: string) => updateDraft(config.id, { selectedEvidenceIds: selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id] });
  return <div className="stage-board"><div className="stage-heading"><h1>{config.title}</h1><p>只处理当前陈述的证明边界，不宣布任何嫌疑人无罪。</p></div><StageIntro question={config.prompt} /><Panel title="当前陈述"><div className="quote-card">{config.statement}</div></Panel><Panel title="选择证据并提出异议"><EvidenceShelf items={config.items} selected={selected} onToggle={(id) => { toggle(id); openEvidence(id); }} /><TextAreaField label="异议说明" value={draft.gapText ?? ''} onChange={(value) => updateDraft(config.id, { gapText: value })} placeholder="写出这句话还缺少哪一条证明" /><button type="button" className={`secondary-button ${draft.objection ? 'is-selected' : ''}`} onClick={() => updateDraft(config.id, { objection: !draft.objection })}>{draft.objection ? '已提出异议' : '提出异议'}</button></Panel><StageFooter><SubmitButton onClick={() => submit({ selectedEvidenceIds: selected, objection: Boolean(draft.objection), gapText: draft.gapText ?? '' })}>提交证据对抗</SubmitButton></StageFooter></div>;
}
