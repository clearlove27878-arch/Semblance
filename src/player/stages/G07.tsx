import type { StageViewProps } from '../types';
import { Panel, StageFooter, StageIntro, SubmitButton, Choice } from '../components';

export const meta = { id: 'G07', chapter: '证', title: '警方工作模型', view: 'case' as const };
const nodes = [['home', '周枫家活动'], ['snake', '接触毒蛇'], ['poison', '蛇毒中毒'], ['leave', '离开'], ['fall', '坠落']];
export default function G07({ state, updateDraft, submit }: StageViewProps) {
  const draft = state.stage_states.G07.draft as { chain?: string[] };
  const chain = draft.chain ?? [];
  const add = (id: string) => updateDraft('G07', { chain: chain.includes(id) ? chain.filter((item) => item !== id) : [...chain, id] });
  return <div className="stage-board"><div className="stage-heading"><h1>警方工作模型</h1><p>只使用硬事实，不添加尚未证明的心理指令和具体机关。</p></div><StageIntro question="把警方当前能够证明的最少假设链拼出来。" /><Panel title="硬事实链"><div className="choice-grid">{nodes.map(([id, title]) => <Choice key={id} selected={chain.includes(id)} onClick={() => add(id)}>{title}</Choice>)}</div><div className="chain-builder">{chain.map((id, index) => <span key={id} className="chain-node">{index + 1}. {nodes.find(([node]) => node === id)?.[1]}</span>)}</div></Panel><StageFooter><SubmitButton onClick={() => submit({ chain })}>提交工作模型</SubmitButton></StageFooter></div>;
}
