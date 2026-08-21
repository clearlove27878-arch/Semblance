import { INTRO_STEP_COUNT, SAVE_VERSION } from './constants';
import { redactAuthorCode } from './authorOverride';
import { createInitialState } from './state';
import type { CaseState, StageId } from './types';

export const PLAYER_STATE_KEY = 'si_graybox_player_safe_state_v1';
let saveSerial = 0;

type PersistedCaseState = Partial<CaseState> & { intro_step?: number };

function boundedIntroStep(value: unknown, fallback: number, minimum = 0): number {
  const candidate = typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : fallback;
  return Math.min(Math.max(candidate, minimum), INTRO_STEP_COUNT);
}

export interface LoadStateResult {
  state: CaseState;
  incompatible: boolean;
}

export function loadState(): LoadStateResult {
  try {
    const raw = localStorage.getItem(PLAYER_STATE_KEY);
    if (!raw) return { state: createInitialState(), incompatible: false };
    const parsed = JSON.parse(raw) as PersistedCaseState;
    if (parsed.save_version !== SAVE_VERSION) {
      return { state: createInitialState(), incompatible: true };
    }
    const { intro_step: legacyIntroStep, ...parsedState } = parsed;
    const initial = createInitialState();
    const stageStates = Object.fromEntries(
      (Object.keys(initial.stage_states) as StageId[]).map((id) => [id, { ...initial.stage_states[id], ...(parsed.stage_states?.[id] ?? {}) }])
    ) as CaseState['stage_states'];
    const reading = Object.fromEntries(
      (Object.keys(initial.reading) as Array<keyof CaseState['reading']>).map((id) => [id, { ...initial.reading[id], ...(parsed.reading?.[id] ?? {}) }])
    ) as CaseState['reading'];
    const state = {
        ...initial,
        ...parsedState,
        stage_states: stageStates,
        reading,
        author_override_history: parsedState.author_override_history ?? []
      } as CaseState;

    const hasCurrentIntroStep = Object.prototype.hasOwnProperty.call(parsed, 'current_intro_step');
    const hasMaxUnlockedIntroStep = Object.prototype.hasOwnProperty.call(parsed, 'max_unlocked_intro_step');
    const hasLegacyIntroStep = Object.prototype.hasOwnProperty.call(parsed, 'intro_step');
    const hasAnyIntroFields = ['intro_started', 'intro_completed'].some((key) => Object.prototype.hasOwnProperty.call(parsed, key));

    if (state.case_status === 'START') {
      state.current_intro_step = 0;
      state.max_unlocked_intro_step = 0;
    } else if (hasCurrentIntroStep || hasMaxUnlockedIntroStep) {
      const currentFallback = state.intro_completed ? INTRO_STEP_COUNT : 1;
      const current = boundedIntroStep(parsed.current_intro_step, currentFallback, 1);
      const max = Math.max(
        boundedIntroStep(parsed.max_unlocked_intro_step, currentFallback, 1),
        current
      );
      state.current_intro_step = Math.min(current, max);
      state.max_unlocked_intro_step = max;
    } else if (hasLegacyIntroStep) {
      const legacyStep = boundedIntroStep(legacyIntroStep, state.intro_completed ? INTRO_STEP_COUNT : 1);
      if (state.intro_completed || legacyStep >= INTRO_STEP_COUNT) {
        state.current_intro_step = INTRO_STEP_COUNT;
        state.max_unlocked_intro_step = INTRO_STEP_COUNT;
      } else {
        state.current_intro_step = Math.max(legacyStep, 1);
        state.max_unlocked_intro_step = Math.max(legacyStep, 1);
      }
    } else if (!hasAnyIntroFields) {
      // Older non-START saves predate P00 and are treated as having passed the opening.
      state.intro_started = true;
      state.current_intro_step = INTRO_STEP_COUNT;
      state.max_unlocked_intro_step = INTRO_STEP_COUNT;
      state.intro_completed = true;
    } else if (state.intro_completed) {
      state.current_intro_step = INTRO_STEP_COUNT;
      state.max_unlocked_intro_step = INTRO_STEP_COUNT;
    } else if (state.intro_started) {
      state.current_intro_step = 1;
      state.max_unlocked_intro_step = 1;
    }
    return {
      state,
      incompatible: false
    };
  } catch {
    return { state: createInitialState(), incompatible: true };
  }
}

export function saveState(state: CaseState): void {
  const serial = ++saveSerial;
  void redactAuthorCode(state).then((safeState) => {
    if (serial !== saveSerial) return;
    try {
      localStorage.setItem(PLAYER_STATE_KEY, JSON.stringify(safeState));
    } catch {
      // The UI continues to run if storage is unavailable; the audit trail records local actions in memory.
    }
  });
}

export function clearSavedState(): void {
  localStorage.removeItem(PLAYER_STATE_KEY);
}
