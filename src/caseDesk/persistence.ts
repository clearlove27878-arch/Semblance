import { CASE_DESK_SAVE_VERSION, createInitialCaseState, FORCE_SCHEMA_VERSION, getSafePhaseWithoutFinalGate, isFinalGateCompleted } from './state';
import { FLOW_VERSION, FICTIONAL_DEDUCTION_IDS, READING_CHAPTER_ORDER } from './flow/flowDefinition';
import { isLanReadingChapterId, migrateReadingChapterId, READING_INDEX_BASE_CHAPTER_IDS } from './readingIndex';
import { INVESTIGATION_PHASES, type AppScreen, type CaseState, type FormalGateId, type InvestigationPhase, type TerminalProgress } from './types';
import { clearReasoningGateDraft } from './reasoningDraftPersistence';

type ReadingChapterId = typeof READING_CHAPTER_ORDER[number];
const LEGACY_MONOLITHIC_LAN_ID = 'novel-cheng';

export const CASE_DESK_SAVE_KEY = 'si_case_desk_state_v6';
export const PREVIOUS_CASE_DESK_SAVE_KEY = 'si_case_desk_state_v5';
export const OLDER_CASE_DESK_SAVE_KEY = 'si_case_desk_state_v4';
export const ARCHIVED_CASE_DESK_SAVE_KEY = 'si_case_desk_state_v3';
export const LEGACY_SAVE_KEY = 'si_graybox_player_safe_state_v1';

export const CURRENT_FORCE_IDS = ['F1_PHOTO', 'F2_INTERPRETATION', 'F3_TALISMAN', 'F4_TAPE'] as const;
const CURRENT_FORCE_ID_SET = new Set<string>(CURRENT_FORCE_IDS);
const LEGACY_FORCE_ID_SET = new Set(['F1_RECOMMENDATION']);

export interface LoadedCaseDeskState {
  state: CaseState;
  incompatible: boolean;
  legacySaveDetected: boolean;
}

function getBrowserStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}

function validStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function validPhase(value: unknown): value is InvestigationPhase {
  return typeof value === 'string' && INVESTIGATION_PHASES.includes(value as InvestigationPhase);
}

function validScreen(value: unknown): value is AppScreen {
  return value === 'START' || value === 'INTRO' || value === 'DESK' || value === 'ENDING';
}

function validGateIds(value: unknown): FormalGateId[] {
  return validStringArray(value).filter((id): id is FormalGateId => id === 'tapping' || id === 'force' || id === 'final');
}

function validTerminalProgress(value: unknown): TerminalProgress | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<TerminalProgress>;
  const chapterId = typeof candidate.chapterId === 'string' ? migrateReadingChapterId(candidate.chapterId) : '';
  if (!isPersistedReadingChapterId(chapterId)) return null;
  if (typeof candidate.pageIndex !== 'number' || !Number.isFinite(candidate.pageIndex)) return null;
  return { chapterId, pageIndex: Math.max(0, Math.floor(candidate.pageIndex)) };
}

function isReadingChapterId(value: string): value is ReadingChapterId {
  return (READING_CHAPTER_ORDER as readonly string[]).includes(value);
}

function isBaseReadingChapterId(value: string): value is typeof READING_INDEX_BASE_CHAPTER_IDS[number] {
  return (READING_INDEX_BASE_CHAPTER_IDS as readonly string[]).includes(value);
}

function isPersistedReadingChapterId(value: string): boolean {
  return isBaseReadingChapterId(value) || isLanReadingChapterId(value);
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function stripLegacyReadingFields(raw: Partial<CaseState>): Partial<CaseState> {
  const sanitized = { ...(raw as Record<string, unknown>) };
  for (const key of ['lanUnlocked', 'terminalUnlocked', 'lanComplete', 'terminalReaderOpen', 'historyView', 'activeReadingId']) {
    delete sanitized[key];
  }
  return sanitized as Partial<CaseState>;
}

function forceProgressRequiresFreshAnswer(raw: Partial<CaseState>, phase: InvestigationPhase, solvedGateIds: readonly FormalGateId[]): boolean {
  const schemaVersion = typeof raw.forceSchemaVersion === 'number' ? raw.forceSchemaVersion : 1;
  const solvedForceIds = validStringArray(raw.solvedForceIds);
  const oldForceIdPresent = solvedForceIds.some((id) => LEGACY_FORCE_ID_SET.has(id));
  const downstreamPhase = ['DEDUCTION_PHASE', 'FINAL_GATE', 'TERMINAL_REVEAL', 'COMPLETE'].includes(phase);
  const hadForceProgress = oldForceIdPresent
    || solvedForceIds.length > 0
    || solvedGateIds.includes('force')
    || downstreamPhase
    || raw.force_opened === true;
  return schemaVersion < FORCE_SCHEMA_VERSION && hadForceProgress || oldForceIdPresent;
}

function legacyPhase(raw: Partial<CaseState>): InvestigationPhase {
  if (validPhase(raw.currentPhase)) return raw.currentPhase;
  switch (raw.case_phase) {
    case 'CORPSE':
    case 'HOME_FIRST':
    case 'HOME_SECOND':
      return 'CASE_INVESTIGATION';
    case 'TAPPING_GATE': return 'TAP_GATE';
    case 'PEOPLE': return 'POLICE_INVESTIGATION';
    case 'INVESTIGATION': return 'FORCE_GATE';
    case 'EVIDENCE':
    case 'POLICE_HALT':
      return 'DEDUCTION_PHASE';
    case 'BEGINNING_LING_GATE':
    case 'LING_REVEAL':
    case 'POISON_GATE':
      return 'FINAL_GATE';
    case 'AFTERMATH':
    case 'RITUAL':
    case 'ENDING':
      return 'TERMINAL_REVEAL';
    case 'FINISHED': return 'COMPLETE';
    default: return 'INTRO';
  }
}

function legacyBatch(raw: Partial<CaseState>): 0 | 1 | 2 | 3 {
  if (raw.investigationBatch === 1 || raw.investigationBatch === 2 || raw.investigationBatch === 3) return raw.investigationBatch;
  if (raw.case_phase === 'CORPSE') return 1;
  if (raw.case_phase === 'HOME_FIRST') return 2;
  if (raw.case_phase === 'HOME_SECOND') return 3;
  if (raw.police_batch === 1 || raw.police_batch === 2 || raw.police_batch === 3) return raw.police_batch;
  return 0;
}

function isTerminalPhase(phase: InvestigationPhase): boolean {
  return phase === 'TERMINAL_REVEAL' || phase === 'COMPLETE';
}

function mergeState(raw: Partial<CaseState>): CaseState {
  const initial = createInitialCaseState();
  const sanitizedRaw = stripLegacyReadingFields(raw);
  const persistedScreen = validScreen(raw.screen) ? raw.screen : initial.screen;
  const publishedMaterialIds = validStringArray(raw.published_material_ids).map(migrateReadingChapterId);
  const viewedMaterialIds = validStringArray(raw.viewed_material_ids).map(migrateReadingChapterId);
  let unlockedDeductionIds = uniqueStrings(validStringArray(raw.unlockedDeductionIds)
    .filter((id) => (FICTIONAL_DEDUCTION_IDS as readonly string[]).includes(id)));
  const unlockedReadingChapterIds = uniqueStrings(validStringArray(raw.unlockedReadingChapterIds).map(migrateReadingChapterId)
    .filter(isLanReadingChapterId));
  const openedChapterIds = validStringArray(raw.opened_chapter_ids).map(migrateReadingChapterId)
    .filter(isPersistedReadingChapterId)
    .filter((id) => isBaseReadingChapterId(id) || unlockedReadingChapterIds.includes(id));
  const deductionIdSet = new Set<string>(FICTIONAL_DEDUCTION_IDS);
  const isAllowedContentId = (id: string): boolean => {
    const canonicalId = migrateReadingChapterId(id);
    if (deductionIdSet.has(canonicalId)) return unlockedDeductionIds.includes(canonicalId);
    if (canonicalId === LEGACY_MONOLITHIC_LAN_ID) return false;
    if (isReadingChapterId(canonicalId)) return isBaseReadingChapterId(canonicalId) || unlockedReadingChapterIds.includes(canonicalId);
    return true;
  };
  const rawUnlockedContentIds = validStringArray(raw.unlockedContentIds).map(migrateReadingChapterId);
  let unlockedContentIds = rawUnlockedContentIds.length > 0
    ? uniqueStrings([...rawUnlockedContentIds.filter(isAllowedContentId), ...unlockedDeductionIds])
    : uniqueStrings([...publishedMaterialIds, ...unlockedDeductionIds, ...openedChapterIds]);
  const rawViewedContentIds = validStringArray(raw.viewedContentIds).map(migrateReadingChapterId);
  let viewedContentIds = (rawViewedContentIds.length > 0 ? rawViewedContentIds : viewedMaterialIds)
    .filter(isAllowedContentId);
  const rawOpenedContentIds = validStringArray(raw.openedContentIds).map(migrateReadingChapterId);
  let openedContentIds = (rawOpenedContentIds.length > 0
    ? rawOpenedContentIds
    : [...viewedMaterialIds, ...unlockedDeductionIds, ...openedChapterIds])
    .filter(isAllowedContentId);
  const rawCompletedTerminalIds = validStringArray(raw.completedTerminalIds).map(migrateReadingChapterId);
  const rawReadChapterIds = validStringArray(raw.read_chapter_ids).map(migrateReadingChapterId);
  let completedTerminalIds = rawCompletedTerminalIds.length > 0
    ? rawCompletedTerminalIds.filter(isPersistedReadingChapterId)
    : rawReadChapterIds.filter(isPersistedReadingChapterId);
  completedTerminalIds = uniqueStrings(completedTerminalIds
    .filter((id) => isBaseReadingChapterId(id) || unlockedReadingChapterIds.includes(id)));
  let terminalProgress = validTerminalProgress(raw.terminalProgress)
    ?? (openedChapterIds.length > 0 ? { chapterId: openedChapterIds[openedChapterIds.length - 1], pageIndex: 0 } : null);
  if (terminalProgress && isLanReadingChapterId(terminalProgress.chapterId)
    && !unlockedReadingChapterIds.includes(terminalProgress.chapterId)) {
    terminalProgress = null;
  }
  let currentPhase = legacyPhase(raw);
  let solvedGateIds = validGateIds(raw.solvedGateIds).length > 0
    ? validGateIds(raw.solvedGateIds)
    : raw.tapping_gate_passed ? ['tapping' as FormalGateId] : [];
  const requiresFreshForceAnswer = forceProgressRequiresFreshAnswer(raw, currentPhase, solvedGateIds);
  let solvedForceIds = uniqueStrings(validStringArray(raw.solvedForceIds)
    .filter((id) => CURRENT_FORCE_ID_SET.has(id))
    .filter((id) => !requiresFreshForceAnswer || id !== 'F1_PHOTO'));

  if (requiresFreshForceAnswer) {
    const laterContentIds = new Set<string>([...FICTIONAL_DEDUCTION_IDS, ...READING_CHAPTER_ORDER, LEGACY_MONOLITHIC_LAN_ID]);
    unlockedContentIds = unlockedContentIds.filter((id) => !laterContentIds.has(id));
    viewedContentIds = viewedContentIds.filter((id) => !laterContentIds.has(id));
    openedContentIds = openedContentIds.filter((id) => !laterContentIds.has(id));
    unlockedDeductionIds = [];
    completedTerminalIds = [];
    terminalProgress = null;
    solvedGateIds = solvedGateIds.filter((id) => id === 'tapping');
    currentPhase = 'FORCE_GATE';
  }

  if (isTerminalPhase(currentPhase) && !isFinalGateCompleted({ solvedGateIds })) {
    const terminalIds = new Set<string>([...READING_CHAPTER_ORDER, LEGACY_MONOLITHIC_LAN_ID]);
    unlockedContentIds = unlockedContentIds.filter((id) => !terminalIds.has(id));
    viewedContentIds = viewedContentIds.filter((id) => !terminalIds.has(id));
    openedContentIds = openedContentIds.filter((id) => !terminalIds.has(id));
    completedTerminalIds = [];
    terminalProgress = null;
    unlockedReadingChapterIds.length = 0;
    currentPhase = getSafePhaseWithoutFinalGate({ solvedGateIds });
  }

  if (!isFinalGateCompleted({ solvedGateIds })) unlockedReadingChapterIds.length = 0;

  if (isFinalGateCompleted({ solvedGateIds }) && isTerminalPhase(currentPhase)) {
    unlockedContentIds = uniqueStrings([...unlockedContentIds, ...READING_INDEX_BASE_CHAPTER_IDS]);
  }

  const screen = persistedScreen === 'ENDING'
    && currentPhase === 'COMPLETE'
    && isFinalGateCompleted({ solvedGateIds })
    ? 'ENDING'
    : persistedScreen === 'ENDING' ? 'DESK' : persistedScreen;

  return {
    ...initial,
    ...sanitizedRaw,
    screen,
    save_version: CASE_DESK_SAVE_VERSION,
    flowVersion: typeof raw.flowVersion === 'number' ? raw.flowVersion : FLOW_VERSION,
    forceSchemaVersion: FORCE_SCHEMA_VERSION,
    currentPhase,
    investigationBatch: legacyBatch(raw),
    unlockedContentIds,
    viewedContentIds,
    openedContentIds,
    solvedGateIds,
    solvedForceIds,
    unlockedDeductionIds,
    unlockedReadingChapterIds,
    terminalProgress,
    completedTerminalIds,
    published_material_ids: publishedMaterialIds.filter((id) => unlockedContentIds.includes(id)),
    viewed_material_ids: viewedMaterialIds,
    opened_story_ids: unlockedDeductionIds,
    opened_special_reading_ids: validStringArray(raw.opened_special_reading_ids),
    opened_chapter_ids: openedContentIds.filter(isReadingChapterId),
    read_chapter_ids: completedTerminalIds,
    seen_question_ids: validStringArray(raw.seen_question_ids),
    tapping_gate_passed: solvedGateIds.includes('tapping'),
    force_opened: solvedGateIds.includes('force'),
    method_gate_passed: solvedGateIds.includes('final'),
    ending_chapter_opened: openedChapterIds.length > 0,
    ending_chapter_read: completedTerminalIds.length > 0,
    finished: currentPhase === 'COMPLETE'
  };
}

export function loadCaseDeskState(): LoadedCaseDeskState {
  const storage = getBrowserStorage();
  if (!storage) return { state: createInitialCaseState(), incompatible: false, legacySaveDetected: false };
  let legacySaveDetected = false;
  try {
    const saveCandidates = [
      [CASE_DESK_SAVE_KEY, storage.getItem(CASE_DESK_SAVE_KEY)],
      [PREVIOUS_CASE_DESK_SAVE_KEY, storage.getItem(PREVIOUS_CASE_DESK_SAVE_KEY)],
      [OLDER_CASE_DESK_SAVE_KEY, storage.getItem(OLDER_CASE_DESK_SAVE_KEY)],
      [ARCHIVED_CASE_DESK_SAVE_KEY, storage.getItem(ARCHIVED_CASE_DESK_SAVE_KEY)],
      [LEGACY_SAVE_KEY, storage.getItem(LEGACY_SAVE_KEY)]
    ] as const;
    legacySaveDetected = saveCandidates.some(([key, value]) => key !== CASE_DESK_SAVE_KEY && Boolean(value));
    const selected = saveCandidates.find(([, value]) => Boolean(value));
    if (!selected) return { state: createInitialCaseState(), incompatible: false, legacySaveDetected };
    const [selectedKey, raw] = selected;
    if (!raw) return { state: createInitialCaseState(), incompatible: false, legacySaveDetected };
    const parsed = JSON.parse(raw) as Partial<CaseState>;
    const parsedSaveVersion = typeof parsed.save_version === 'number' ? parsed.save_version : 0;
    if (parsedSaveVersion > CASE_DESK_SAVE_VERSION) {
      return { state: createInitialCaseState(), incompatible: true, legacySaveDetected };
    }
    if (typeof parsed.flowVersion === 'number' && parsed.flowVersion > FLOW_VERSION) {
      return { state: createInitialCaseState(), incompatible: true, legacySaveDetected };
    }
    if (typeof parsed.forceSchemaVersion === 'number' && parsed.forceSchemaVersion > FORCE_SCHEMA_VERSION) {
      return { state: createInitialCaseState(), incompatible: true, legacySaveDetected };
    }
    const parsedPhase = legacyPhase(parsed);
    const parsedSolvedGateIds = validGateIds(parsed.solvedGateIds);
    const invalidTerminalSave = isTerminalPhase(parsedPhase) && !isFinalGateCompleted({ solvedGateIds: parsedSolvedGateIds });
    const state = mergeState(parsed);
    const shouldPersistMigration = selectedKey !== CASE_DESK_SAVE_KEY
      || parsedSaveVersion !== CASE_DESK_SAVE_VERSION
      || LEGACY_MONOLITHIC_LAN_ID in (parsed as Record<string, unknown>)
      || ['lanUnlocked', 'terminalUnlocked', 'lanComplete', 'terminalReaderOpen', 'historyView', 'activeReadingId']
        .some((key) => key in (parsed as Record<string, unknown>));
    if (forceProgressRequiresFreshAnswer(parsed, legacyPhase(parsed), validGateIds(parsed.solvedGateIds))) {
      clearReasoningGateDraft('force');
      saveCaseDeskState(state);
    } else if (invalidTerminalSave || shouldPersistMigration) {
      saveCaseDeskState(state);
    }
    return { state, incompatible: false, legacySaveDetected };
  } catch {
    return { state: createInitialCaseState(), incompatible: true, legacySaveDetected };
  }
}

export function saveCaseDeskState(state: CaseState): void {
  const storage = getBrowserStorage();
  if (!storage) return;
  try {
    storage.setItem(CASE_DESK_SAVE_KEY, JSON.stringify(state));
  } catch {
    // The desk remains usable when local storage is unavailable.
  }
}

export function clearCaseDeskSave(): void {
  const storage = getBrowserStorage();
  if (!storage) return;
  try {
    storage.removeItem(CASE_DESK_SAVE_KEY);
    storage.removeItem(PREVIOUS_CASE_DESK_SAVE_KEY);
    storage.removeItem(OLDER_CASE_DESK_SAVE_KEY);
    storage.removeItem(ARCHIVED_CASE_DESK_SAVE_KEY);
    storage.removeItem(LEGACY_SAVE_KEY);
  } catch {
    // An unavailable storage backend must not prevent the player from using the UI.
  }
}
