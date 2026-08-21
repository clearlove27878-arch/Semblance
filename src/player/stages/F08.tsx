import { useEffect, useState, type ComponentType } from 'react';
import type { StageViewProps } from '../types';
import { EvidenceButton, Panel, StageFooter, StageIntro, SubmitButton, TextAreaField } from '../components';

export const meta = { id: 'F08', chapter: '始', title: '程岚最后的推理', view: 'endgame' as const };

const rebuttals = [
  { title: '抗毒资源', statement: '“抗毒的东西没有了。他提前拿走了。”', id: 'E033', body: '资源缺失是真实事实，但当前材料不能证明它是为了杀她而被人为拿走。' },
  { title: '残损标签', statement: '“这个残字是在告诉我，从这里开始。”', id: 'E031', body: '残损标签是真实材料，但当前材料不能证明它是一条明确指令。' },
  { title: '蛇柜状态', statement: '“蛇柜没关好，是他故意让我知道答案在这里。”', id: 'E006', body: '蛇柜最终没有完全闭合是真实状态，但当前材料不能证明它向死者传递了确定信息。' },
  { title: '王峥与磁带', statement: '“王峥把这些磁带送来，就是要我找到这一盘。”', id: 'E018', body: '王峥送过磁带是真实事实，但当前材料不能证明他明确指定了其中某一盘。' }
] as const;

export default function F08({ state, updateDraft, openEvidence, submit, enterStage }: StageViewProps) {
  const draft = state.stage_states.F08.draft as { current_rebuttal?: number; selected_evidence?: string; rebuttal_text?: string; final_pattern?: string };
  const current = Number(draft.current_rebuttal ?? 1);
  const [theme, setTheme] = useState<ComponentType | null>(null);
  useEffect(() => { if (state.f08_pattern_ready) import('../themeOutput').then((module) => setTheme(() => module.default)); }, [state.f08_pattern_ready]);
  if (state.f08_pattern_ready) { const Theme = theme; return <div className="stage-board"><div className="stage-heading"><h1>程岚最后的推理</h1><p>四条判断已经逐一接受证据反驳。</p></div><Panel>{Theme ? <Theme /> : <p>正在打开阶段结论……</p>}</Panel><StageFooter><button type="button" className="primary-button" onClick={() => enterStage('F09', 'endgame')}>进入最终案件重构</button></StageFooter></div>; }
  if (current <= 4) {
    const item = rebuttals[current - 1];
    return <div className="stage-board"><div className="stage-heading"><h1>程岚最后的推理</h1><p>每次只处理一条判断：选择证据，提出反证，保留事实边界。</p></div><StageIntro question={`第 ${current} 条｜${item.title}`} /><Panel title="当前判断"><div className="quote-card">{item.statement}</div></Panel><Panel title="选择证据并提出反证"><EvidenceButton id={item.id} title={item.id === 'E033' ? '抗毒资源' : item.id === 'E031' ? '残损标签的当前回读' : item.id === 'E006' ? '蛇柜状态' : '磁带包裹'} selected={draft.selected_evidence === item.id} onClick={() => { updateDraft('F08', { selected_evidence: item.id }); openEvidence(item.id, 'view_version_1'); }} /><p className="small-note">可观察事实：{item.body}</p><TextAreaField label="反证说明" value={draft.rebuttal_text ?? ''} onChange={(value) => updateDraft('F08', { rebuttal_text: value })} placeholder="例如：这是事实，但不能证明后面的关系" /></Panel><StageFooter><SubmitButton onClick={() => submit({ index: current, evidenceId: draft.selected_evidence, text: draft.rebuttal_text ?? '' })}>提出反证</SubmitButton></StageFooter></div>;
  }
  return <div className="stage-board"><div className="stage-heading"><h1>程岚最后的推理</h1><p>四条反证已完成。现在请你自己归纳它们共同缺少的东西。</p></div><StageIntro question="这些错误结论有什么共同点？" /><Panel><TextAreaField label="最终归纳" value={draft.final_pattern ?? ''} onChange={(value) => updateDraft('F08', { final_pattern: value })} placeholder="例如：没有人告诉她，而是她自己把事实补成了指令" /></Panel><StageFooter><SubmitButton onClick={() => submit({ finalPattern: draft.final_pattern ?? '' })}>提交最终归纳</SubmitButton></StageFooter></div>;
}
