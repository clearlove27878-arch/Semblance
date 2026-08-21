import { contentRegistry } from '../../content/ContentRegistry';
import type {
  CaseState,
  FormalGateId,
  InvestigationPhase,
  TerminalProgress
} from '../types';
import type { GateRuntimeSpec, RelationGateRuntime } from '../../content/types';
import { getSafePhaseWithoutFinalGate, isFinalGateCompleted } from '../state';
import {
  assertValidFlowDefinition,
  DEV_FLOW,
  FLOW_VERSION,
  INTRO_STEP_COUNT,
  PRODUCTION_FLOW,
  type FlowDefinition
} from './flowDefinition';
import { getReadingChapterTitle, isLanReadingChapterId, READING_INDEX_BASE_CHAPTER_IDS, type LanReadingChapterId } from '../readingIndex';
import { normalizeSearchInput } from '../../core/searchNormalize';

export const DEDUCTION_UNLOCK_SOURCE = 'reasoning-search' as const;
export const READING_UNLOCK_SOURCE = 'reading-index-search' as const;

export type FlowEvent =
  | { type: 'START_CASE' }
  | { type: 'CONTINUE_INTRO' }
  | { type: 'PREVIOUS_INTRO' }
  | { type: 'OPEN_INTRO_REVIEW' }
  | { type: 'CLOSE_INTRO_REVIEW' }
  | { type: 'CONTENT_OPENED'; contentId: string }
  | { type: 'CONTENT_VIEWED'; contentId: string }
  | { type: 'CONTINUE' }
  | { type: 'ENTER_GATE'; gateId: FormalGateId }
  | { type: 'FORCE_SOLVED'; forceId: string }
  | { type: 'GATE_SOLVED'; gateId: FormalGateId }
  | { type: 'DEDUCTION_UNLOCKED'; deductionId: string; source: typeof DEDUCTION_UNLOCK_SOURCE }
  | { type: 'READING_CHAPTER_UNLOCKED'; chapterId: string; source: typeof READING_UNLOCK_SOURCE }
  | { type: 'OPEN_READING_CHAPTER'; chapterId: string }
  | { type: 'RETURN_TO_READING_INDEX' }
  | { type: 'READING_PAGE_CHANGED'; chapterId: string; pageIndex: number; totalPages?: number }
  | { type: 'READING_CHAPTER_COMPLETED'; chapterId: string; pageIndex: number; totalPages: number }
  | { type: 'ENTER_FINAL_ENDING'; chapterId: string; pageIndex: number; totalPages: number }
  | { type: 'RETURN_TO_DESK' }
  | { type: 'RESET_PROGRESS' };

export interface FlowSnapshot {
  currentPhase: InvestigationPhase;
  unlockedContentIds: readonly string[];
  viewedContentIds: readonly string[];
  availableGateIds: readonly FormalGateId[];
  solvedGateIds: readonly FormalGateId[];
  solvedForceIds: readonly string[];
  unlockedDeductionIds: readonly string[];
  unlockedReadingChapterIds: readonly string[];
  terminalProgress: TerminalProgress | null;
  completedTerminalIds: readonly string[];
}

const LEGACY_NON_PLAYER_IDS = new Set([
  'prologue',
  ...PRODUCTION_FLOW.fictionalDeductionIds,
  ...PRODUCTION_FLOW.terminalChapterOrder,
  'novel-cheng'
]);

let didValidateProductionFlow = false;

function ensureDefinition(definition: FlowDefinition): void {
  if (definition.id !== 'PRODUCTION_FLOW' || didValidateProductionFlow) return;
  assertValidFlowDefinition(definition);
  didValidateProductionFlow = true;
}

function timestamp(): string {
  return new Date().toISOString();
}

function appendUnique(current: readonly string[], additions: readonly string[]): string[] {
  return [...current, ...additions.filter((item) => !current.includes(item))];
}

function removeDuplicateIds(current: readonly string[]): string[] {
  return [...new Set(current)];
}

function legacyPhaseForFlow(state: CaseState): CaseState['case_phase'] {
  if (state.currentPhase === 'INTRO') return 'INTRO';
  if (state.currentPhase === 'CASE_INVESTIGATION') {
    if (state.investigationBatch === 1) return 'CORPSE';
    if (state.investigationBatch === 2) return 'HOME_FIRST';
    return 'HOME_SECOND';
  }
  if (state.currentPhase === 'TAP_GATE') return 'TAPPING_GATE';
  if (state.currentPhase === 'POLICE_INVESTIGATION') return 'PEOPLE';
  if (state.currentPhase === 'FORCE_GATE') return 'INVESTIGATION';
  if (state.currentPhase === 'DEDUCTION_PHASE') return 'EVIDENCE';
  if (state.currentPhase === 'FINAL_GATE') return 'POISON_GATE';
  if (state.currentPhase === 'TERMINAL_REVEAL') return 'ENDING';
  return 'FINISHED';
}

/**
 * Keeps the former snake_case fields coherent for old saved states and
 * compatibility helpers.  They are a projection; the reducer never reads
 * them to decide the current player phase.
 */
export function projectLegacyState(state: CaseState): CaseState {
  const published = state.unlockedContentIds.filter((id) => !LEGACY_NON_PLAYER_IDS.has(id));
  const openedStories = state.openedContentIds.filter((id) => PRODUCTION_FLOW.fictionalDeductionIds.includes(id as never));
  const openedChapters = state.openedContentIds.filter((id) => PRODUCTION_FLOW.terminalChapterOrder.includes(id));
  const policeBatch = state.currentPhase === 'CASE_INVESTIGATION' ? Math.min(Math.max(state.investigationBatch, 0), 3) as CaseState['police_batch'] : 0;
  const homeBatch = state.currentPhase === 'CASE_INVESTIGATION'
    ? state.investigationBatch === 2 ? 1 : state.investigationBatch === 3 ? 2 : 0
    : 0;

  return {
    ...state,
    case_phase: legacyPhaseForFlow(state),
    police_batch: policeBatch,
    home_batch: homeBatch,
    published_material_ids: published,
    viewed_material_ids: state.viewedContentIds.filter((id) => published.includes(id)),
    opened_story_ids: openedStories,
    opened_chapter_ids: openedChapters,
    read_chapter_ids: [...state.completedTerminalIds],
    tapping_gate_passed: state.solvedGateIds.includes('tapping'),
    force_opened: state.solvedGateIds.includes('force'),
    method_gate_passed: state.solvedGateIds.includes('final'),
    ending_chapter_opened: openedChapters.length > 0,
    ending_chapter_read: state.completedTerminalIds.length > 0,
    finished: state.currentPhase === 'COMPLETE'
  };
}

function touch(state: CaseState, changes: Partial<CaseState>): CaseState {
  return projectLegacyState({ ...state, ...changes, last_updated_at: timestamp() });
}

function enterPhase(state: CaseState, phase: InvestigationPhase, definition: FlowDefinition): CaseState {
  let next = { ...state, currentPhase: phase };
  next = {
    ...next,
    unlockedContentIds: appendUnique(next.unlockedContentIds, definition.phases[phase].unlockOnEntry ?? [])
  };
  return touch(next, {});
}

function unlockInvestigationBatch(state: CaseState, batch: 1 | 2 | 3, definition: FlowDefinition): CaseState {
  const ids = definition.investigationBatches[batch - 1] ?? [];
  return touch({ ...state, investigationBatch: batch }, {
    unlockedContentIds: appendUnique(state.unlockedContentIds, ids)
  });
}

function isGatePhase(phase: InvestigationPhase, gateId: FormalGateId): boolean {
  if (gateId === 'tapping') return phase === 'TAP_GATE';
  if (gateId === 'force') return phase === 'FORCE_GATE';
  return phase === 'FINAL_GATE';
}

function isTerminalPhase(phase: InvestigationPhase): boolean {
  return phase === 'TERMINAL_REVEAL' || phase === 'COMPLETE';
}

function isReadingBaseChapterId(value: string): value is typeof READING_INDEX_BASE_CHAPTER_IDS[number] {
  return (READING_INDEX_BASE_CHAPTER_IDS as readonly string[]).includes(value);
}

/**
 * Reading access is independent from the old linear terminal chapter order.
 * The two existing chapters are always available after the Reading area is
 * reached; future 岚 chapters require their own persisted unlock ID and a
 * registered chapter body.
 */
export function isReadingChapterAccessible(state: CaseState, chapterId: string): boolean {
  if (!isFinalGateCompleted(state) || !isTerminalPhase(state.currentPhase)) return false;
  if (isReadingBaseChapterId(chapterId)) return Boolean(contentRegistry.getTerminalChapter(chapterId));
  return isLanReadingChapterId(chapterId)
    && Boolean(getReadingChapterTitle(chapterId))
    && state.unlockedReadingChapterIds.includes(chapterId)
    && Boolean(contentRegistry.getTerminalChapter(chapterId));
}

function isPersistedReadingChapterId(value: string): boolean {
  return isReadingBaseChapterId(value) || isLanReadingChapterId(value);
}

function isRelationRuntime(runtime: GateRuntimeSpec | undefined): runtime is RelationGateRuntime {
  return Boolean(runtime && 'standardSets' in runtime && 'requiredCount' in runtime);
}

function resetState(state: CaseState): CaseState {
  return projectLegacyState({
    ...state,
    screen: 'START',
    flowVersion: FLOW_VERSION,
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
  });
}

export function createInvestigationFlow(definition: FlowDefinition = PRODUCTION_FLOW) {
  ensureDefinition(definition);
  return {
    dispatch: (state: CaseState, event: FlowEvent): CaseState => reduceInvestigationFlow(state, event, definition),
    getSnapshot: (state: CaseState): FlowSnapshot => getFlowSnapshot(state, definition),
    getAvailableGateIds: (state: CaseState): FormalGateId[] => getAvailableGateIds(state, definition)
  };
}

export const investigationFlow = createInvestigationFlow(PRODUCTION_FLOW);

export function reduceInvestigationFlow(state: CaseState, event: FlowEvent, definition: FlowDefinition = PRODUCTION_FLOW): CaseState {
  ensureDefinition(definition);

  if (event.type === 'RESET_PROGRESS') return resetState(state);
  if (state.flowVersion !== definition.version) return state;

  switch (event.type) {
    case 'START_CASE':
      if (state.screen !== 'START') return state;
      return touch(state, {
        screen: 'INTRO',
        currentPhase: 'INTRO',
        current_intro_step: 1,
        max_unlocked_intro_step: 1,
        intro_review_mode: false
      });

    case 'CONTINUE_INTRO': {
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
      const enteredDesk = enterPhase({
        ...state,
        screen: 'DESK',
        intro_completed: true,
        intro_review_mode: false,
        investigationBatch: 1
      }, 'CASE_INVESTIGATION', definition);
      return unlockInvestigationBatch(enteredDesk, 1, definition);
    }

    case 'PREVIOUS_INTRO':
      if (state.screen !== 'INTRO' || state.current_intro_step <= 1) return state;
      return touch(state, { current_intro_step: state.current_intro_step - 1 });

    case 'OPEN_INTRO_REVIEW':
      if (!state.intro_completed) return state;
      return touch(state, {
        screen: 'INTRO',
        current_intro_step: INTRO_STEP_COUNT,
        max_unlocked_intro_step: INTRO_STEP_COUNT,
        intro_review_mode: true
      });

    case 'CLOSE_INTRO_REVIEW':
      if (!state.intro_completed || state.screen !== 'INTRO') return state;
      return touch(state, { screen: 'DESK', intro_review_mode: false });

    case 'CONTENT_OPENED':
      if (!state.unlockedContentIds.includes(event.contentId) || state.openedContentIds.includes(event.contentId)) return state;
      return touch(state, { openedContentIds: appendUnique(state.openedContentIds, [event.contentId]) });

    case 'CONTENT_VIEWED':
      if (!state.unlockedContentIds.includes(event.contentId)) return state;
      return touch(state, {
        openedContentIds: appendUnique(state.openedContentIds, [event.contentId]),
        viewedContentIds: appendUnique(state.viewedContentIds, [event.contentId])
      });

    case 'CONTINUE': {
      if (state.screen !== 'DESK' || state.currentPhase !== 'CASE_INVESTIGATION') return state;
      const batch = state.investigationBatch || 1;
      const requiredIds = definition.investigationBatches[batch - 1] ?? [];
      if (!requiredIds.every((id) => state.viewedContentIds.includes(id))) return state;
      if (batch < definition.investigationBatches.length) {
        return unlockInvestigationBatch(state, (batch + 1) as 1 | 2 | 3, definition);
      }
      return enterPhase(state, 'TAP_GATE', definition);
    }

    case 'ENTER_GATE': {
      const available = getAvailableGateIds(state, definition);
      if (!available.includes(event.gateId) || state.solvedGateIds.includes(event.gateId)) return state;
      if (event.gateId === 'force' && state.currentPhase === 'POLICE_INVESTIGATION') return enterPhase(state, 'FORCE_GATE', definition);
      if (event.gateId === 'final' && state.currentPhase === 'DEDUCTION_PHASE') return enterPhase(state, 'FINAL_GATE', definition);
      return state;
    }

    case 'FORCE_SOLVED': {
      if (state.currentPhase !== 'FORCE_GATE' || state.solvedGateIds.includes('force')) return state;
      const forceGate = contentRegistry.getGateById('force');
      const forceRuntime = forceGate?.runtime;
      const forceIds = new Set((isRelationRuntime(forceRuntime)
        ? forceRuntime.standardSets.map((item) => item.forceId)
        : []) ?? []);
      if (!forceIds.has(event.forceId) || state.solvedForceIds.includes(event.forceId)) return state;
      return touch(state, { solvedForceIds: appendUnique(state.solvedForceIds, [event.forceId]) });
    }

    case 'GATE_SOLVED': {
      if (!isGatePhase(state.currentPhase, event.gateId) || state.solvedGateIds.includes(event.gateId)) return state;
      if (event.gateId === 'force') {
        const forceGate = contentRegistry.getGateById('force');
        const forceRuntime = forceGate?.runtime;
        const required = isRelationRuntime(forceRuntime)
          ? forceRuntime.requiredCount
          : 4;
        if (state.solvedForceIds.length < required) return state;
      }
      return touch(state, { solvedGateIds: [...state.solvedGateIds, event.gateId] });
    }

    case 'DEDUCTION_UNLOCKED': {
      if (!definition.fictionalDeductionIds.includes(event.deductionId) || state.unlockedDeductionIds.includes(event.deductionId)) return state;
      if (event.source !== DEDUCTION_UNLOCK_SOURCE) return state;
      return touch(state, {
        unlockedDeductionIds: appendUnique(state.unlockedDeductionIds, [event.deductionId]),
        unlockedContentIds: appendUnique(state.unlockedContentIds, [event.deductionId])
      });
    }

    case 'READING_CHAPTER_UNLOCKED': {
      if (event.source !== READING_UNLOCK_SOURCE || !isFinalGateCompleted(state) || state.screen !== 'DESK' || !isTerminalPhase(state.currentPhase)) return state;
      if (!isLanReadingChapterId(event.chapterId)
        || !getReadingChapterTitle(event.chapterId)
        || !contentRegistry.getTerminalChapter(event.chapterId)
        || state.unlockedReadingChapterIds.includes(event.chapterId)) return state;
      return touch(state, {
        unlockedReadingChapterIds: appendUnique(state.unlockedReadingChapterIds, [event.chapterId as LanReadingChapterId])
      });
    }

    case 'OPEN_READING_CHAPTER': {
      if (!isReadingChapterAccessible(state, event.chapterId)) return state;
      const current = { chapterId: event.chapterId, pageIndex: 0 };
      return touch({
        ...state,
        terminalProgress: current,
        unlockedContentIds: appendUnique(state.unlockedContentIds, [event.chapterId]),
        openedContentIds: appendUnique(state.openedContentIds, [event.chapterId])
      }, {});
    }

    case 'RETURN_TO_READING_INDEX':
      if (state.screen !== 'DESK' || !isTerminalPhase(state.currentPhase)) return state;
      return state;

    case 'RETURN_TO_DESK': {
      if (state.currentPhase === 'TAP_GATE' && state.solvedGateIds.includes('tapping')) {
        return enterPhase(state, definition.gateNextPhase.tapping, definition);
      }
      if (state.currentPhase === 'FORCE_GATE' && !state.solvedGateIds.includes('force')) {
        return enterPhase(state, 'POLICE_INVESTIGATION', definition);
      }
      if (state.currentPhase === 'FORCE_GATE' && state.solvedGateIds.includes('force')) {
        return enterPhase(state, definition.gateNextPhase.force, definition);
      }
      if (state.currentPhase === 'FINAL_GATE' && !state.solvedGateIds.includes('final')) {
        return enterPhase(state, 'DEDUCTION_PHASE', definition);
      }
      if (state.currentPhase === 'FINAL_GATE' && state.solvedGateIds.includes('final')) {
        const next = enterPhase(state, definition.gateNextPhase.final, definition);
        return touch({
          ...next,
          terminalProgress: null,
          unlockedContentIds: appendUnique(next.unlockedContentIds, READING_INDEX_BASE_CHAPTER_IDS)
        }, {});
      }
      if (state.currentPhase === 'TERMINAL_REVEAL' || state.currentPhase === 'COMPLETE') {
        if (!isFinalGateCompleted(state)) {
          const terminalIds = new Set(definition.terminalChapterOrder);
          return enterPhase({
            ...state,
            screen: 'DESK',
            unlockedContentIds: state.unlockedContentIds.filter((id) => !terminalIds.has(id)),
            viewedContentIds: state.viewedContentIds.filter((id) => !terminalIds.has(id)),
            openedContentIds: state.openedContentIds.filter((id) => !terminalIds.has(id)),
            unlockedReadingChapterIds: [],
            terminalProgress: null,
            completedTerminalIds: []
          }, getSafePhaseWithoutFinalGate(state), definition);
        }
        // Leaving the reader is a view change, not a progression rollback.
        // Keep COMPLETE terminally complete while CaseDesk renders review.
        return touch({ ...state, screen: 'DESK' }, {});
      }
      return state;
    }

    case 'READING_PAGE_CHANGED': {
      if (!isReadingChapterAccessible(state, event.chapterId) || state.terminalProgress?.chapterId !== event.chapterId) return state;
      const maxPage = typeof event.totalPages === 'number' ? Math.max(0, event.totalPages - 1) : Number.POSITIVE_INFINITY;
      const pageIndex = Math.max(0, Math.min(Math.floor(event.pageIndex), maxPage));
      return touch(state, {
        terminalProgress: { chapterId: event.chapterId, pageIndex },
        openedContentIds: appendUnique(state.openedContentIds, [event.chapterId])
      });
    }

    case 'READING_CHAPTER_COMPLETED': {
      if (!isReadingChapterAccessible(state, event.chapterId) || state.terminalProgress?.chapterId !== event.chapterId) return state;
      if (event.totalPages < 1 || event.pageIndex < event.totalPages - 1) return state;
      if (state.terminalProgress.pageIndex !== event.pageIndex) return state;
      // Re-reading a completed chapter records no second transition and never
      // opens another chapter.
      if (state.completedTerminalIds.includes(event.chapterId)) return state;
      const completed = appendUnique(state.completedTerminalIds, [event.chapterId]);
      return touch(state, {
        terminalProgress: { chapterId: event.chapterId, pageIndex: event.pageIndex },
        completedTerminalIds: completed,
        viewedContentIds: appendUnique(state.viewedContentIds, [event.chapterId]),
        openedContentIds: appendUnique(state.openedContentIds, [event.chapterId])
      });
    }

    case 'ENTER_FINAL_ENDING': {
      if (state.screen !== 'DESK' || !['TERMINAL_REVEAL', 'COMPLETE'].includes(state.currentPhase)) return state;
      if (event.chapterId !== 'lan-death' || event.totalPages < 1 || event.pageIndex < event.totalPages - 1) return state;
      if (state.terminalProgress?.chapterId !== event.chapterId
        || state.terminalProgress.pageIndex !== event.pageIndex
        || !state.completedTerminalIds.includes(event.chapterId)) return state;
      return touch(state, { screen: 'ENDING', currentPhase: 'COMPLETE', finished: true });
    }
  }
}

export function getAvailableGateIds(state: { currentPhase: CaseState['currentPhase']; solvedGateIds: readonly FormalGateId[] }, definition: FlowDefinition = PRODUCTION_FLOW): FormalGateId[] {
  ensureDefinition(definition);
  return (definition.phases[state.currentPhase]?.availableGateIds ?? []).filter((id) => !state.solvedGateIds.includes(id));
}

export function getFlowSnapshot(state: CaseState, definition: FlowDefinition = PRODUCTION_FLOW): FlowSnapshot {
  return {
    currentPhase: state.currentPhase,
    unlockedContentIds: state.unlockedContentIds,
    viewedContentIds: state.viewedContentIds,
    availableGateIds: getAvailableGateIds(state, definition),
    solvedGateIds: state.solvedGateIds,
    solvedForceIds: state.solvedForceIds,
    unlockedDeductionIds: state.unlockedDeductionIds,
    unlockedReadingChapterIds: state.unlockedReadingChapterIds,
    terminalProgress: state.terminalProgress,
    completedTerminalIds: state.completedTerminalIds
  };
}

export interface DeductionTitleMatch {
  deductionId: string;
  alreadyUnlocked: boolean;
}

/** Exact title matching only; this is intentionally not semantic search. */
export function resolveDeductionTitle(state: CaseState, input: string, definition: FlowDefinition = PRODUCTION_FLOW): DeductionTitleMatch | null {
  const normalizedInput = normalizeSearchInput(input);
  if (!normalizedInput) return null;
  for (const deductionId of definition.fictionalDeductionIds) {
    const record = contentRegistry.getStory(deductionId);
    if (!record) continue;
    const candidates = [record.title, record.displayTitle, ...record.aliases];
    if (candidates.some((candidate) => normalizeSearchInput(candidate) === normalizedInput)) {
      return { deductionId, alreadyUnlocked: state.unlockedDeductionIds.includes(deductionId) };
    }
  }
  return null;
}

export function resetProgress(state: CaseState): CaseState {
  return resetState(state);
}

export { DEV_FLOW, FLOW_VERSION, PRODUCTION_FLOW };
