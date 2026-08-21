import type { StageViewProps } from '../types';
import { Panel, StageFooter, StageIntro, SubmitButton, TextAreaField, EvidenceShelf } from '../components';

export const meta = { id: 'F06', chapter: '始', title: '为什么警方查不到', view: 'endgame' as const };

export default function F06({ state, updateDraft, openEvidence, submit }: StageViewProps) {
  const draft = state.stage_states.F06.draft as { behaviorIds?: string[]; objectIds?: string[]; impact?: string };
  const behaviorIds = draft.behaviorIds ?? []; const objectIds = draft.objectIds ?? [];
  const toggle = (key: 'behaviorIds' | 'objectIds', id: string) => { const list = key === 'behaviorIds' ? behaviorIds : objectIds; updateDraft('F06', { [key]: list.includes(id) ? list.filter((item) => item !== id) : [...list, id] }); };
  return <div className="stage-board"><div className="stage-heading"><h1>为什么警方查不到</h1><p>关系输出只有在当前推理成立后才会生成。</p></div><StageIntro question="这些事实会影响警方证明什么？" /><Panel title="三栏事实关联"><div className="three-col"><div className="slot"><strong>行为事实</strong><EvidenceShelf items={[{ id: 'E012', title: '长期清洗习惯' }]} selected={behaviorIds} onToggle={(id) => { toggle('behaviorIds', id); openEvidence(id); }} /></div><div className="slot"><strong>物件状态</strong><EvidenceShelf items={[{ id: 'E031', title: '目标带当前回读' }]} selected={objectIds} onToggle={(id) => { toggle('objectIds', id); openEvidence(id, 'view_version_2'); }} /></div><div className="slot"><strong>这会影响警方证明什么？</strong><TextAreaField label="关系判断" value={draft.impact ?? ''} onChange={(value) => updateDraft('F06', { impact: value })} placeholder="例如：清洗和磨损削弱了物证证明力" /></div></div></Panel><StageFooter><SubmitButton onClick={() => submit({ behaviorIds, objectIds, impact: draft.impact ?? '' })}>提交关系判断</SubmitButton></StageFooter></div>;
}
