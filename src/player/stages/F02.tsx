import { useState } from 'react';
import type { StageViewProps } from '../types';
import { EvidenceModal, Panel, StageFooter, StageIntro, SubmitButton, TextAreaField } from '../components';

export const meta = { id: 'F02', chapter: '始', title: '这套机关成功了吗？', view: 'endgame' as const };

export default function F02({ state, updateDraft, openEvidence, submit }: StageViewProps) {
  const draft = state.stage_states.F02.draft as { e028Viewed?: boolean; answer?: string; facts?: string };
  const [modal, setModal] = useState(false);
  const viewed = Boolean(draft.e028Viewed);
  const show = () => { openEvidence('E028'); updateDraft('F02', { e028Viewed: true }); setModal(true); };
  return <div className="stage-board"><div className="stage-heading"><h1>这套机关成功了吗？</h1><p>先看中性的处理记录，再回答结果问题。</p></div><StageIntro question="这套机关最终造成了程岚的中毒吗？" /><Panel title="E028｜蛇符处理记录"><button type="button" className={`evidence-button ${viewed ? 'is-selected' : ''}`} onClick={show}><span className="evidence-id">{viewed ? '已查看' : '查看'}</span><span>程岚发现蛇符异常，对蛇符进行了拆解，取出关键部件，随后转向屋内其他区域。</span></button></Panel><Panel title="双事实锁定"><p className="small-note">有杀意与是否造成最终死亡必须同时保留。</p><TextAreaField label="结果回答" value={draft.answer ?? ''} onChange={(value) => updateDraft('F02', { answer: value })} placeholder="例如：没有、未遂" /><TextAreaField label="保留的事实" value={draft.facts ?? ''} onChange={(value) => updateDraft('F02', { facts: value })} placeholder="例如：她有杀意，但没有造成最终死亡" /></Panel><StageFooter><SubmitButton onClick={() => submit({ e028Viewed: viewed, answer: draft.answer ?? '', facts: draft.facts ?? '' })}>提交“成功了吗？”</SubmitButton></StageFooter>{modal ? <EvidenceModal title="E028｜蛇符处理记录" body={<p>程岚发现蛇符异常，对蛇符进行了拆解，关键部件被取出，随后她转向屋内其他区域。</p>} onClose={() => setModal(false)} /> : null}</div>;
}
