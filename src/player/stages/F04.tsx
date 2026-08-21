import type { StageViewProps } from '../types';
import { Panel, StageFooter, StageIntro, SubmitButton, TextAreaField, EvidenceShelf } from '../components';

export const meta = { id: 'F04', chapter: '始', title: '为什么是这一天', view: 'endgame' as const };

export default function F04({ state, updateDraft, openEvidence, enterStage, submit }: StageViewProps) {
  const draft = state.stage_states.F04.draft as { linkedIds?: string[]; triggerAnswer?: string; motiveAnswer?: string };
  const ids = draft.linkedIds ?? [];
  const toggle = (id: string) => updateDraft('F04', { linkedIds: ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id] });
  const optionalSolved = Boolean((state.stage_states.E030.draft as { solved?: boolean }).solved);
  return <div className="stage-board"><div className="stage-heading"><h1>为什么是这一天</h1><p>两个问题分开回答：先确认看见了什么，再确认做了什么决定。</p></div><StageIntro question="周枫确认许玲已经做了什么？这导致周枫做了什么决定？" /><Panel title="建立两件事实的关联"><EvidenceShelf items={[{ id: 'E007', title: '故意碎镜' }, { id: 'E008', title: '真实危险蛇符' }]} selected={ids} onToggle={(id) => { toggle(id); openEvidence(id, 'view_version_2'); }} /><TextAreaField label="第一问｜确认了什么" value={draft.triggerAnswer ?? ''} onChange={(value) => updateDraft('F04', { triggerAnswer: value })} placeholder="例如：许玲已经越过了杀人的线" /><TextAreaField label="第二问｜直接决定" value={draft.motiveAnswer ?? ''} onChange={(value) => updateDraft('F04', { motiveAnswer: value })} placeholder="例如：周枫决定自己实施" /></Panel><StageFooter><SubmitButton onClick={() => submit({ linkedIds: ids, triggerAnswer: draft.triggerAnswer ?? '', motiveAnswer: draft.motiveAnswer ?? '' })}>提交动机触发</SubmitButton>{optionalSolved ? <span className="small-note">已带回可选提示：代替</span> : <button type="button" className="secondary-button" onClick={() => enterStage('E030', 'document')}>查看可选文书</button>}</StageFooter></div>;
}
