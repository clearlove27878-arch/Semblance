import type { StageViewProps } from '../types';
import { Panel, StageFooter, StageIntro, SubmitButton, Choice, TextField } from '../components';

export const meta = { id: 'E030', chapter: '始', title: '无题诗', view: 'document' as const };
const lines = ['我把夜色收进纸里', '会有一条路回到旧屋', '代价不必写在门上', '替沉默的人保留一句', '你若听见就先停下', '成败都不要急着命名', '为谁承担尚未确定', '雄手这个词不太自然', '手指仍然指向纸面'];

export default function E030({ state, updateDraft, submit, enterStage }: StageViewProps) {
  const draft = state.stage_states.E030.draft as { initials?: string[]; anomaly?: string; interpretation?: string; solved?: boolean };
  const initials = draft.initials ?? [];
  const selectInitial = (index: number) => updateDraft('E030', { initials: initials.includes(String(index)) ? initials.filter((item) => item !== String(index)) : [...initials, String(index)] });
  return <div className="stage-board"><div className="stage-heading"><h1>无题诗</h1><p>可选支线。它只提供一个词形提示，不替代主线判断。</p></div><StageIntro question="九句诗的首字排列后，哪里不太自然？" /><Panel title="逐行查看首字"><div className="choice-grid">{lines.map((line, index) => <Choice key={line} selected={initials.includes(String(index))} onClick={() => selectInitial(index)}>{index + 1}. {line}</Choice>)}</div><p className="small-note">已选择首字：{initials.length ? initials.sort((a, b) => Number(a) - Number(b)).map((index) => lines[Number(index)][0]).join('／') : '尚未选择'}</p></Panel><Panel title="自己记录异常词"><Choice selected={draft.anomaly === '雄手'} onClick={() => updateDraft('E030', { anomaly: draft.anomaly === '雄手' ? '' : '雄手' })}>标记：雄手</Choice><TextField label="你的联想" value={draft.interpretation ?? ''} onChange={(value) => updateDraft('E030', { interpretation: value })} placeholder="若联想到另一个词，可以自己记录" /></Panel><StageFooter><SubmitButton onClick={() => submit({ initials, anomaly: draft.anomaly, interpretation: draft.interpretation ?? '' })}>记录这条可选提示</SubmitButton><button type="button" className="secondary-button" onClick={() => enterStage('F04', 'endgame')}>返回 F04</button></StageFooter>{draft.solved ? <div className="notice notice-attention">可选提示：代替。请把它带回 F04 自己解释。</div> : null}</div>;
}
