import { describe, expect, it } from 'vitest';
import { FORCE_GATE_DEFINITION } from '../src/caseDesk/gates/caseGateDefinitions';
import {
  DEDUCTION_UNLOCK_SOURCE,
  getAvailableGateIds,
  READING_UNLOCK_SOURCE,
  reduceInvestigationFlow,
  resetProgress,
  resolveDeductionTitle
} from '../src/caseDesk/flow/InvestigationFlow';
import {
  assertValidFlowDefinition,
  PRODUCTION_FLOW
} from '../src/caseDesk/flow/flowDefinition';
import { CASE_DESK_SAVE_KEY, loadCaseDeskState, saveCaseDeskState } from '../src/caseDesk/persistence';
import { createInitialCaseState } from '../src/caseDesk/state';
import type { CaseState } from '../src/caseDesk/types';
import { resolveReadingChapterUnlock } from '../src/caseDesk/readingIndex';

function dispatch(state: CaseState, event: Parameters<typeof reduceInvestigationFlow>[1]): CaseState {
  return reduceInvestigationFlow(state, event);
}

function enterDesk(): CaseState {
  let state = dispatch(createInitialCaseState(), { type: 'START_CASE' });
  for (let index = 0; index < 6; index += 1) state = dispatch(state, { type: 'CONTINUE_INTRO' });
  return state;
}

function viewCurrentBatch(state: CaseState): CaseState {
  const ids = PRODUCTION_FLOW.investigationBatches[state.investigationBatch - 1] ?? [];
  return ids.reduce((next, contentId) => dispatch(next, { type: 'CONTENT_VIEWED', contentId }), state);
}

function reachTappingGate(): CaseState {
  let state = enterDesk();
  for (let index = 0; index < PRODUCTION_FLOW.investigationBatches.length; index += 1) {
    state = viewCurrentBatch(state);
    state = dispatch(state, { type: 'CONTINUE' });
  }
  return state;
}

describe('InvestigationFlow 状态与配置', () => {
  it('初始状态只在 INTRO，且没有可进入 Gate', () => {
    const state = createInitialCaseState();
    expect(state.currentPhase).toBe('INTRO');
    expect(state.flowVersion).toBe(1);
    expect(state.unlockedContentIds).toEqual([]);
    expect(getAvailableGateIds(state)).toEqual([]);
    expect(() => assertValidFlowDefinition(PRODUCTION_FLOW)).not.toThrow();
  });

  it('序后按配置发布 4 / 4 / 3 批材料，录音在嗒嗒 Gate 前可读且未阅读时不能推进', () => {
    let state = enterDesk();
    expect(state.currentPhase).toBe('CASE_INVESTIGATION');
    expect(state.investigationBatch).toBe(1);
    expect(state.unlockedContentIds).toEqual([...PRODUCTION_FLOW.investigationBatches[0]]);
    expect(state.unlockedContentIds).toContain('recording-old-treatment');

    const before = state;
    state = dispatch(state, { type: 'CONTINUE' });
    expect(state).toBe(before);
    state = viewCurrentBatch(state);
    state = dispatch(state, { type: 'CONTINUE' });
    expect(state.investigationBatch).toBe(2);
    expect(state.currentPhase).toBe('CASE_INVESTIGATION');
    expect(state.unlockedContentIds).toEqual(expect.arrayContaining(PRODUCTION_FLOW.investigationBatches[1]));
  });

  it('嗒嗒 solved 只记录事件，返回案件桌后才进入警察调查', () => {
    let state = reachTappingGate();
    expect(state.currentPhase).toBe('TAP_GATE');
    expect(getAvailableGateIds(state)).toEqual(['tapping']);
    state = dispatch(state, { type: 'GATE_SOLVED', gateId: 'tapping' });
    expect(state.currentPhase).toBe('TAP_GATE');
    expect(state.solvedGateIds).toEqual(['tapping']);
    state = dispatch(state, { type: 'RETURN_TO_DESK' });
    expect(state.currentPhase).toBe('POLICE_INVESTIGATION');
    expect(getAvailableGateIds(state)).toEqual(['force']);
    expect(state.unlockedContentIds).toEqual(expect.arrayContaining(PRODUCTION_FLOW.policeInvestigationContentIds));
    expect(state.unlockedContentIds).toContain('zhenhua-investigation-initial');
  });

  it('Force 按 0 / 4 到 4 / 4 累积，重复 Force 不增加状态', () => {
    let state = dispatch(reachTappingGate(), { type: 'GATE_SOLVED', gateId: 'tapping' });
    state = dispatch(state, { type: 'RETURN_TO_DESK' });
    state = dispatch(state, { type: 'ENTER_GATE', gateId: 'force' });
    expect(state.currentPhase).toBe('FORCE_GATE');
    for (const force of FORCE_GATE_DEFINITION.standardSets ?? []) state = dispatch(state, { type: 'FORCE_SOLVED', forceId: force.forceId });
    expect(state.solvedForceIds).toHaveLength(4);
    const solved = state;
    state = dispatch(state, { type: 'FORCE_SOLVED', forceId: FORCE_GATE_DEFINITION.standardSets?.[0]?.forceId ?? '' });
    expect(state).toBe(solved);
    state = dispatch(state, { type: 'GATE_SOLVED', gateId: 'force' });
    expect(state.solvedGateIds).toEqual(['tapping', 'force']);
    state = dispatch(state, { type: 'RETURN_TO_DESK' });
    expect(state.currentPhase).toBe('DEDUCTION_PHASE');
    expect(getAvailableGateIds(state)).toEqual(['final']);
  });

  it('四篇虚构推理均支持正式标题与书名号归一化，错误标题和空输入不命中', () => {
    const expected = [
      ['磁带传音', 'story-letter'],
      ['往日重现', 'story-question'],
      ['无字情书', 'story-silent-letter'],
      ['蛇选新娘', 'story-snake-bride']
    ] as const;
    const state = dispatch(dispatch(reachTappingGate(), { type: 'GATE_SOLVED', gateId: 'tapping' }), { type: 'RETURN_TO_DESK' });
    for (const [title, deductionId] of expected) {
      expect(resolveDeductionTitle(state, title)).toEqual({ deductionId, alreadyUnlocked: false });
      expect(resolveDeductionTitle(state, `《${title}》`)).toEqual({ deductionId, alreadyUnlocked: false });
    }
    expect(resolveDeductionTitle(state, '蛇选新郎')).toBeNull();
    expect(resolveDeductionTitle(state, '')).toBeNull();
    expect(resolveDeductionTitle(state, '《》')).toBeNull();
  });

  it('虚构推理标题精确解锁且重复输入不创建第二份记录', () => {
    let state = dispatch(dispatch(reachTappingGate(), { type: 'GATE_SOLVED', gateId: 'tapping' }), { type: 'RETURN_TO_DESK' });
    state = dispatch(state, { type: 'ENTER_GATE', gateId: 'force' });
    for (const force of FORCE_GATE_DEFINITION.standardSets ?? []) state = dispatch(state, { type: 'FORCE_SOLVED', forceId: force.forceId });
    state = dispatch(dispatch(state, { type: 'GATE_SOLVED', gateId: 'force' }), { type: 'RETURN_TO_DESK' });

    const match = resolveDeductionTitle(state, '《磁带传音》');
    expect(match).toEqual({ deductionId: 'story-letter', alreadyUnlocked: false });
    expect(resolveDeductionTitle(state, '  “磁带传音”  ')).toEqual({ deductionId: 'story-letter', alreadyUnlocked: false });
    state = dispatch(state, { type: 'DEDUCTION_UNLOCKED', deductionId: match?.deductionId ?? '', source: DEDUCTION_UNLOCK_SOURCE });
    expect(resolveDeductionTitle(state, '磁带传音')).toEqual({ deductionId: 'story-letter', alreadyUnlocked: true });
    const duplicate = dispatch(state, { type: 'DEDUCTION_UNLOCKED', deductionId: 'story-letter', source: DEDUCTION_UNLOCK_SOURCE });
    expect(duplicate).toBe(state);
  });

  it('一次搜索只解锁对应的一篇虚构推理，并可持久化回读', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
      removeItem: (key: string) => { values.delete(key); }
    };
    const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: storage } });

    try {
      let state = dispatch(dispatch(reachTappingGate(), { type: 'GATE_SOLVED', gateId: 'tapping' }), { type: 'RETURN_TO_DESK' });
      const match = resolveDeductionTitle(state, '蛇选新娘');
      expect(match?.deductionId).toBe('story-snake-bride');
      state = dispatch(state, { type: 'DEDUCTION_UNLOCKED', deductionId: match?.deductionId ?? '', source: DEDUCTION_UNLOCK_SOURCE });
      expect(state.unlockedDeductionIds).toEqual(['story-snake-bride']);
      saveCaseDeskState(state);
      expect(loadCaseDeskState().state.unlockedDeductionIds).toEqual(['story-snake-bride']);
    } finally {
      if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow);
      else delete (globalThis as { window?: unknown }).window;
    }
  });

  it('推理解锁事件只要求正式搜索来源，不依赖 Gate、阶段或界面状态', () => {
    const state = createInitialCaseState();
    const withoutSearch = dispatch(state, { type: 'DEDUCTION_UNLOCKED', deductionId: 'story-letter' } as never);
    expect(withoutSearch).toBe(state);

    const afterSearch = dispatch(state, { type: 'DEDUCTION_UNLOCKED', deductionId: 'story-letter', source: DEDUCTION_UNLOCK_SOURCE });
    expect(afterSearch.unlockedDeductionIds).toEqual(['story-letter']);

    const stateVariants = [
      { screen: 'START' as const, currentPhase: 'INTRO' as const },
      { screen: 'DESK' as const, currentPhase: 'CASE_INVESTIGATION' as const },
      { screen: 'DESK' as const, currentPhase: 'TAP_GATE' as const },
      { screen: 'DESK' as const, currentPhase: 'POLICE_INVESTIGATION' as const },
      { screen: 'DESK' as const, currentPhase: 'FORCE_GATE' as const },
      { screen: 'DESK' as const, currentPhase: 'DEDUCTION_PHASE' as const },
      { screen: 'DESK' as const, currentPhase: 'FINAL_GATE' as const },
      { screen: 'DESK' as const, currentPhase: 'TERMINAL_REVEAL' as const },
      { screen: 'ENDING' as const, currentPhase: 'COMPLETE' as const }
    ];
    stateVariants.forEach(({ screen, currentPhase }, index) => {
      const deductionId = PRODUCTION_FLOW.fictionalDeductionIds[index % PRODUCTION_FLOW.fictionalDeductionIds.length];
      const unlocked = dispatch(
        { ...state, screen, currentPhase },
        { type: 'DEDUCTION_UNLOCKED', deductionId, source: DEDUCTION_UNLOCK_SOURCE }
      );
      expect(unlocked.unlockedDeductionIds).toContain(deductionId);
    });
  });

  it('Final Gate 后进入阅读主页，玲与枫独立打开且完成不自动推进', () => {
    let state = dispatch(dispatch(reachTappingGate(), { type: 'GATE_SOLVED', gateId: 'tapping' }), { type: 'RETURN_TO_DESK' });
    state = dispatch(state, { type: 'ENTER_GATE', gateId: 'force' });
    for (const force of FORCE_GATE_DEFINITION.standardSets ?? []) state = dispatch(state, { type: 'FORCE_SOLVED', forceId: force.forceId });
    state = dispatch(dispatch(state, { type: 'GATE_SOLVED', gateId: 'force' }), { type: 'RETURN_TO_DESK' });
    state = dispatch(state, { type: 'ENTER_GATE', gateId: 'final' });
    state = dispatch(state, { type: 'GATE_SOLVED', gateId: 'final' });
    state = dispatch(state, { type: 'RETURN_TO_DESK' });
    expect(state.currentPhase).toBe('TERMINAL_REVEAL');
    expect(state.terminalProgress).toBeNull();
    expect(state.unlockedContentIds).toEqual(expect.arrayContaining(['novel-ling', 'novel-feng']));
    expect(state.unlockedContentIds).not.toContain('novel-cheng');

    state = dispatch(state, { type: 'OPEN_READING_CHAPTER', chapterId: 'novel-ling' });
    state = dispatch(state, { type: 'READING_PAGE_CHANGED', chapterId: 'novel-ling', pageIndex: 4, totalPages: 6 });
    expect(state.terminalProgress).toEqual({ chapterId: 'novel-ling', pageIndex: 4 });
    state = dispatch(state, { type: 'READING_PAGE_CHANGED', chapterId: 'novel-ling', pageIndex: 5, totalPages: 6 });
    state = dispatch(state, { type: 'READING_CHAPTER_COMPLETED', chapterId: 'novel-ling', pageIndex: 5, totalPages: 6 });
    expect(state.terminalProgress).toEqual({ chapterId: 'novel-ling', pageIndex: 5 });
    expect(state.completedTerminalIds).toEqual(['novel-ling']);

    state = dispatch(state, { type: 'OPEN_READING_CHAPTER', chapterId: 'novel-feng' });
    expect(state.terminalProgress).toEqual({ chapterId: 'novel-feng', pageIndex: 0 });
    state = dispatch(state, { type: 'READING_PAGE_CHANGED', chapterId: 'novel-feng', pageIndex: 6, totalPages: 7 });
    state = dispatch(state, { type: 'READING_CHAPTER_COMPLETED', chapterId: 'novel-feng', pageIndex: 6, totalPages: 7 });
    expect(state.currentPhase).toBe('TERMINAL_REVEAL');
    expect(state.completedTerminalIds).toEqual(['novel-ling', 'novel-feng']);
    expect(dispatch(state, { type: 'OPEN_READING_CHAPTER', chapterId: 'novel-cheng' })).toBe(state);
  });

  it('岚之死完成后进入可持久化的 Ending screen，不能提前跳入', () => {
    let state = dispatch(dispatch(reachTappingGate(), { type: 'GATE_SOLVED', gateId: 'tapping' }), { type: 'RETURN_TO_DESK' });
    state = dispatch(state, { type: 'ENTER_GATE', gateId: 'force' });
    for (const force of FORCE_GATE_DEFINITION.standardSets ?? []) state = dispatch(state, { type: 'FORCE_SOLVED', forceId: force.forceId });
    state = dispatch(dispatch(state, { type: 'GATE_SOLVED', gateId: 'force' }), { type: 'RETURN_TO_DESK' });
    state = dispatch(state, { type: 'ENTER_GATE', gateId: 'final' });
    state = dispatch(dispatch(state, { type: 'GATE_SOLVED', gateId: 'final' }), { type: 'RETURN_TO_DESK' });
    state = dispatch(state, { type: 'READING_CHAPTER_UNLOCKED', chapterId: 'lan-death', source: READING_UNLOCK_SOURCE });
    state = dispatch(state, { type: 'OPEN_READING_CHAPTER', chapterId: 'lan-death' });

    const beforeCompletion = state;
    expect(dispatch(state, { type: 'ENTER_FINAL_ENDING', chapterId: 'lan-death', pageIndex: 0, totalPages: 1 })).toBe(beforeCompletion);

    state = dispatch(state, { type: 'READING_PAGE_CHANGED', chapterId: 'lan-death', pageIndex: 0, totalPages: 1 });
    state = dispatch(state, { type: 'READING_CHAPTER_COMPLETED', chapterId: 'lan-death', pageIndex: 0, totalPages: 1 });
    state = dispatch(state, { type: 'ENTER_FINAL_ENDING', chapterId: 'lan-death', pageIndex: 0, totalPages: 1 });
    expect(state.screen).toBe('ENDING');
    expect(state.currentPhase).toBe('COMPLETE');
    expect(state.finished).toBe(true);
  });

  it('阅读正文不能跳页完成，已读章节可以反复回看且不触发串联', () => {
    let state = dispatch(dispatch(reachTappingGate(), { type: 'GATE_SOLVED', gateId: 'tapping' }), { type: 'RETURN_TO_DESK' });
    state = dispatch(state, { type: 'ENTER_GATE', gateId: 'force' });
    for (const force of FORCE_GATE_DEFINITION.standardSets ?? []) state = dispatch(state, { type: 'FORCE_SOLVED', forceId: force.forceId });
    state = dispatch(dispatch(state, { type: 'GATE_SOLVED', gateId: 'force' }), { type: 'RETURN_TO_DESK' });
    state = dispatch(state, { type: 'ENTER_GATE', gateId: 'final' });
    state = dispatch(dispatch(state, { type: 'GATE_SOLVED', gateId: 'final' }), { type: 'RETURN_TO_DESK' });

    const beforeSkip = state;
    state = dispatch(state, { type: 'READING_CHAPTER_COMPLETED', chapterId: 'novel-ling', pageIndex: 5, totalPages: 6 });
    expect(state).toBe(beforeSkip);

    state = dispatch(state, { type: 'OPEN_READING_CHAPTER', chapterId: 'novel-ling' });
    state = dispatch(state, { type: 'READING_PAGE_CHANGED', chapterId: 'novel-ling', pageIndex: 5, totalPages: 6 });
    state = dispatch(state, { type: 'READING_CHAPTER_COMPLETED', chapterId: 'novel-ling', pageIndex: 5, totalPages: 6 });
    expect(state.terminalProgress).toEqual({ chapterId: 'novel-ling', pageIndex: 5 });

    state = dispatch(state, { type: 'OPEN_READING_CHAPTER', chapterId: 'novel-ling' });
    state = dispatch(state, { type: 'READING_PAGE_CHANGED', chapterId: 'novel-ling', pageIndex: 5, totalPages: 6 });
    const reread = state;
    state = dispatch(state, { type: 'READING_CHAPTER_COMPLETED', chapterId: 'novel-ling', pageIndex: 5, totalPages: 6 });
    expect(state.currentPhase).toBe('TERMINAL_REVEAL');
    expect(state.terminalProgress).toEqual({ chapterId: 'novel-ling', pageIndex: 5 });
    expect(state.completedTerminalIds).toEqual(['novel-ling']);
    expect(state).toBe(reread);
  });

  it('玲与枫没有前置顺序，岚旧整章不能被直接打开', () => {
    let state = dispatch(dispatch(reachTappingGate(), { type: 'GATE_SOLVED', gateId: 'tapping' }), { type: 'RETURN_TO_DESK' });
    state = dispatch(state, { type: 'ENTER_GATE', gateId: 'force' });
    for (const force of FORCE_GATE_DEFINITION.standardSets ?? []) state = dispatch(state, { type: 'FORCE_SOLVED', forceId: force.forceId });
    state = dispatch(dispatch(state, { type: 'GATE_SOLVED', gateId: 'force' }), { type: 'RETURN_TO_DESK' });
    state = dispatch(state, { type: 'ENTER_GATE', gateId: 'final' });
    state = dispatch(dispatch(state, { type: 'GATE_SOLVED', gateId: 'final' }), { type: 'RETURN_TO_DESK' });

    expect(dispatch(state, { type: 'OPEN_READING_CHAPTER', chapterId: 'novel-feng' }).terminalProgress).toEqual({ chapterId: 'novel-feng', pageIndex: 0 });
    expect(dispatch(state, { type: 'OPEN_READING_CHAPTER', chapterId: 'novel-ling' }).terminalProgress).toEqual({ chapterId: 'novel-ling', pageIndex: 0 });
    expect(dispatch(state, { type: 'OPEN_READING_CHAPTER', chapterId: 'novel-cheng' })).toBe(state);
  });

  it('阅读 resolver 使用临时规则逐条、非线性匹配，生产规则不携带虚构关键词', () => {
    const rules = [
      { chapterId: 'lan-past', title: '测试 A', keywords: ['信息 A'], aliases: ['A'] },
      { chapterId: 'lan-and-zheng', title: '测试 B', keywords: ['信息 B'], aliases: ['B'] },
      { chapterId: 'lan-death', title: '测试 C', keywords: ['信息 C'], aliases: ['C'] }
    ] as const;
    expect(resolveReadingChapterUnlock('信息 A', rules)).toBe('lan-past');
    expect(resolveReadingChapterUnlock('C', rules)).toBe('lan-death');
    expect(resolveReadingChapterUnlock('岚')).toBeNull();
    expect(resolveReadingChapterUnlock('《蛇咬》')).toBe('lan-snakebite');
    expect(resolveDeductionTitle(createInitialCaseState(), '蛇咬')).toBeNull();

    let state = dispatch(dispatch(reachTappingGate(), { type: 'GATE_SOLVED', gateId: 'tapping' }), { type: 'RETURN_TO_DESK' });
    state = dispatch(state, { type: 'ENTER_GATE', gateId: 'force' });
    for (const force of FORCE_GATE_DEFINITION.standardSets ?? []) state = dispatch(state, { type: 'FORCE_SOLVED', forceId: force.forceId });
    state = dispatch(dispatch(state, { type: 'GATE_SOLVED', gateId: 'force' }), { type: 'RETURN_TO_DESK' });
    state = dispatch(state, { type: 'ENTER_GATE', gateId: 'final' });
    state = dispatch(dispatch(state, { type: 'GATE_SOLVED', gateId: 'final' }), { type: 'RETURN_TO_DESK' });
    const beforeReadingSearch = state;
    expect(dispatch(state, { type: 'READING_CHAPTER_UNLOCKED', chapterId: 'lan-past', source: DEDUCTION_UNLOCK_SOURCE } as never)).toBe(beforeReadingSearch);
    state = dispatch(state, { type: 'READING_CHAPTER_UNLOCKED', chapterId: 'lan-death', source: READING_UNLOCK_SOURCE });
    expect(state.unlockedReadingChapterIds).toEqual(['lan-death']);
    state = dispatch(state, { type: 'READING_CHAPTER_UNLOCKED', chapterId: 'lan-past', source: READING_UNLOCK_SOURCE });
    expect(state.unlockedReadingChapterIds).toEqual(['lan-death', 'lan-past']);
    expect(dispatch(state, { type: 'READING_CHAPTER_UNLOCKED', chapterId: 'lan-death', source: READING_UNLOCK_SOURCE })).toBe(state);
  });

  it('只解锁蛇咬时不需要前置章节，阅读完成也不解锁下一章', () => {
    let state = dispatch(dispatch(reachTappingGate(), { type: 'GATE_SOLVED', gateId: 'tapping' }), { type: 'RETURN_TO_DESK' });
    state = dispatch(state, { type: 'ENTER_GATE', gateId: 'force' });
    for (const force of FORCE_GATE_DEFINITION.standardSets ?? []) state = dispatch(state, { type: 'FORCE_SOLVED', forceId: force.forceId });
    state = dispatch(dispatch(state, { type: 'GATE_SOLVED', gateId: 'force' }), { type: 'RETURN_TO_DESK' });
    state = dispatch(state, { type: 'ENTER_GATE', gateId: 'final' });
    state = dispatch(dispatch(state, { type: 'GATE_SOLVED', gateId: 'final' }), { type: 'RETURN_TO_DESK' });
    state = dispatch(state, { type: 'READING_CHAPTER_UNLOCKED', chapterId: 'lan-snakebite', source: READING_UNLOCK_SOURCE });
    expect(state.unlockedReadingChapterIds).toEqual(['lan-snakebite']);
    expect(dispatch(state, { type: 'OPEN_READING_CHAPTER', chapterId: 'lan-past' })).toBe(state);

    state = dispatch(state, { type: 'OPEN_READING_CHAPTER', chapterId: 'lan-snakebite' });
    state = dispatch(state, { type: 'READING_CHAPTER_COMPLETED', chapterId: 'lan-snakebite', pageIndex: 0, totalPages: 1 });
    expect(state.completedTerminalIds).toEqual(['lan-snakebite']);
    expect(state.unlockedReadingChapterIds).toEqual(['lan-snakebite']);
    expect(state.terminalProgress).toEqual({ chapterId: 'lan-snakebite', pageIndex: 0 });
  });

  it('没有完成 Final Gate 时，异常 terminal 状态不能打开、翻页或完成终盘', () => {
    let base = dispatch(reachTappingGate(), { type: 'GATE_SOLVED', gateId: 'tapping' });
    base = dispatch(base, { type: 'RETURN_TO_DESK' });
    base = dispatch(base, { type: 'ENTER_GATE', gateId: 'force' });
    for (const force of FORCE_GATE_DEFINITION.standardSets ?? []) base = dispatch(base, { type: 'FORCE_SOLVED', forceId: force.forceId });
    base = dispatch(base, { type: 'GATE_SOLVED', gateId: 'force' });
    base = dispatch(base, { type: 'RETURN_TO_DESK' });
    const invalid = {
      ...base,
      currentPhase: 'TERMINAL_REVEAL' as const,
      unlockedContentIds: [...base.unlockedContentIds, 'novel-ling'],
      terminalProgress: { chapterId: 'novel-ling', pageIndex: 0 }
    };

    expect(dispatch(invalid, { type: 'OPEN_READING_CHAPTER', chapterId: 'novel-ling' })).toBe(invalid);
    expect(dispatch(invalid, { type: 'READING_PAGE_CHANGED', chapterId: 'novel-ling', pageIndex: 5, totalPages: 6 })).toBe(invalid);
    expect(dispatch(invalid, { type: 'READING_CHAPTER_COMPLETED', chapterId: 'novel-ling', pageIndex: 5, totalPages: 6 })).toBe(invalid);

    const repaired = dispatch(invalid, { type: 'RETURN_TO_DESK' });
    expect(repaired.currentPhase).toBe('DEDUCTION_PHASE');
    expect(repaired.terminalProgress).toBeNull();
    expect(repaired.unlockedContentIds).not.toContain('novel-ling');
  });

  it('resetProgress 清理流程、Gate、Force、推理和终盘进度', () => {
    let state = reachTappingGate();
    state = dispatch(state, { type: 'GATE_SOLVED', gateId: 'tapping' });
    const reset = resetProgress(state);
    expect(reset.currentPhase).toBe('INTRO');
    expect(reset.screen).toBe('START');
    expect(reset.unlockedContentIds).toEqual([]);
    expect(reset.solvedGateIds).toEqual([]);
    expect(reset.solvedForceIds).toEqual([]);
    expect(reset.unlockedDeductionIds).toEqual([]);
    expect(reset.terminalProgress).toBeNull();
  });

  it('persistence 恢复 flowVersion、Gate、Force、终盘页码，并拒绝未来版本', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
      removeItem: (key: string) => { values.delete(key); }
    };
    const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: storage } });

    try {
      let state = dispatch(dispatch(reachTappingGate(), { type: 'GATE_SOLVED', gateId: 'tapping' }), { type: 'RETURN_TO_DESK' });
      state = dispatch(state, { type: 'ENTER_GATE', gateId: 'force' });
      for (const force of FORCE_GATE_DEFINITION.standardSets ?? []) state = dispatch(state, { type: 'FORCE_SOLVED', forceId: force.forceId });
      state = dispatch(dispatch(state, { type: 'GATE_SOLVED', gateId: 'force' }), { type: 'RETURN_TO_DESK' });
      state = dispatch(state, { type: 'ENTER_GATE', gateId: 'final' });
      state = dispatch(dispatch(state, { type: 'GATE_SOLVED', gateId: 'final' }), { type: 'RETURN_TO_DESK' });
      state = dispatch(state, { type: 'READING_CHAPTER_UNLOCKED', chapterId: 'lan-past', source: READING_UNLOCK_SOURCE });
      state = dispatch(state, { type: 'OPEN_READING_CHAPTER', chapterId: 'novel-ling' });
      state = dispatch(state, { type: 'READING_PAGE_CHANGED', chapterId: 'novel-ling', pageIndex: 4, totalPages: 6 });
      saveCaseDeskState(state);
      const restored = loadCaseDeskState();
      expect(restored.incompatible).toBe(false);
      expect(restored.state.flowVersion).toBe(1);
      expect(restored.state.currentPhase).toBe('TERMINAL_REVEAL');
      expect(restored.state.solvedGateIds).toEqual(['tapping', 'force', 'final']);
      expect(restored.state.solvedForceIds).toHaveLength(4);
      expect(restored.state.unlockedReadingChapterIds).toEqual(['lan-past']);
      expect(restored.state.terminalProgress).toEqual({ chapterId: 'novel-ling', pageIndex: 4 });

      saveCaseDeskState({ ...state, screen: 'ENDING', currentPhase: 'COMPLETE' });
      expect(loadCaseDeskState().state.screen).toBe('ENDING');

      values.delete('si_case_desk_state_v6');
      values.set('si_case_desk_state_v5', JSON.stringify({ save_version: 5, flowVersion: 2 }));
      expect(loadCaseDeskState().incompatible).toBe(true);
    } finally {
      if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow);
      else delete (globalThis as { window?: unknown }).window;
    }
  });

  it('旧线性终盘保存迁移到阅读主页，不恢复整章岚 reader', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
      removeItem: (key: string) => { values.delete(key); }
    };
    const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: storage } });

    try {
      const legacy = {
        ...createInitialCaseState(),
        save_version: 5,
        flowVersion: 1,
        screen: 'DESK' as const,
        currentPhase: 'COMPLETE' as const,
        solvedGateIds: ['tapping', 'force', 'final'] as const,
        unlockedContentIds: ['novel-ling', 'novel-feng', 'novel-cheng'],
        openedContentIds: ['novel-ling', 'novel-feng', 'novel-cheng'],
        terminalProgress: { chapterId: 'novel-cheng', pageIndex: 0 },
        completedTerminalIds: ['novel-ling', 'novel-feng', 'novel-cheng']
      };
      values.set('si_case_desk_state_v5', JSON.stringify(legacy));

      const restored = loadCaseDeskState();
      expect(restored.incompatible).toBe(false);
      expect(restored.state.currentPhase).toBe('COMPLETE');
      expect(restored.state.terminalProgress).toBeNull();
      expect(restored.state.unlockedContentIds).toEqual(expect.arrayContaining(['novel-ling', 'novel-feng']));
      expect(restored.state.unlockedContentIds).not.toContain('novel-cheng');
      expect(restored.state.completedTerminalIds).toEqual(['novel-ling', 'novel-feng']);
    } finally {
      if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow);
      else delete (globalThis as { window?: unknown }).window;
    }
  });

  it('旧 lan / terminal 标记不会一键解锁七章，但新的逐章集合会完整保留', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
      removeItem: (key: string) => { values.delete(key); }
    };
    const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: storage } });

    try {
      const legacyFlags = {
        ...createInitialCaseState(),
        save_version: 5,
        flowVersion: 1,
        screen: 'DESK' as const,
        currentPhase: 'COMPLETE' as const,
        solvedGateIds: ['tapping', 'force', 'final'] as const,
        unlockedContentIds: ['novel-ling', 'novel-feng', 'novel-cheng'],
        lanUnlocked: true,
        terminalUnlocked: true,
        lanComplete: true,
        terminalReaderOpen: true,
        historyView: 'terminal',
        activeReadingId: 'novel-cheng'
      };
      values.set('si_case_desk_state_v5', JSON.stringify(legacyFlags));

      const oldOnly = loadCaseDeskState();
      expect(oldOnly.state.unlockedReadingChapterIds).toEqual([]);
      expect(oldOnly.state.unlockedContentIds).not.toContain('novel-cheng');
      expect(oldOnly.state.terminalProgress).toBeNull();
      const migratedOld = JSON.parse(values.get(CASE_DESK_SAVE_KEY) ?? '{}');
      expect(migratedOld.lanUnlocked).toBeUndefined();
      expect(migratedOld.terminalReaderOpen).toBeUndefined();

      values.delete(CASE_DESK_SAVE_KEY);
      const legalNewProgress = {
        ...legacyFlags,
        unlockedReadingChapterIds: ['lan-past', 'lan-meets-feng', 'lan-snakebite'],
        unlockedContentIds: ['novel-ling', 'novel-feng', 'lan-past', 'lan-meets-feng', 'lan-snakebite'],
        openedContentIds: ['lan-past', 'lan-meets-feng', 'lan-snakebite'],
        completedTerminalIds: ['lan-past', 'lan-meets-feng', 'lan-snakebite'],
        terminalProgress: { chapterId: 'lan-snakebite', pageIndex: 0 },
        activeReadingId: 'lan-snakebite'
      };
      values.set('si_case_desk_state_v5', JSON.stringify(legalNewProgress));

      const withNewProgress = loadCaseDeskState();
      expect(withNewProgress.state.unlockedReadingChapterIds).toEqual(['lan-past', 'lan-first-meeting', 'lan-snakebite']);
      expect(withNewProgress.state.completedTerminalIds).toEqual(['lan-past', 'lan-first-meeting', 'lan-snakebite']);
      expect(withNewProgress.state.terminalProgress).toEqual({ chapterId: 'lan-snakebite', pageIndex: 0 });
    } finally {
      if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow);
      else delete (globalThis as { window?: unknown }).window;
    }
  });

  it('旧 opened_story_ids 或 openedContentIds 不能反推推理已解锁', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
      removeItem: (key: string) => { values.delete(key); }
    };
    const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: storage } });

    try {
      const legacyOpened = {
        ...createInitialCaseState(),
        save_version: 5,
        flowVersion: 1,
        screen: 'DESK' as const,
        currentPhase: 'DEDUCTION_PHASE' as const,
        solvedGateIds: ['tapping', 'force'] as const,
        unlockedContentIds: [...PRODUCTION_FLOW.investigationBatches.flat(), 'story-letter'],
        viewedContentIds: ['story-letter'],
        openedContentIds: ['story-letter'],
        opened_story_ids: ['story-letter']
      };
      values.set('si_case_desk_state_v5', JSON.stringify(legacyOpened));

      const restored = loadCaseDeskState();
      expect(restored.state.unlockedDeductionIds).toEqual([]);
      expect(restored.state.unlockedContentIds).not.toContain('story-letter');
      expect(restored.state.viewedContentIds).not.toContain('story-letter');
      expect(restored.state.openedContentIds).not.toContain('story-letter');
    } finally {
      if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow);
      else delete (globalThis as { window?: unknown }).window;
    }
  });

  it('持久化中的 terminal/history 残留没有 Final Gate 时回落到案件桌且保留其他进度', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
      removeItem: (key: string) => { values.delete(key); }
    };
    const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: storage } });

    try {
      const base = createInitialCaseState();
      const invalid = {
        ...base,
        save_version: 5,
        flowVersion: 1,
        screen: 'DESK' as const,
        currentPhase: 'COMPLETE' as const,
        solvedGateIds: ['tapping', 'force'] as const,
        solvedForceIds: ['F1_PHOTO', 'F2_INTERPRETATION', 'F3_TALISMAN', 'F4_TAPE'],
        unlockedDeductionIds: ['story-letter'],
        unlockedContentIds: [...PRODUCTION_FLOW.investigationBatches.flat(), 'story-letter', 'novel-ling'],
        viewedContentIds: ['novel-ling'],
        openedContentIds: ['story-letter', 'novel-ling'],
        terminalProgress: { chapterId: 'novel-ling', pageIndex: 3 },
        completedTerminalIds: ['novel-ling']
      };
      values.set('si_case_desk_state_v5', JSON.stringify(invalid));

      const restored = loadCaseDeskState();
      expect(restored.incompatible).toBe(false);
      expect(restored.state.currentPhase).toBe('DEDUCTION_PHASE');
      expect(restored.state.terminalProgress).toBeNull();
      expect(restored.state.completedTerminalIds).toEqual([]);
      expect(restored.state.unlockedContentIds).not.toContain('novel-ling');
      expect(restored.state.unlockedDeductionIds).toEqual(['story-letter']);
      expect(restored.state.solvedGateIds).toEqual(['tapping', 'force']);
      expect(JSON.parse(values.get('si_case_desk_state_v6') ?? '{}').unlockedContentIds).not.toContain('novel-ling');
    } finally {
      if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow);
      else delete (globalThis as { window?: unknown }).window;
    }
  });
});
