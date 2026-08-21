import { ALL_STAGE_IDS, E032_ID, INTRO_STEP_COUNT, VIEW_FOR_STAGE, isReadingStage } from './constants';
import { audit } from './audit';
import { allTrialsCompleted, createInitialState, emptyEvidence, ensureEvidence, setStageStatus, stageIsCompleted } from './state';
import type { AppView, AuthorOverrideAction, CaseState, CompletionSource, EvidenceId, JudgeResult, StageId, StageStatus } from './types';

function now(): string {
  return new Date().toISOString();
}

function clampIntroStep(step: number, fallback: number): number {
  if (!Number.isFinite(step)) return fallback;
  return Math.min(Math.max(Math.trunc(step), 1), INTRO_STEP_COUNT);
}

function introProgress(state: CaseState): { currentStep: number; maxUnlockedStep: number } {
  const maxUnlockedStep = clampIntroStep(state.max_unlocked_intro_step, 1);
  const currentStep = Math.min(clampIntroStep(state.current_intro_step, 1), maxUnlockedStep);
  return { currentStep, maxUnlockedStep };
}

function stageIsEnterable(state: CaseState, id: StageId): boolean {
  const stage = state.stage_states[id];
  if (!stage || stage.status === 'LOCKED') return false;
  if (state.case_status === 'START') return false;
  if (id === 'G01' && !state.intro_completed) return false;
  if (id === 'F01' && state.case_status !== 'FINAL_UNLOCKED') return false;
  if (id === 'E030' && !stageIsCompleted(state, 'F03') && !state.stage_states.E030.status) return false;
  if (id === 'G07' && !allTrialsCompleted(state)) return false;
  if (id === 'F08' && !stageIsCompleted(state, 'F07')) return false;
  if (id === 'F09' && !stageIsCompleted(state, 'F08')) return false;
  return true;
}

export function enterStage(state: CaseState, id: StageId, view: AppView = VIEW_FOR_STAGE[id]): CaseState {
  if (!stageIsEnterable(state, id)) {
    return { ...state, current_view: 'blocked', last_feedback: { kind: 'INFO', message: '当前内容尚未开放。', stage_id: id, created_at: now() } };
  }

  let next = { ...state, current_stage: id, current_view: view };
  const existing = next.stage_states[id];
  if (existing.status === 'AVAILABLE') {
    next = {
      ...next,
      stage_states: {
        ...next.stage_states,
        [id]: { ...existing, status: 'IN_PROGRESS' }
      }
    };
  }
  if (id === 'F05') next = unlockEvidence(next, 'E031');
  if (id === 'F07') next = unlockEvidence(next, 'E034');
  if (id === 'F08') next = unlockEvidence(next, 'E033');
  return audit(next, 'stage_entered', 'PLAYER', { stage_id: id });
}

export function startCase(state: CaseState): CaseState {
  let next: CaseState = {
    ...state,
    case_status: 'IN_CASE',
    current_stage: 'G01',
    current_view: 'intro',
    intro_started: true,
    current_intro_step: 1,
    max_unlocked_intro_step: 1,
    intro_completed: false
  };
  return audit(next, 'intro_started', 'PLAYER', { stage_id: 'G01', object_id: 'P00' });
}

export function openIntroReview(state: CaseState): CaseState {
  if (state.case_status !== 'IN_CASE' || state.current_stage !== 'G01' || !state.intro_started || !state.intro_completed) return state;
  const next = { ...state, current_view: 'intro' as const };
  return audit(next, 'INTRO_REVIEW_OPENED', 'PLAYER', { stage_id: 'G01', object_id: 'P00' });
}

export function closeIntroReview(state: CaseState): CaseState {
  if (state.case_status !== 'IN_CASE' || state.current_stage !== 'G01' || !state.intro_started || !state.intro_completed || state.current_view !== 'intro') return state;
  const next = { ...state, current_view: 'case' as const };
  return audit(next, 'INTRO_REVIEW_CLOSED', 'PLAYER', { stage_id: 'G01', object_id: 'P00' });
}

export function continueIntro(state: CaseState): CaseState {
  if (state.case_status !== 'IN_CASE' || !state.intro_started || state.current_view !== 'intro') return state;
  const { currentStep, maxUnlockedStep } = introProgress(state);
  if (currentStep < maxUnlockedStep) {
    const next = { ...state, current_intro_step: currentStep + 1 };
    return audit(next, 'INTRO_STEP_VIEWED', 'PLAYER', { stage_id: 'G01', object_id: `P00_STEP_${currentStep + 1}` });
  }
  if (state.intro_completed) return state;
  if (currentStep < INTRO_STEP_COUNT) {
    const next = {
      ...state,
      current_intro_step: currentStep + 1,
      max_unlocked_intro_step: maxUnlockedStep + 1
    };
    return audit(next, 'INTRO_STEP_UNLOCKED', 'PLAYER', { stage_id: 'G01', object_id: `P00_STEP_${currentStep + 1}` });
  }
  let next: CaseState = {
    ...state,
    current_intro_step: INTRO_STEP_COUNT,
    max_unlocked_intro_step: INTRO_STEP_COUNT,
    intro_completed: true,
    current_stage: 'G01',
    current_view: 'case',
    stage_states: {
      ...state.stage_states,
      G01: { ...state.stage_states.G01, status: 'IN_PROGRESS' }
    }
  };
  next = audit(next, 'intro_completed', 'PLAYER', { stage_id: 'G01', object_id: 'P00' });
  return next;
}

export function previousIntro(state: CaseState): CaseState {
  if (state.case_status !== 'IN_CASE' || !state.intro_started || state.current_view !== 'intro') return state;
  const { currentStep } = introProgress(state);
  if (currentStep <= 1) return state;
  const next = { ...state, current_intro_step: currentStep - 1 };
  return audit(next, 'INTRO_STEP_VIEWED', 'PLAYER', { stage_id: 'G01', object_id: `P00_STEP_${currentStep - 1}` });
}

export function unlockEvidence(state: CaseState, id: EvidenceId): CaseState {
  let next = ensureEvidence(state, id, 'AVAILABLE');
  const before = next.evidence[id];
  if (before && before.availability === 'LOCKED') {
    next = {
      ...next,
      evidence: { ...next.evidence, [id]: { ...before, availability: 'AVAILABLE' } }
    };
  }
  if (!state.evidence[id] || state.evidence[id]?.availability === 'LOCKED') {
    next = audit(next, 'evidence_unlocked', 'SYSTEM', { object_id: id });
  }
  return next;
}

export function hostUnlockEvidence(state: CaseState, ids: EvidenceId[]): CaseState {
  let next = state;
  for (const id of ids) {
    if (!next.evidence[id] || next.evidence[id].availability === 'LOCKED') {
      next = unlockEvidence(next, id);
      next = audit(next, 'evidence_unlocked', 'HOST', { object_id: id, stage_id: state.current_stage });
    }
  }
  return next;
}

export function markEvidenceViewed(state: CaseState, id: EvidenceId, version = 'view_version_1'): CaseState {
  const record = state.evidence[id];
  if (!record) return state;
  let next: CaseState = {
    ...state,
    evidence: {
      ...state.evidence,
      [id]: {
        ...record,
        viewed: true,
        viewed_versions: record.viewed_versions.includes(version)
          ? record.viewed_versions
          : [...record.viewed_versions, version],
        current_view_version: record.current_view_version ?? version
      }
    }
  };
  return audit(next, 'evidence_viewed', 'PLAYER', {
    stage_id: state.current_stage,
    object_id: id,
    evidence_field_delta: { viewed: true, viewed_version: version }
  });
}

export function upgradeEvidenceView(state: CaseState, id: EvidenceId, version: string): CaseState {
  const record = state.evidence[id] ?? emptyEvidence(id, 'LOCKED');
  const next = {
    ...state,
    evidence: {
      ...state.evidence,
      [id]: { ...record, current_view_version: version }
    }
  };
  return audit(next, 'evidence_view_upgraded', 'SYSTEM', {
    stage_id: state.current_stage,
    object_id: id,
    evidence_field_delta: { current_view_version: version }
  });
}

export function markEvidenceUsed(state: CaseState, ids: EvidenceId[], stage: StageId = state.current_stage): CaseState {
  let next = state;
  for (const id of ids) {
    const record = next.evidence[id];
    if (!record || record.used_in_stages.includes(stage)) continue;
    next = {
      ...next,
      evidence: {
        ...next.evidence,
        [id]: { ...record, used_in_stages: [...record.used_in_stages, stage] }
      }
    };
    next = audit(next, 'evidence_used', 'PLAYER', {
      stage_id: stage,
      object_id: id,
      evidence_field_delta: { used_in_stages_append: stage }
    });
  }
  return next;
}

export function updateDraft(state: CaseState, stage: StageId, draft: Record<string, unknown>): CaseState {
  const current = state.stage_states[stage];
  if (!current || stageIsCompleted(state, stage)) return state;
  return {
    ...state,
    stage_states: {
      ...state.stage_states,
      [stage]: { ...current, draft: { ...current.draft, ...draft }, status: 'IN_PROGRESS' }
    }
  };
}

function setFeedback(state: CaseState, kind: JudgeResult['kind'], stage_id: StageId, message: string): CaseState {
  return { ...state, last_feedback: { kind, message, stage_id, created_at: now() } };
}

function completeStage(state: CaseState, id: StageId, by: 'PLAYER' | 'HOST', reason?: string): CaseState {
  const old = state.stage_states[id];
  const status: StageStatus = by === 'HOST' ? 'HOST_COMPLETED' : 'COMPLETED';
  let next: CaseState = {
    ...state,
    stage_states: {
      ...state.stage_states,
      [id]: {
        ...old,
        status,
        display_mode: 'NORMAL',
        completed_by: by,
        completion_source: by,
        completed_at: now(),
        host_override_reason: reason ?? old.host_override_reason
      }
    }
  };
  next = audit(next, 'stage_completed', by, {
    stage_id: id,
    from_stage_status: old.status,
    to_stage_status: status,
    host_override_reason: reason
  });
  return next;
}

function makeAvailable(state: CaseState, id: StageId): CaseState {
  const old = state.stage_states[id];
  if (!old || old.status !== 'LOCKED') return state;
  let next = setStageStatus(state, id, 'AVAILABLE');
  return audit(next, 'stage_available', 'SYSTEM', { stage_id: id, from_stage_status: old.status, to_stage_status: 'AVAILABLE' });
}

function completeReading(state: CaseState, id: 'C01' | 'C02' | 'C03' | 'C04', by: 'PLAYER' | 'HOST'): CaseState {
  const nextReading = { ...state.reading[id], completed: true, host_assisted: by === 'HOST' || state.reading[id].host_assisted };
  let next = { ...state, reading: { ...state.reading, [id]: nextReading } };
  next = completeStage(next, id, by);
  if (id === 'C01') {
    next = makeAvailable(next, 'G04');
    next = { ...next, current_stage: 'G04', current_view: 'case' };
  } else if (id === 'C02') {
    next = makeAvailable(next, 'G06');
    next = { ...next, current_stage: 'G06', current_view: 'case' };
  } else if (id === 'C03') {
    next = makeAvailable(next, 'T03');
    next = { ...next, current_stage: 'G06', current_view: 'case' };
  } else if (id === 'C04') {
    next = makeAvailable(next, 'T04');
    next = { ...next, current_stage: 'G06', current_view: 'case' };
  }
  return next;
}

function markCompletionSource(state: CaseState, id: StageId, source: CompletionSource): CaseState {
  const stage = state.stage_states[id];
  if (!stage) return state;
  return {
    ...state,
    stage_states: {
      ...state.stage_states,
      [id]: { ...stage, completion_source: source, host_override_reason: source === 'AUTHOR_CODE' ? 'AUTHOR_CODE' : stage.host_override_reason }
    }
  };
}

function recordAuthorOverride(state: CaseState, stage: StageId, action_type: AuthorOverrideAction): CaseState {
  const record = { stage_id: stage, timestamp: now(), action_type };
  let next: CaseState = {
    ...state,
    author_override_history: [...(state.author_override_history ?? []), record].slice(-200)
  };
  if (stageIsCompleted(next, stage)) next = markCompletionSource(next, stage, 'AUTHOR_CODE');
  next = audit(next, 'AUTHOR_OVERRIDE', 'HOST', { stage_id: stage, object_id: action_type, host_override_reason: 'AUTHOR_CODE' });
  if (action_type === 'STORY_OVERRIDE') {
    next = audit(next, 'AUTHOR_OVERRIDE_STORY', 'HOST', { stage_id: stage, object_id: action_type, host_override_reason: 'AUTHOR_CODE' });
  }
  return setFeedback(next, 'INFO', stage, '已通过当前步骤。');
}

function recordBlockedAuthorOverride(state: CaseState, stage: StageId): CaseState {
  return audit(state, 'AUTHOR_OVERRIDE_BLOCKED', 'HOST', { stage_id: stage, object_id: 'AUTHOR_CODE', host_override_reason: 'LOCKED_OR_COMPLETED' });
}

export function continueReading(state: CaseState, id: 'C01' | 'C02' | 'C03' | 'C04', total: number): CaseState {
  const reading = state.reading[id];
  if (reading.completed) {
    const returnStage: StageId = id === 'C01' ? 'G04' : 'G06';
    return { ...state, current_stage: returnStage, current_view: 'case' };
  }
  if (reading.current_paragraph >= total) return completeReading(state, id, 'PLAYER');
  const nextParagraph = reading.current_paragraph + 1;
  let next: CaseState = {
    ...state,
    reading: {
      ...state.reading,
      [id]: { ...reading, current_paragraph: nextParagraph, max_unlocked_paragraph: nextParagraph, last_exit_position: nextParagraph }
    }
  };
  return audit(next, 'story_paragraph', 'PLAYER', { stage_id: id });
}

export function completeReadingByHost(state: CaseState, id: 'C01' | 'C02' | 'C03' | 'C04', total: number): CaseState {
  let next = {
    ...state,
    reading: {
      ...state.reading,
      [id]: { ...state.reading[id], current_paragraph: total, max_unlocked_paragraph: total, last_exit_position: total }
    }
  };
  return completeReading(next, id, 'HOST');
}

export function applyAuthorOverride(state: CaseState, stage: StageId = state.current_stage): CaseState {
  if (state.case_status === 'CASE_TEMP_CLOSED') {
    if (stage !== state.current_stage) return recordBlockedAuthorOverride(state, stage);
    const next = openFinal(state);
    return next === state ? recordBlockedAuthorOverride(state, stage) : recordAuthorOverride(next, stage, 'FINAL_UNLOCK');
  }

  if (stage !== state.current_stage || !stageIsEnterable(state, stage)) return recordBlockedAuthorOverride(state, stage);
  const current = state.stage_states[stage];
  if (!current || current.status === 'LOCKED' || stageIsCompleted(state, stage)) return recordBlockedAuthorOverride(state, stage);

  if (isReadingStage(stage)) {
    const total = stage === 'C01' ? 11 : stage === 'C02' ? 9 : stage === 'C03' ? 9 : 10;
    let next = completeReadingByHost(state, stage, total);
    next = { ...next, reading: { ...next.reading, [stage]: { ...next.reading[stage], author_assisted: true } } };
    return recordAuthorOverride(next, stage, 'STORY_OVERRIDE');
  }

  if (stage === 'F08') {
    const currentRebuttal = Number(current.draft.current_rebuttal ?? 1);
    if (currentRebuttal <= 4) {
      const next = applyJudgeResult(state, stage, { kind: 'A', code: `F08_STEP${currentRebuttal}` }, { index: currentRebuttal }, 'HOST', 'AUTHOR_CODE');
      return recordAuthorOverride(next, stage, 'REBUTTAL_OVERRIDE');
    }
    const next = applyJudgeResult(state, stage, { kind: 'A', code: 'F08_PASS' }, { finalPattern: '[AUTHOR_CODE]' }, 'HOST', 'AUTHOR_CODE');
    return recordAuthorOverride(next, stage, 'STAGE_OVERRIDE');
  }

  if (stage === 'E030') {
    const next = applyJudgeResult(state, stage, { kind: 'A', code: 'E030_SOLVED' }, {}, 'HOST', 'AUTHOR_CODE');
    return recordAuthorOverride(next, stage, 'STAGE_OVERRIDE');
  }

  const next = hostCompleteCurrentStage(state, 'AUTHOR_CODE', 'AUTHOR_CODE');
  return next === state ? recordBlockedAuthorOverride(state, stage) : recordAuthorOverride(next, stage, 'STAGE_OVERRIDE');
}

function unlockOnEnter(next: CaseState, id: StageId): CaseState {
  let result = next;
  if (id === 'F05') result = unlockEvidence(result, 'E031');
  if (id === 'F07') result = unlockEvidence(result, 'E034');
  if (id === 'F08') result = unlockEvidence(result, 'E033');
  return result;
}

export function applyJudgeResult(state: CaseState, stage: StageId, result: JudgeResult, payload: Record<string, unknown>, by: 'PLAYER' | 'HOST' = 'PLAYER', reason?: string): CaseState {
  if (stage === 'G01' && !state.intro_completed) {
    return audit(state, 'BLOCKED_STAGE_BEFORE_INTRO', by, { stage_id: stage, object_id: 'P00' });
  }
  let next = state;
  if (result.code === 'G04_STEP1') {
    next = updateDraft(next, 'G04', { step: 2 });
    return setFeedback(next, 'INFO', 'G04', '这项事实是真的，但录音的形成时间和来源仍然没有确定。');
  }
  if (result.code.startsWith('F08_STEP')) {
    const index = Number(result.code.replace('F08_STEP', ''));
    next = updateDraft(next, 'F08', { completed_rebuttal: index, current_rebuttal: index + 1 });
    const evidence = typeof payload.evidenceId === 'string' ? [payload.evidenceId] : [];
    next = markEvidenceUsed(next, evidence, 'F08');
    return setFeedback(next, 'A', 'F08', '这条判断中的关系已经被拆开。');
  }
  if (result.code === 'E030_SOLVED') {
    next = updateDraft(next, 'E030', { solved: true });
    return setFeedback(next, 'A', 'E030', '词形异常已记录，并形成一个可选提示。');
  }
  if (result.kind !== 'A') {
    const message = result.kind === 'INFO' ? '当前操作条件还没有满足。' : ({ B: '你已经解释了其中一部分，但这条因果还没有闭合。', C: '现有材料不支持这个事实。', D: '这两件事都是真的，但你还没有证明它们之间存在这条线。', E: '当前材料不足以判断这一假设。', F: '这件证据确实重要，但它没有击穿当前这句话。', A: '推理成立。', INFO: '当前操作条件还没有满足。' } as const)[result.kind];
    return setFeedback(next, result.kind, stage, message);
  }

  switch (stage) {
    case 'G01':
      next = completeStage(next, stage, by, reason);
      next = makeAvailable(next, 'G02');
      next = { ...next, current_stage: 'G02', current_view: 'case' };
      next = setFeedback(next, 'A', stage, '推理成立。主持人可以继续开放下一条当前事实。');
      break;
    case 'G02':
      next = completeStage(next, stage, by, reason);
      next = unlockEvidence(next, 'E005');
      next = makeAvailable(next, 'G03');
      next = { ...next, current_stage: 'G03', current_view: 'case' };
      next = setFeedback(next, 'A', stage, '推理成立。现场调查已开放。');
      break;
    case 'G03':
      next = completeStage(next, stage, by, reason);
      for (const id of ['E011', 'E012', 'E013'] as EvidenceId[]) next = unlockEvidence(next, id);
      next = makeAvailable(next, 'C01');
      next = { ...next, current_stage: 'C01', current_view: 'reading' };
      next = setFeedback(next, 'A', stage, '推理成立。下一步是听完一段独立故事。');
      break;
    case 'G04':
      next = completeStage(next, stage, by, reason);
      for (const id of ['E014', 'E015', 'E016', 'E017', 'E018', 'E019', 'E020', 'E021'] as EvidenceId[]) next = unlockEvidence(next, id);
      next = makeAvailable(next, 'G05');
      next = { ...next, current_stage: 'G05', current_view: 'case' };
      next = setFeedback(next, 'A', stage, '推理成立。两段重复动作现在可以被放在一起比较。');
      break;
    case 'G05':
      next = completeStage(next, stage, by, reason);
      next = makeAvailable(next, 'C02');
      next = { ...next, current_stage: 'C02', current_view: 'reading' };
      next = setFeedback(next, 'A', stage, '推理成立。故事材料已开放。');
      break;
    case 'G06':
      next = completeStage(next, stage, by, reason);
      for (const id of ['E023', 'E024', 'E025', 'E026'] as EvidenceId[]) next = unlockEvidence(next, id);
      for (const id of ['C03', 'C04', 'T01', 'T02'] as StageId[]) next = makeAvailable(next, id);
      next = { ...next, current_stage: 'G06', current_view: 'case' };
      next = setFeedback(next, 'A', stage, '推理成立。第四章的证据争点已进入可选择区域。');
      break;
    case 'T01':
    case 'T02':
    case 'T03':
    case 'T04':
      next = completeStage(next, stage, by, reason);
      next = markEvidenceUsed(next, Array.isArray(payload.selectedEvidenceIds) ? payload.selectedEvidenceIds.filter((x): x is string => typeof x === 'string') : [], stage);
      if (allTrialsCompleted(next)) {
        next = unlockEvidence(next, 'E027');
        next = makeAvailable(next, 'G07');
        next = { ...next, current_stage: 'G07', current_view: 'case' };
      } else {
        next = { ...next, current_stage: 'G06', current_view: 'case' };
      }
      next = setFeedback(next, 'A', stage, '能证明：当前陈述只到事实层。不能证明：其中的等号已经成立。');
      break;
    case 'G07':
      next = completeStage(next, stage, by, reason);
      next = { ...next, case_status: 'CASE_TEMP_CLOSED', current_stage: 'G07', current_view: 'paused' };
      next = audit(next, 'case_temp_closed', by, { stage_id: 'G07' });
      next = setFeedback(next, 'A', stage, '我们只能证明到这里。');
      break;
    case 'F01':
      next = completeStage(next, stage, by, reason);
      next = unlockEvidence(next, 'E028');
      next = makeAvailable(next, 'F02');
      next = { ...next, current_stage: 'F02', current_view: 'endgame' };
      next = setFeedback(next, 'A', stage, '当前行为结论成立。接下来只检查这套机关是否造成了最终死亡。');
      break;
    case 'F02':
      next = completeStage(next, stage, by, reason);
      next = makeAvailable(next, 'F03');
      next = { ...next, current_stage: 'F03', current_view: 'endgame' };
      next = setFeedback(next, 'A', stage, '两项事实都保留：有杀意，且没有造成最终死亡。');
      break;
    case 'F03':
      next = completeStage(next, stage, by, reason);
      next = unlockEvidence(next, 'E029');
      next = unlockEvidence(next, 'E030');
      next = makeAvailable(next, 'E030');
      next = makeAvailable(next, 'F04');
      next = { ...next, current_stage: 'F04', current_view: 'endgame' };
      next = setFeedback(next, 'A', stage, '实施者确认。身份确认不等于案件解决。');
      break;
    case 'F04':
      next = completeStage(next, stage, by, reason);
      next = makeAvailable(next, 'F05');
      next = { ...next, current_stage: 'F05', current_view: 'endgame' };
      next = unlockOnEnter(next, 'F05');
      next = setFeedback(next, 'A', stage, '当天触发关系成立。现在进入三个空槽的手法推理。');
      break;
    case 'F05':
      next = completeStage(next, stage, by, reason);
      next = markEvidenceUsed(next, ['E031', 'E002'], 'F05');
      next = upgradeEvidenceView(next, 'E031', 'view_version_2');
      next = upgradeEvidenceView(next, 'E002', 'view_version_2');
      next = makeAvailable(next, 'F06');
      next = { ...next, current_stage: 'F06', current_view: 'endgame' };
      next = setFeedback(next, 'A', stage, '三段关系已经闭合。');
      break;
    case 'F06':
      next = completeStage(next, stage, by, reason);
      next = unlockEvidence(next, E032_ID);
      next = {
        ...next,
        evidence: {
          ...next.evidence,
          [E032_ID]: {
            ...(next.evidence[E032_ID] ?? emptyEvidence(E032_ID)),
            availability: 'AVAILABLE',
            is_output: true,
            output_source_stage: 'F06',
            current_view_version: 'view_version_1'
          }
        }
      };
      next = audit(next, 'e032_generated', by, { stage_id: 'F06', object_id: E032_ID });
      next = makeAvailable(next, 'F07');
      next = { ...next, current_stage: 'F07', current_view: 'endgame' };
      next = unlockOnEnter(next, 'F07');
      next = setFeedback(next, 'A', stage, '关系输出已生成，接下来是十三张时间线卡。');
      break;
    case 'F07':
      next = completeStage(next, stage, by, reason);
      next = markEvidenceUsed(next, ['E034'], 'F07');
      next = makeAvailable(next, 'F08');
      next = { ...next, current_stage: 'F08', current_view: 'endgame' };
      next = unlockOnEnter(next, 'F08');
      next = setFeedback(next, 'A', stage, '时间线成立。接下来逐条检查最后的判断。');
      break;
    case 'F08':
      next = completeStage(next, stage, by, reason);
      next = markEvidenceUsed(next, ['E033', 'E031', 'E006', 'E018'], 'F08');
      next = { ...next, f08_pattern_ready: true };
      next = makeAvailable(next, 'F09');
      next = { ...next, current_stage: 'F08', current_view: 'endgame' };
      next = setFeedback(next, 'A', stage, '四条反证已经完成。现在可以进入最终案件重构。');
      break;
    case 'F09':
      next = completeStage(next, stage, by, reason);
      next = markEvidenceUsed(next, ['E002', 'E007', 'E008', 'E026', 'E028', 'E029', 'E031', 'E032', 'E033', 'E034'], 'F09');
      next = { ...next, case_status: 'CASE_RECONSTRUCTED', final_timeline_ready: true, current_stage: 'F09', current_view: 'complete' };
      next = setFeedback(next, 'A', stage, '案件重构完成。');
      break;
    default:
      break;
  }
  return next;
}

export function markF08RebuttalDraft(state: CaseState, index: number, evidenceId: string, text: string): CaseState {
  return updateDraft(state, 'F08', { current_rebuttal: index, selected_evidence: evidenceId, rebuttal_text: text });
}

export function openFinal(state: CaseState): CaseState {
  if (state.case_status !== 'CASE_TEMP_CLOSED' || !stageIsCompleted(state, 'G07')) return state;
  let next: CaseState = {
    ...state,
    case_status: 'FINAL_UNLOCKED',
    final_unlocked_by: 'HOST',
    final_unlocked_at: now(),
    current_stage: 'F01',
    current_view: 'endgame',
    stage_states: {
      ...state.stage_states,
      F01: { ...state.stage_states.F01, status: 'AVAILABLE' }
    }
  };
  next = audit(next, 'final_unlocked', 'HOST', { stage_id: 'F01' });
  return next;
}

function hostCodeForStage(id: StageId): string | null {
  if (isReadingStage(id)) return `${id}_READ`;
  if (id === 'E030') return 'E030_SOLVED';
  if (id === 'F08') return 'F08_FORCE';
  return `${id}_PASS`;
}

export function hostCompleteCurrentStage(state: CaseState, reason = '主持人认可当前阶段操作', source: 'HOST' | 'AUTHOR_CODE' = 'HOST'): CaseState {
  const id = state.current_stage;
  const current = state.stage_states[id];
  if (!current || current.status === 'LOCKED' || state.case_status === 'CASE_TEMP_CLOSED') return state;
  if (id === 'G01' && !state.intro_completed) return state;
  if (isReadingStage(id)) {
    const total = id === 'C01' ? 11 : id === 'C02' ? 9 : id === 'C03' ? 9 : 10;
    const next = completeReadingByHost(state, id, total);
    return source === 'AUTHOR_CODE' ? markCompletionSource(next, id, source) : next;
  }
  if (id === 'F08') {
    let next: CaseState = { ...state, stage_states: { ...state.stage_states, F08: { ...current, draft: { ...current.draft, completed_rebuttal: 4, current_rebuttal: 5 } } } };
    next = applyJudgeResult(next, 'F08', { kind: 'A', code: 'F08_FORCE' }, {}, 'HOST', reason);
    if (source === 'AUTHOR_CODE') next = markCompletionSource(next, id, source);
    return next;
  }
  const code = hostCodeForStage(id);
  if (!code) return state;
  if (id === 'G07' && !allTrialsCompleted(state)) return state;
  const payload = state.stage_states[id].draft;
  let next = applyJudgeResult(state, id, { kind: 'A', code }, payload, 'HOST', reason);
  if (source === 'AUTHOR_CODE' && next !== state) next = markCompletionSource(next, id, source);
  return next;
}

export function resetCurrentStage(state: CaseState): CaseState {
  const id = state.current_stage;
  const current = state.stage_states[id];
  if (!current || stageIsCompleted(state, id)) return state;
  let next: CaseState = {
    ...state,
    stage_states: { ...state.stage_states, [id]: { ...current, draft: {}, status: current.status === 'AVAILABLE' ? 'AVAILABLE' : 'IN_PROGRESS' } }
  };
  if (isReadingStage(id)) {
    next = { ...next, reading: { ...next.reading, [id]: { current_paragraph: 1, max_unlocked_paragraph: 1, completed: false, host_assisted: false, last_exit_position: 1 } } };
  }
  if (id === 'F06' && !state.stage_states.F06.completed_at) {
    const e032 = next.evidence[E032_ID];
    if (e032?.is_output) next = { ...next, evidence: { ...next.evidence, [E032_ID]: emptyEvidence(E032_ID, 'LOCKED') } };
  }
  return audit(next, 'reset_current_stage', 'HOST', { stage_id: id });
}

export function recordSubmission(state: CaseState, stage: StageId, payload: Record<string, unknown>, ref: string): CaseState {
  const stageState = state.stage_states[stage];
  if (!stageState) return state;
  const record = { ref, created_at: now(), stage_id: stage, payload };
  let next: CaseState = {
    ...state,
    stage_states: {
      ...state.stage_states,
      [stage]: { ...stageState, status: 'SUBMITTABLE', submission_history: [...stageState.submission_history, record] }
    }
  };
  return audit(next, 'player_submission', 'PLAYER', { stage_id: stage, submission_ref: ref });
}

export function recordFeedback(state: CaseState, stage: StageId, ref: string, result: JudgeResult): CaseState {
  const stageState = state.stage_states[stage];
  if (!stageState) return state;
  const history = stageState.submission_history.map((entry) => entry.ref === ref ? { ...entry, feedback_type: result.kind, result_code: result.code } : entry);
  let next = { ...state, stage_states: { ...state.stage_states, [stage]: { ...stageState, submission_history: history, status: result.kind === 'A' ? stageState.status : 'IN_PROGRESS' } } };
  next = audit(next, 'feedback', 'SYSTEM', { stage_id: stage, feedback_type: result.kind, submission_ref: ref });
  return next;
}

export function updateReadingExit(state: CaseState, id: 'C01' | 'C02' | 'C03' | 'C04'): CaseState {
  const reading = state.reading[id];
  return { ...state, reading: { ...state.reading, [id]: { ...reading, last_exit_position: reading.current_paragraph } } };
}

export function hostOpenAllowedEvidence(state: CaseState): CaseState {
  if (state.current_view === 'intro') return state;
  const mapping: Partial<Record<StageId, EvidenceId[]>> = {
    G01: ['E003'],
    G02: ['E004'],
    G04: ['E012', 'E013'],
    G06: ['E016', 'E017', 'E018', 'E019', 'E020', 'E021', 'E022']
  };
  const ids = mapping[state.current_stage] ?? [];
  return hostUnlockEvidence(state, ids);
}

export function resetAllState(state: CaseState): CaseState {
  const oldLog = state.audit_log;
  let next = createInitialState();
  next = { ...next, audit_log: oldLog };
  return audit(next, 'reset_all_progress', 'HOST');
}
