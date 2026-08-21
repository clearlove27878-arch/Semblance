import { ALL_STAGE_IDS, READING_STAGE_IDS, SAVE_VERSION } from './constants';
import type { CaseState, EvidenceId, EvidenceState, ReadingState, StageId, StageState, StageStatus } from './types';

export function emptyEvidence(id: EvidenceId, availability: 'LOCKED' | 'AVAILABLE' = 'LOCKED'): EvidenceState {
  return {
    id,
    availability,
    viewed: false,
    viewed_versions: [],
    current_view_version: null,
    used_in_stages: [],
    is_output: false,
    output_source_stage: null,
    read_only: false
  };
}

export function emptyStage(id: StageId, status: StageStatus = 'LOCKED'): StageState {
  return {
    stage_id: id,
    status,
    display_mode: 'NORMAL',
    draft: {},
    submission_history: []
  };
}

function emptyReading(): ReadingState {
  return {
    current_paragraph: 1,
    max_unlocked_paragraph: 1,
    completed: false,
    host_assisted: false,
    author_assisted: false,
    last_exit_position: 1
  };
}

export function createInitialState(): CaseState {
  const stage_states = Object.fromEntries(
    ALL_STAGE_IDS.map((id) => [id, emptyStage(id, id === 'G01' ? 'AVAILABLE' : 'LOCKED')])
  ) as Record<StageId, StageState>;

  const evidence: Record<EvidenceId, EvidenceState> = {
    E001: emptyEvidence('E001', 'AVAILABLE'),
    E002: emptyEvidence('E002', 'AVAILABLE'),
    E032: emptyEvidence('E032', 'LOCKED')
  };

  return {
    save_version: SAVE_VERSION,
    case_status: 'START',
    current_stage: 'G01',
    current_view: 'start',
    stage_states,
    evidence,
    reading: Object.fromEntries(READING_STAGE_IDS.map((id) => [id, emptyReading()])) as CaseState['reading'],
    guesses: [],
    author_override_history: [],
    audit_log: [],
    last_feedback: null,
    final_unlocked_by: null,
    final_unlocked_at: null,
    f08_pattern_ready: false,
    final_timeline_ready: false,
    last_safe_checkpoint: 'initial',
    intro_started: false,
    current_intro_step: 0,
    max_unlocked_intro_step: 0,
    intro_completed: false,
  };
}

export function ensureEvidence(state: CaseState, id: EvidenceId, availability: 'LOCKED' | 'AVAILABLE' = 'AVAILABLE'): CaseState {
  if (state.evidence[id]) {
    if (availability === 'AVAILABLE' && state.evidence[id].availability === 'LOCKED') {
      return { ...state, evidence: { ...state.evidence, [id]: { ...state.evidence[id], availability } } };
    }
    return state;
  }
  return { ...state, evidence: { ...state.evidence, [id]: emptyEvidence(id, availability) } };
}

export function setStageStatus(state: CaseState, id: StageId, status: StageStatus): CaseState {
  return {
    ...state,
    stage_states: {
      ...state.stage_states,
      [id]: { ...state.stage_states[id], status }
    }
  };
}

export function stageIsCompleted(state: CaseState, id: StageId): boolean {
  const status = state.stage_states[id]?.status;
  return status === 'COMPLETED' || status === 'HOST_COMPLETED';
}

export function allTrialsCompleted(state: CaseState): boolean {
  return ['T01', 'T02', 'T03', 'T04'].every((id) => stageIsCompleted(state, id as StageId));
}
