import type { CasePhase, CaseState, HomeBatch, InvestigationPhase, PoliceBatch } from './types';
import {
  FLOW_VERSION,
  HOME_FIRST_MATERIAL_IDS,
  HOME_SECOND_MATERIAL_IDS,
  INTRO_STEP_COUNT,
  SCENE_MATERIAL_IDS
} from './flow/flowDefinition';

export {
  HOME_FIRST_MATERIAL_IDS,
  HOME_SECOND_MATERIAL_IDS,
  INTRO_STEP_COUNT,
  SCENE_MATERIAL_IDS
} from './flow/flowDefinition';

export const CASE_DESK_SAVE_VERSION = 6;
export const FORCE_SCHEMA_VERSION = 2;

export const PEOPLE_MATERIAL_IDS = [
  'statement-ling',
  'statement-feng',
  'statement-zhenhua',
  'statement-wang',
  'wang-investigation-initial'
] as const;

export const SNAKE_REVEAL_ID = 'snake-charm-follow-up';
export const TAPE_SUPPLEMENT_ID = 'tape-supplement';
export const METHOD_REVEAL_ID = 'method-reveal';
export const TAPE_RECOVERY_ID = 'tape-recovery';
export const ANTIVENOM_FOLLOW_UP_ID = 'antivenom-follow-up';

/**
 * The canonical terminal-entry fact is the solved formal Final Gate.  The
 * legacy `method_gate_passed` field is only a projection for old callers.
 */
export function isFinalGateCompleted(state: { solvedGateIds: readonly CaseState['solvedGateIds'][number][] }): boolean {
  return state.solvedGateIds.includes('final');
}

export function getSafePhaseWithoutFinalGate(state: { solvedGateIds: readonly CaseState['solvedGateIds'][number][] }): InvestigationPhase {
  if (state.solvedGateIds.includes('force')) return 'DEDUCTION_PHASE';
  if (state.solvedGateIds.includes('tapping')) return 'POLICE_INVESTIGATION';
  return 'CASE_INVESTIGATION';
}

const ALL_BATCHES = [SCENE_MATERIAL_IDS, HOME_FIRST_MATERIAL_IDS, HOME_SECOND_MATERIAL_IDS] as const;

function timestamp(): string {
  return new Date().toISOString();
}

function appendUnique(current: string[], additions: readonly string[]): string[] {
  return [...current, ...additions.filter((item) => !current.includes(item))];
}

function touch(state: CaseState, changes: Partial<CaseState>): CaseState {
  return { ...state, ...changes, last_updated_at: timestamp() };
}

function batchMaterials(batch: 1 | 2 | 3): readonly string[] {
  return ALL_BATCHES[batch - 1];
}

export function createInitialCaseState(): CaseState {
  return {
    save_version: CASE_DESK_SAVE_VERSION,
    screen: 'START',
    flowVersion: FLOW_VERSION,
    forceSchemaVersion: FORCE_SCHEMA_VERSION,
    currentPhase: 'INTRO',
    investigationBatch: 0,
    unlockedContentIds: [],
    viewedContentIds: [],
    openedContentIds: [],
    solvedGateIds: [],
    solvedForceIds: [],
    unlockedDeductionIds: [],
    unlockedReadingChapterIds: [],
    terminalProgress: null,
    completedTerminalIds: [],
    case_phase: 'INTRO',
    police_batch: 0,
    home_batch: 0,
    current_intro_step: 0,
    max_unlocked_intro_step: 0,
    intro_completed: false,
    intro_review_mode: false,
    published_material_ids: [],
    viewed_material_ids: [],
    opened_story_ids: [],
    opened_special_reading_ids: [],
    opened_chapter_ids: [],
    read_chapter_ids: [],
    seen_question_ids: [],
    tapping_gate_passed: false,
    snake_gate_passed: false,
    force_opened: false,
    method_gate_passed: false,
    poem_published: false,
    tape_supplement_published: false,
    ling_reflection_acknowledged: false,
    ritual_step: 0,
    ending_chapter_opened: false,
    ending_chapter_read: false,
    finished: false,
    last_updated_at: timestamp()
  };
}

export function startCase(state: CaseState): CaseState {
  if (state.screen !== 'START') return state;
  return touch(state, {
    screen: 'INTRO',
    current_intro_step: 1,
    max_unlocked_intro_step: 1,
    intro_review_mode: false
  });
}

export function continueIntro(state: CaseState): CaseState {
  if (state.screen !== 'INTRO') return state;
  if (state.current_intro_step < state.max_unlocked_intro_step && state.current_intro_step < INTRO_STEP_COUNT) {
    return touch(state, { current_intro_step: state.current_intro_step + 1 });
  }
  if (state.current_intro_step < INTRO_STEP_COUNT) {
    return touch(state, {
      current_intro_step: state.current_intro_step + 1,
      max_unlocked_intro_step: state.current_intro_step + 1
    });
  }
  return touch(state, {
    screen: 'DESK',
    case_phase: 'CORPSE',
    police_batch: 1,
    home_batch: 0,
    intro_completed: true,
    intro_review_mode: false,
    published_material_ids: appendUnique(state.published_material_ids, SCENE_MATERIAL_IDS)
  });
}

export function previousIntro(state: CaseState): CaseState {
  if (state.screen !== 'INTRO' || state.current_intro_step <= 1) return state;
  return touch(state, { current_intro_step: state.current_intro_step - 1 });
}

export function openIntroReview(state: CaseState): CaseState {
  if (!state.intro_completed) return state;
  return touch(state, {
    screen: 'INTRO',
    current_intro_step: INTRO_STEP_COUNT,
    max_unlocked_intro_step: INTRO_STEP_COUNT,
    intro_review_mode: true
  });
}

export function closeIntroReview(state: CaseState): CaseState {
  if (!state.intro_completed || state.screen !== 'INTRO') return state;
  return touch(state, { screen: 'DESK', intro_review_mode: false });
}

export function policeBatchViewed(state: CaseState, batch: 1 | 2 | 3): boolean {
  return batchMaterials(batch).every((id) => state.viewed_material_ids.includes(id));
}

export function isPoliceBatchComplete(state: CaseState): boolean {
  if (state.case_phase === 'CORPSE') return policeBatchViewed(state, 1);
  if (state.case_phase === 'HOME_FIRST') return policeBatchViewed(state, 2);
  if (state.case_phase === 'HOME_SECOND') return policeBatchViewed(state, 3);
  return false;
}

export function advanceInvestigation(state: CaseState): CaseState {
  if (state.screen !== 'DESK') return state;
  if (state.case_phase === 'CORPSE' && policeBatchViewed(state, 1)) {
    return touch(state, {
      case_phase: 'HOME_FIRST',
      police_batch: 2,
      home_batch: 1,
      published_material_ids: appendUnique(state.published_material_ids, HOME_FIRST_MATERIAL_IDS)
    });
  }
  if (state.case_phase === 'HOME_FIRST' && policeBatchViewed(state, 2)) {
    return touch(state, {
      case_phase: 'HOME_SECOND',
      police_batch: 3,
      home_batch: 2,
      published_material_ids: appendUnique(state.published_material_ids, HOME_SECOND_MATERIAL_IDS)
    });
  }
  if (state.case_phase === 'HOME_SECOND' && policeBatchViewed(state, 3)) {
    return touch(state, { case_phase: 'TAPPING_GATE' });
  }
  return state;
}

export function passTappingGate(state: CaseState): CaseState {
  if (state.screen !== 'DESK' || state.case_phase !== 'TAPPING_GATE') return state;
  return touch(state, {
    case_phase: 'PEOPLE',
    tapping_gate_passed: true,
    published_material_ids: appendUnique(state.published_material_ids, PEOPLE_MATERIAL_IDS)
  });
}

export function markForceOpened(state: CaseState): CaseState {
  if (state.screen !== 'DESK' || state.case_phase !== 'PEOPLE') return state;
  return touch(state, {
    case_phase: 'INVESTIGATION',
    force_opened: true,
    opened_special_reading_ids: appendUnique(state.opened_special_reading_ids, ['force'])
  });
}

export function advanceInvestigationAfterForce(state: CaseState): CaseState {
  if (state.screen !== 'DESK' || state.case_phase !== 'INVESTIGATION' || !state.force_opened) return state;
  return touch(state, { case_phase: 'EVIDENCE' });
}

export function advanceEvidence(state: CaseState): CaseState {
  if (state.screen !== 'DESK' || state.case_phase !== 'EVIDENCE') return state;
  return touch(state, { case_phase: 'POLICE_HALT' });
}

export function advancePoliceHalt(state: CaseState): CaseState {
  if (state.screen !== 'DESK' || state.case_phase !== 'POLICE_HALT') return state;
  return touch(state, { case_phase: 'BEGINNING_LING_GATE' });
}

export function passSnakeGate(state: CaseState): CaseState {
  if (state.screen !== 'DESK' || state.case_phase !== 'BEGINNING_LING_GATE') return state;
  return touch(state, {
    case_phase: 'LING_REVEAL',
    snake_gate_passed: true,
    published_material_ids: appendUnique(state.published_material_ids, [SNAKE_REVEAL_ID])
  });
}

export function acknowledgeLingReflection(state: CaseState): CaseState {
  if (state.screen !== 'DESK' || state.case_phase !== 'LING_REVEAL' || !state.snake_gate_passed) return state;
  return touch(state, {
    case_phase: 'POISON_GATE',
    ling_reflection_acknowledged: true,
    poem_published: true,
    tape_supplement_published: true,
    published_material_ids: appendUnique(state.published_material_ids, [TAPE_SUPPLEMENT_ID])
  });
}

export function passMethodGate(state: CaseState): CaseState {
  if (state.screen !== 'DESK' || state.case_phase !== 'POISON_GATE') return state;
  return touch(state, {
    case_phase: 'AFTERMATH',
    method_gate_passed: true,
    published_material_ids: appendUnique(state.published_material_ids, [METHOD_REVEAL_ID, TAPE_RECOVERY_ID, ANTIVENOM_FOLLOW_UP_ID])
  });
}

export function advanceAftermath(state: CaseState): CaseState {
  if (state.screen !== 'DESK' || state.case_phase !== 'AFTERMATH' || !state.method_gate_passed) return state;
  return touch(state, { case_phase: 'RITUAL' });
}

export function advanceRitual(state: CaseState): CaseState {
  if (state.screen !== 'DESK' || state.case_phase !== 'RITUAL' || state.ritual_step >= 4) return state;
  return touch(state, { ritual_step: (state.ritual_step + 1) as CaseState['ritual_step'] });
}

export function enterEnding(state: CaseState): CaseState {
  if (state.screen !== 'DESK' || state.case_phase !== 'RITUAL' || state.ritual_step < 4) return state;
  return touch(state, { case_phase: 'ENDING', ending_chapter_opened: true });
}

export function finishEnding(state: CaseState): CaseState {
  if (state.screen !== 'DESK' || state.case_phase !== 'ENDING') return state;
  return touch(state, {
    case_phase: 'FINISHED',
    ending_chapter_read: true,
    finished: true
  });
}

export function markMaterialViewed(state: CaseState, id: string): CaseState {
  if (!state.published_material_ids.includes(id) || state.viewed_material_ids.includes(id)) return state;
  return touch(state, { viewed_material_ids: [...state.viewed_material_ids, id] });
}

export function markSpecialReadingOpened(state: CaseState, id: string): CaseState {
  if (state.opened_special_reading_ids.includes(id)) return state;
  return touch(state, { opened_special_reading_ids: [...state.opened_special_reading_ids, id] });
}

export function markStoryOpened(state: CaseState, id: string): CaseState {
  if (state.opened_story_ids.includes(id)) return state;
  return touch(state, { opened_story_ids: [...state.opened_story_ids, id] });
}

export function markChapterOpened(state: CaseState, id: string): CaseState {
  if (state.opened_chapter_ids.includes(id)) return state;
  return touch(state, { opened_chapter_ids: [...state.opened_chapter_ids, id] });
}

export function markChapterRead(state: CaseState, id: string): CaseState {
  return touch(state, {
    opened_chapter_ids: appendUnique(state.opened_chapter_ids, [id]),
    read_chapter_ids: appendUnique(state.read_chapter_ids, [id])
  });
}

export function markQuestionsSeen(state: CaseState, ids: string[]): CaseState {
  const next = appendUnique(state.seen_question_ids, ids);
  if (next.length === state.seen_question_ids.length) return state;
  return touch(state, { seen_question_ids: next });
}

export function returnToCaseReview(state: CaseState): CaseState {
  if (state.screen !== 'DESK' || (!state.finished && state.case_phase !== 'ENDING')) return state;
  return touch(state, { case_phase: 'AFTERMATH' });
}

export function phaseIndex(phase: CasePhase): number {
  return [
    'INTRO', 'CORPSE', 'HOME_FIRST', 'HOME_SECOND', 'TAPPING_GATE', 'PEOPLE',
    'INVESTIGATION', 'EVIDENCE', 'POLICE_HALT', 'BEGINNING_LING_GATE', 'LING_REVEAL',
    'POISON_GATE', 'AFTERMATH', 'RITUAL', 'ENDING', 'FINISHED'
  ].indexOf(phase);
}

export function policeBatchForPhase(phase: CasePhase): PoliceBatch {
  if (phase === 'CORPSE') return 1;
  if (phase === 'HOME_FIRST') return 2;
  if (phase === 'HOME_SECOND') return 3;
  return 0;
}

export function homeBatchForPhase(phase: CasePhase): HomeBatch {
  if (phase === 'HOME_FIRST') return 1;
  if (phase === 'HOME_SECOND') return 2;
  return 0;
}
