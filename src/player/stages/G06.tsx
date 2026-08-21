import type { StageViewProps } from '../types';
import { Panel, StageFooter, StageIntro, SubmitButton, TextAreaField, Choice } from '../components';
import { stageIsCompleted } from '../../core/state';

export const meta = { id: 'G06', chapter: '似', title: '王峥的犯罪模型', view: 'case' as const };

const suspicion = [
  ['E015', '旧案摘要'], ['E016', '近期诊所接触'], ['E017', '匿名推荐'], ['E018', '磁带包裹'], ['E022', '第二次审讯']
];
const gaps = [['no_scene', '没有进入现场证据'], ['no_instruction', '没有具体杀人指令'], ['no_method', '没有真实凶器或方法供述'], ['no_chain', '没有行为直接连接毒液进入']];

function Hub({ state, enterStage }: StageViewProps) {
  const entries = [
    { id: 'C03' as const, title: 'C03｜一封哑巴从未写过的情书', note: state.stage_states.C03.status },
    { id: 'C04' as const, title: 'C04｜蛇选新娘', note: state.stage_states.C04.status },
    { id: 'T01' as const, title: 'T01｜赵振华：洗带 = 销证？', note: state.stage_states.T01.status },
    { id: 'T02' as const, title: 'T02｜王峥：布局 = 杀人？', note: state.stage_states.T02.status },
    { id: 'T03' as const, title: 'T03｜许玲：杀意＋蛇符 = 致死？', note: state.stage_states.T03.status },
    { id: 'T04' as const, title: 'T04｜周枫：高度可疑 = 已证明实施？', note: state.stage_states.T04.status }
  ];
  return <div className="stage-board"><div className="stage-heading"><h1>第四章｜证据争点</h1><p>四个故事可以回看；四个争点需要逐个提出异议。</p></div><Panel title="选择当前可进入的调查板"><div className="hub-grid">{entries.map((entry) => <button type="button" className="hub-card" key={entry.id} onClick={() => enterStage(entry.id, entry.id.startsWith('T') ? 'assessment' : 'reading')} disabled={entry.note === 'LOCKED'}><h3>{entry.title}</h3><p>{entry.note === 'COMPLETED' || entry.note === 'HOST_COMPLETED' ? '已完成，可回读' : entry.note === 'AVAILABLE' || entry.note === 'IN_PROGRESS' ? '可进入' : '当前尚未开放'}</p></button>)}</div></Panel></div>;
}

export default function G06(props: StageViewProps) {
  const { state, updateDraft, submit } = props;
  if (stageIsCompleted(state, 'G06')) return <Hub {...props} />;
  const draft = state.stage_states.G06.draft as { suspicionIds?: string[]; gapIds?: string[]; model?: string };
  const suspicionIds = draft.suspicionIds ?? [];
  const gapIds = draft.gapIds ?? [];
  const toggle = (key: 'suspicionIds' | 'gapIds', id: string) => {
    const list = key === 'suspicionIds' ? suspicionIds : gapIds;
    updateDraft('G06', { [key]: list.includes(id) ? list.filter((item) => item !== id) : [...list, id] });
  };
  return <div className="stage-board"><div className="stage-heading"><h1>王峥的犯罪模型</h1><p>同时保留“高度可疑”和“仍不能证明”两侧。</p></div><StageIntro question="目前对王峥最准确的判断是什么？" /><div className="two-col"><Panel title="为什么怀疑王峥？"><div className="choice-grid">{suspicion.map(([id, title]) => <Choice key={id} selected={suspicionIds.includes(id)} onClick={() => toggle('suspicionIds', id)}>{id}｜{title}</Choice>)}</div></Panel><Panel title="为什么仍不能证明？"><div className="choice-grid">{gaps.map(([id, title]) => <Choice key={id} selected={gapIds.includes(id)} onClick={() => toggle('gapIds', id)}>{title}</Choice>)}</div></Panel></div><Panel><TextAreaField label="双栏判断" value={draft.model ?? ''} onChange={(value) => updateDraft('G06', { model: value })} placeholder="例如：高度可疑，但目前没有具体实施证据" /></Panel><StageFooter><SubmitButton onClick={() => submit({ suspicionIds, gapIds, model: draft.model ?? '' })}>提交犯罪模型</SubmitButton></StageFooter></div>;
}
