import { chapterForStage, VIEW_FOR_STAGE } from './constants';
import type { AppView, CaseState, EvidenceId, StageId } from './types';

const ALLOWED_EVIDENCE: Record<StageId, EvidenceId[]> = {
  G01: ['E001', 'E002', 'E003'],
  G02: ['E002', 'E003', 'E004'],
  G03: ['E005', 'E006', 'E007', 'E008', 'E009'],
  C01: ['E011', 'E012', 'E013'],
  G04: ['E011', 'E012', 'E013', 'E014', 'E015'],
  G05: ['E001', 'E014', 'E015', 'E016', 'E017', 'E018', 'E019', 'E020', 'E021'],
  C02: ['E014', 'E015', 'E016', 'E017', 'E018', 'E019', 'E020', 'E021'],
  G06: ['E014', 'E015', 'E016', 'E017', 'E018', 'E019', 'E020', 'E021', 'E022'],
  C03: ['E008', 'E023'],
  C04: ['E002', 'E024', 'E025', 'E026'],
  T01: ['E011', 'E012', 'E013'],
  T02: ['E016', 'E017', 'E018', 'E022'],
  T03: ['E008', 'E023'],
  T04: ['E002', 'E024', 'E025', 'E026'],
  G07: ['E002', 'E003', 'E004', 'E006', 'E027'],
  F01: ['E007', 'E008'],
  F02: ['E007', 'E008', 'E028'],
  F03: ['E028'],
  E030: ['E030'],
  F04: ['E007', 'E008', 'E029', 'E030'],
  F05: ['E002', 'E009', 'E026', 'E031'],
  F06: ['E012', 'E031'],
  F07: ['E002', 'E028', 'E029', 'E031', 'E032', 'E034'],
  F08: ['E006', 'E018', 'E031', 'E033'],
  F09: ['E002', 'E007', 'E008', 'E026', 'E028', 'E029', 'E031', 'E032', 'E033', 'E034']
};

export function allowedEvidenceForStage(stage: StageId): EvidenceId[] {
  return ALLOWED_EVIDENCE[stage] ?? [];
}

export function isPlayerEvidenceVisible(state: CaseState, evidenceId: EvidenceId): boolean {
  if (state.current_view === 'intro') return false;
  const record = state.evidence[evidenceId];
  if (!record || record.availability !== 'AVAILABLE') return false;
  if (evidenceId === 'E032' && !record.is_output) return false;
  if (state.current_view === 'paused') return ['E002', 'E003', 'E004', 'E006', 'E027'].includes(evidenceId);
  return allowedEvidenceForStage(state.current_stage).includes(evidenceId);
}

export function visibleEvidenceIds(state: CaseState): EvidenceId[] {
  return Object.keys(state.evidence).filter((id) => isPlayerEvidenceVisible(state, id));
}

export function canAccessCurrentView(state: CaseState, view: AppView = state.current_view): boolean {
  if (view === 'start') return state.case_status === 'START';
  if (view === 'intro') return state.case_status === 'IN_CASE' && state.intro_started && (!state.intro_completed || state.current_stage === 'G01');
  if (view === 'paused') return state.case_status === 'CASE_TEMP_CLOSED';
  if (view === 'complete') return state.case_status === 'CASE_RECONSTRUCTED' || state.case_status === 'ENDING';
  if (view === 'blocked') return true;
  if (view === 'document') return state.current_stage === 'E030' && state.case_status === 'FINAL_UNLOCKED';
  if (state.case_status === 'START' || state.case_status === 'CASE_TEMP_CLOSED') return false;
  const stage = state.stage_states[state.current_stage];
  if (!stage || stage.status === 'LOCKED') return false;
  if (VIEW_FOR_STAGE[state.current_stage] !== view) return false;
  return true;
}

export function safeBlockedMessage(): string {
  return '当前内容尚未开放。';
}

export function playerPayloadSummary(state: CaseState): {
  chapter: string;
  stage: StageId;
  view: AppView;
  evidence_ids: EvidenceId[];
} {
  return {
    chapter: chapterForStage(state.current_stage),
    stage: state.current_stage,
    view: state.current_view,
    evidence_ids: visibleEvidenceIds(state)
  };
}
