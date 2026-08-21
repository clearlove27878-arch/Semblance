import type { StageViewProps } from '../types';
import { Panel, StageFooter, StageIntro, SubmitButton, Choice, TextAreaField } from '../components';

export const meta = { id: 'F09', chapter: '始', title: '最终案件重构', view: 'endgame' as const };

type SlotKey = 'implementer' | 'trigger_motive' | 'xu_attempt' | 'poison_method' | 'evidence_break' | 'cheng_final_chain';
const slots: Array<{ key: SlotKey; title: string; candidates: Array<[string, string]> }> = [
  { key: 'implementer', title: '真正实施者', candidates: [['P01', '周枫'], ['P02', '许玲'], ['P04', '王峥']] },
  { key: 'trigger_motive', title: '周枫为什么在当天决定杀', candidates: [['E029', '周枫发现蛇符'], ['E030', '可选“代替”提示']] },
  { key: 'xu_attempt', title: '许玲做了什么／为什么没杀成', candidates: [['E007', '故意碎镜'], ['E008', '危险蛇符'], ['E028', '拆解处理记录']] },
  { key: 'poison_method', title: '真正致毒手法', candidates: [['E031', '目标儿童磁带'], ['E002', '右拇指创口'], ['E026', '周枫新伤（辅助）']] },
  { key: 'evidence_break', title: '证据为什么断裂', candidates: [['E012', '长期清洗习惯'], ['E032', '关系输出']] },
  { key: 'cheng_final_chain', title: '程岚最后一段行为与死亡', candidates: [['E033', '抗毒资源'], ['E034', '十三张时间线卡'], ['F08_OUTPUT', 'F08 阶段输出']] }
];

export default function F09({ state, updateDraft, submit }: StageViewProps) {
  const draft = state.stage_states.F09.draft as { slots?: Partial<Record<SlotKey, string[]>>; notes?: string };
  const selectedSlots = draft.slots ?? {};
  const toggle = (key: SlotKey, id: string) => { const list = selectedSlots[key] ?? []; const nextList = list.includes(id) ? list.filter((item) => item !== id) : [...list, id]; updateDraft('F09', { slots: { ...selectedSlots, [key]: nextList } }); };
  return <div className="stage-board"><div className="stage-heading"><h1>最终案件重构</h1><p>六个空槽全部闭合后，才允许生成案件时间线。</p></div><StageIntro question="不要只填一个人物或一件物品；把六个因果位置都补上。" /><div className="slot-board">{slots.map((slot) => <Panel key={slot.key} title={slot.title}><div className="choice-grid">{slot.candidates.map(([id, title]) => <Choice key={id} selected={(selectedSlots[slot.key] ?? []).includes(id)} onClick={() => toggle(slot.key, id)}>{id}｜{title}</Choice>)}</div><p className="small-note">已放入：{(selectedSlots[slot.key] ?? []).join('、') || '空'}</p></Panel>)}</div><Panel><TextAreaField label="案件关系说明" value={draft.notes ?? ''} onChange={(value) => updateDraft('F09', { notes: value })} placeholder="把六个位置连接成一条因果链" /></Panel><StageFooter><SubmitButton onClick={() => submit({ slots: selectedSlots, notes: draft.notes ?? '' })}>生成案件时间线并提交最终重构</SubmitButton></StageFooter></div>;
}
