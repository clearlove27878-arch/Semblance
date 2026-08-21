import { useEffect } from 'react';
import type { StageViewProps } from '../types';
import { Panel, StageFooter, StageIntro, SubmitButton } from '../components';

export const meta = { id: 'F07', chapter: '始', title: '程岚完整死亡动线', view: 'endgame' as const };

const cards = [
  ['E034-01', '程岚进入周枫家'], ['E034-02', '发现蛇符异常'], ['E034-03', '拆掉许玲机关'], ['E034-04', '转向磁带'], ['E034-05', '处理目标带'], ['E034-06', '右拇指受伤并中毒'], ['E034-07', '察觉身体异常'], ['E034-08', '寻找抗毒资源'], ['E034-09', '发现抗毒资源缺失'], ['E034-10', '离开屋子求救'], ['E034-11', '蛇毒作用加重'], ['E034-12', '野道坠落'], ['E034-13', '蛇毒中毒合并严重坠落伤死亡']
] as const;

export default function F07({ state, updateDraft, submit }: StageViewProps) {
  const draft = state.stage_states.F07.draft as { order?: string[] };
  const defaultOrder = ['E034-04', 'E034-01', 'E034-02', 'E034-03', 'E034-05', 'E034-06', 'E034-08', 'E034-07', 'E034-09', 'E034-10', 'E034-11', 'E034-12', 'E034-13'];
  const order = draft.order ?? defaultOrder;
  useEffect(() => { if (!draft.order) updateDraft('F07', { order: defaultOrder }); }, [draft.order, updateDraft]);
  const move = (index: number, delta: number) => { const target = index + delta; if (target < 0 || target >= order.length) return; const next = [...order]; [next[index], next[target]] = [next[target], next[index]]; updateDraft('F07', { order: next }); };
  const title = (id: string) => cards.find(([card]) => card === id)?.[1] ?? id;
  return <div className="stage-board"><div className="stage-heading"><h1>程岚完整死亡动线</h1><p>十三张卡需要按宏观因果排序；只允许第七、八张卡相邻互换。</p></div><StageIntro question="把每一段事件放回时间顺序。" /><Panel title="E034｜十三张时间线卡"><div className="timeline-list">{order.map((id, index) => <div className="timeline-item" key={id}><span className="timeline-number">{index + 1}</span><span>{title(id)}</span><span className="move-buttons"><button type="button" onClick={() => move(index, -1)} aria-label="上移">↑</button><button type="button" onClick={() => move(index, 1)} aria-label="下移">↓</button></span></div>)}</div></Panel><StageFooter><SubmitButton onClick={() => submit({ order })}>提交死亡动线</SubmitButton></StageFooter></div>;
}
