import { useState } from 'react';
import type { StageViewProps } from '../types';
import { EvidenceModal, EvidenceShelf, Panel, StageFooter, StageIntro, SubmitButton, TextAreaField } from '../components';

export const meta = { id: 'G03', chapter: '家', title: '死者在屋里做了什么', view: 'case' as const };

const hotspots = [
  { id: 'E006', title: '蛇柜', body: '柜中确有真实毒蛇，案发后柜门没有完全闭合。当前只记录现场状态。' },
  { id: 'E007', title: '碎裂治疗镜', body: '治疗镜在案发日上午碎裂，来源和意义暂未确认。' },
  { id: 'E008', title: '新蛇符', body: '一枚新制作的蛇符，结构异常。当前只记录可见物件。' },
  { id: 'E009', title: '磁带箱', body: '儿童故事带与成人旧录音混放，磁带箱案发后被翻乱。' }
];

export default function G03({ state, updateDraft, openEvidence, unlockEvidence, submit }: StageViewProps) {
  const draft = state.stage_states.G03.draft as { viewed?: string[]; relationIds?: string[]; behavior?: string };
  const viewed = draft.viewed ?? [];
  const relationIds = draft.relationIds ?? [];
  const [modal, setModal] = useState<typeof hotspots[number] | null>(null);
  const investigate = (item: typeof hotspots[number]) => { unlockEvidence(item.id); openEvidence(item.id); updateDraft('G03', { viewed: viewed.includes(item.id) ? viewed : [...viewed, item.id] }); setModal(item); };
  const toggleRelation = (id: string) => updateDraft('G03', { relationIds: relationIds.includes(id) ? relationIds.filter((item) => item !== id) : [...relationIds, id] });
  return <div className="stage-board">
    <div className="stage-heading"><h1>死者在屋里做了什么</h1><p>现场调查不会因为看完所有热点而自动完成。</p></div>
    <StageIntro question="程岚在中毒前，最可能主动进行过什么行为？" />
    <Panel title="周枫家现场图">
      <div className="scene-map"><div className="room"><div className="room-line one" /><div className="room-line two" /></div>{hotspots.map((item) => <button key={item.id} type="button" className={`hotspot ${item.id === 'E006' ? 'snake' : item.id === 'E007' ? 'mirror' : item.id === 'E008' ? 'talisman' : 'tapes'} ${viewed.includes(item.id) ? 'is-done' : ''}`} onClick={() => investigate(item)}>{item.title}</button>)}</div>
      <p className="small-note">可点击现场区域；每个热点会把对应事实加入证据栏。</p>
    </Panel>
    <Panel title="建立现场关联">
      <EvidenceShelf title="选择至少两件现场事实" items={hotspots.map(({ id, title }) => ({ id, title }))} selected={relationIds} onToggle={toggleRelation} />
      <TextAreaField label="行为判断" value={draft.behavior ?? ''} onChange={(value) => updateDraft('G03', { behavior: value })} placeholder="例如：主动翻找、寻找东西" />
    </Panel>
    <StageFooter><SubmitButton onClick={() => submit({ relationIds, behavior: draft.behavior ?? '' })}>提交现场推理</SubmitButton></StageFooter>
    {modal ? <EvidenceModal title={`${modal.id}｜${modal.title}`} body={<p>{modal.body}</p>} onClose={() => setModal(null)} /> : null}
  </div>;
}
