export const CASE_PHASES = [
  'INTRO',
  'CORPSE',
  'HOME_FIRST',
  'HOME_SECOND',
  'TAPPING_GATE',
  'PEOPLE',
  'INVESTIGATION',
  'EVIDENCE',
  'POLICE_HALT',
  'BEGINNING_LING_GATE',
  'LING_REVEAL',
  'POISON_GATE',
  'AFTERMATH',
  'RITUAL',
  'ENDING',
  'FINISHED'
] as const;

export type CasePhase = (typeof CASE_PHASES)[number];
export type AppScreen = 'START' | 'INTRO' | 'DESK' | 'ENDING';

/**
 * Player-facing progression is deliberately coarser than the historical
 * case_phase values above.  The old values remain in the compatibility
 * surface for saved-state migration and older callers; the player path uses
 * currentPhase and the InvestigationFlow reducer.
 */
export const INVESTIGATION_PHASES = [
  'INTRO',
  'CASE_INVESTIGATION',
  'TAP_GATE',
  'POLICE_INVESTIGATION',
  'FORCE_GATE',
  'DEDUCTION_PHASE',
  'FINAL_GATE',
  'TERMINAL_REVEAL',
  'COMPLETE'
] as const;

export type InvestigationPhase = (typeof INVESTIGATION_PHASES)[number];
export type FormalGateId = 'tapping' | 'force' | 'final';

export interface TerminalProgress {
  chapterId: string;
  pageIndex: number;
}

export type MaterialCategory = '现场与法医' | '枫家' | '人物与口供' | '调查补充';
export type PoliceBatch = 0 | 1 | 2 | 3;
export type HomeBatch = 0 | 1 | 2;

export interface CaseState {
  save_version: number;
  screen: AppScreen;

  /** Canonical persisted InvestigationFlow state. */
  flowVersion: number;
  /** Version of the accepted Force answer structure, independent of flow order. */
  forceSchemaVersion: number;
  currentPhase: InvestigationPhase;
  investigationBatch: 0 | 1 | 2 | 3;
  unlockedContentIds: string[];
  viewedContentIds: string[];
  openedContentIds: string[];
  solvedGateIds: FormalGateId[];
  solvedForceIds: string[];
  unlockedDeductionIds: string[];
  /** Independent discovery state for the future 岚 chapter slots on Reading Index. */
  unlockedReadingChapterIds: string[];
  terminalProgress: TerminalProgress | null;
  completedTerminalIds: string[];

  /** Historical fields kept as a compatibility projection during migration. */
  case_phase: CasePhase;
  police_batch: PoliceBatch;
  home_batch: HomeBatch;
  current_intro_step: number;
  max_unlocked_intro_step: number;
  intro_completed: boolean;
  intro_review_mode: boolean;
  published_material_ids: string[];
  viewed_material_ids: string[];
  opened_story_ids: string[];
  opened_special_reading_ids: string[];
  opened_chapter_ids: string[];
  read_chapter_ids: string[];
  seen_question_ids: string[];
  tapping_gate_passed: boolean;
  snake_gate_passed: boolean;
  force_opened: boolean;
  method_gate_passed: boolean;
  poem_published: boolean;
  tape_supplement_published: boolean;
  ling_reflection_acknowledged: boolean;
  ritual_step: 0 | 1 | 2 | 3 | 4;
  ending_chapter_opened: boolean;
  ending_chapter_read: boolean;
  finished: boolean;
  last_updated_at: string;
}
