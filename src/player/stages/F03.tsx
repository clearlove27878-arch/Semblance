import type { StageViewProps } from '../types';
import { Panel, StageFooter, StageIntro, SubmitButton, TextField } from '../components';

export const meta = { id: 'F03', chapter: '始', title: '真正实施者', view: 'endgame' as const };

export default function F03({ state, updateDraft, submit }: StageViewProps) {
  const draft = state.stage_states.F03.draft as { implementer?: string };
  return <div className="stage-board"><div className="stage-heading"><h1>真正实施者</h1><p>身份确认不等于案件解决；这里只处理第二条致死链的实施者。</p></div><StageIntro question="既然第一套机关失败，谁又布置了第二条致死链？" /><Panel><TextField label="实施者" value={draft.implementer ?? ''} onChange={(value) => updateDraft('F03', { implementer: value })} placeholder="输入人物姓名" /></Panel><StageFooter><SubmitButton onClick={() => submit({ implementer: draft.implementer ?? '' })}>提交实施者</SubmitButton></StageFooter></div>;
}
