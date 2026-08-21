import { useState } from 'react';
import type { StageViewProps } from '../types';
import { EvidenceModal, Panel, StageFooter, StageIntro, SubmitButton, TextAreaField, Choice } from '../components';

export const meta = { id: 'F01', chapter: '始', title: '许玲到底做了什么', view: 'endgame' as const };

export default function F01({ state, updateDraft, openEvidence, submit }: StageViewProps) {
  const draft = state.stage_states.F01.draft as { evidenceIds?: string[]; conclusion?: string };
  const ids = draft.evidenceIds ?? [];
  const [modal, setModal] = useState<string | null>(null);
  const toggle = (id: string) => updateDraft('F01', { evidenceIds: ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id] });
  return <div className="stage-board"><div className="stage-heading"><h1>许玲到底做了什么</h1><p>重新调查案发日上午，只处理行为与结果边界。</p></div><StageIntro question="许玲当日上午真正实施了什么？" /><Panel title="后期回读"><div className="two-col"><Choice selected={ids.includes('E007')} onClick={() => { toggle('E007'); openEvidence('E007', 'view_version_2'); setModal('E007'); }}>E007｜碎裂治疗镜</Choice><Choice selected={ids.includes('E008')} onClick={() => { toggle('E008'); openEvidence('E008', 'view_version_2'); setModal('E008'); }}>E008｜新蛇符</Choice></div><TextAreaField label="行为结论" value={draft.conclusion ?? ''} onChange={(value) => updateDraft('F01', { conclusion: value })} placeholder="例如：设计并实施具有杀伤目的的机关" /></Panel><StageFooter><SubmitButton onClick={() => submit({ evidenceIds: ids, conclusion: draft.conclusion ?? '' })}>提交行为结论</SubmitButton></StageFooter>{modal ? <EvidenceModal title={modal === 'E007' ? 'E007｜碎裂治疗镜：新的解释已开放' : 'E008｜新蛇符：新的解释已开放'} body={<p>{modal === 'E007' ? '镜子并非偶然误碰，后期材料支持它是故意制造的现场异常。' : '蛇符确实具有危险功能，但此时不判断它是否造成最终死亡。'}</p>} onClose={() => setModal(null)} /> : null}</div>;
}
