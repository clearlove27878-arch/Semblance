import { describe, expect, it } from 'vitest';
import { FORCE_GATE_DEFINITION } from '../src/caseDesk/gates/caseGateDefinitions';
import { DEDUCTION_UNLOCK_SOURCE, reduceInvestigationFlow } from '../src/caseDesk/flow/InvestigationFlow';
import { PRODUCTION_FLOW } from '../src/caseDesk/flow/flowDefinition';
import { createInitialCaseState } from '../src/caseDesk/state';
import { getInvestigationNavModel } from '../src/caseDesk/navigation/investigationNav';
import type { CaseState } from '../src/caseDesk/types';

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
    state = dispatch(viewCurrentBatch(state), { type: 'CONTINUE' });
  }
  return state;
}

function reachPoliceInvestigation(): CaseState {
  let state = reachTappingGate();
  state = dispatch(state, { type: 'GATE_SOLVED', gateId: 'tapping' });
  return dispatch(state, { type: 'RETURN_TO_DESK' });
}

function reachDeductionPhase(): CaseState {
  let state = reachPoliceInvestigation();
  state = dispatch(state, { type: 'ENTER_GATE', gateId: 'force' });
  for (const force of FORCE_GATE_DEFINITION.standardSets ?? []) state = dispatch(state, { type: 'FORCE_SOLVED', forceId: force.forceId });
  state = dispatch(state, { type: 'GATE_SOLVED', gateId: 'force' });
  return dispatch(state, { type: 'RETURN_TO_DESK' });
}

function reachTerminal(state = reachDeductionPhase()): CaseState {
  state = dispatch(state, { type: 'ENTER_GATE', gateId: 'final' });
  state = dispatch(state, { type: 'GATE_SOLVED', gateId: 'final' });
  return dispatch(state, { type: 'RETURN_TO_DESK' });
}

describe('InvestigationNav 派生模型', () => {
  it('只从已解锁材料生成 section，初始状态不出现未来阶段', () => {
    const model = getInvestigationNavModel(createInitialCaseState());
    expect(model.sections).toEqual([]);
    expect(JSON.stringify(model)).not.toContain('Force');
    expect(JSON.stringify(model)).not.toContain('真凶');
  });

  it('案件资料未读数来自 unlocked - viewed，查看后立即减少', () => {
    const state = enterDesk();
    const before = getInvestigationNavModel(state);
    expect(before.sections.map((section) => section.id)).toEqual(['case', 'deduction']);
    expect(before.sections[0]?.unreadCount).toBe(3);

    const viewed = dispatch(state, { type: 'CONTENT_VIEWED', contentId: 'death-scene' });
    expect(getInvestigationNavModel(viewed).sections[0]?.unreadCount).toBe(2);
  });

  it('警方调查和 Gate 只在正式开放后出现，且不展示 locked future', () => {
    const state = reachPoliceInvestigation();
    const model = getInvestigationNavModel(state);
    expect(model.sections.map((section) => section.id)).toEqual(['case', 'police', 'deduction', 'reasoning']);
    expect(model.sections.find((section) => section.id === 'police')?.unreadCount).toBe(10);
    expect(model.sections.find((section) => section.id === 'reasoning')?.label).toBe('当前推理');
    expect(model.sections.find((section) => section.id === 'reasoning')?.routeTarget).toEqual({ type: 'reasoning', gateId: 'force' });
    expect(model.sections.some((section) => section.label === '阅读')).toBe(false);
  });

  it('即使残留终盘章节，Final Gate 未完成时也不生成阅读入口', () => {
    const state = {
      ...reachDeductionPhase(),
      unlockedContentIds: [...reachDeductionPhase().unlockedContentIds, 'novel-ling'],
      terminalProgress: { chapterId: 'novel-ling', pageIndex: 0 }
    };
    const model = getInvestigationNavModel(state);
    expect(model.terminalMode).toBe(false);
    expect(model.sections.some((section) => section.id === 'terminal')).toBe(false);
    expect(JSON.stringify(model)).not.toContain('阅读');
  });

  it('异常 terminal phase 没有 Final Gate 完成状态时也不会泄露阅读当前标签', () => {
    const base = reachDeductionPhase();
    const state = {
      ...base,
      currentPhase: 'TERMINAL_REVEAL' as const,
      unlockedContentIds: [...base.unlockedContentIds, 'novel-ling'],
      terminalProgress: { chapterId: 'novel-ling', pageIndex: 0 }
    };
    const model = getInvestigationNavModel(state);
    expect(model.terminalMode).toBe(false);
    expect(model.currentLabel).toBe('案件资料');
    expect(JSON.stringify(model)).not.toContain('阅读');
  });

  it('推理记录入口常驻但记录只在 deduction 解锁后计为未读', () => {
    let state = reachDeductionPhase();
    expect(getInvestigationNavModel(state).sections.map((section) => section.id)).toContain('reasoning');
    expect(getInvestigationNavModel(state).sections.find((section) => section.id === 'deduction')).toMatchObject({ unreadCount: 0, routeTarget: { type: 'deductionShelf' } });

    state = dispatch(state, { type: 'DEDUCTION_UNLOCKED', deductionId: 'story-letter', source: DEDUCTION_UNLOCK_SOURCE });
    expect(getInvestigationNavModel(state).sections.find((section) => section.id === 'deduction')).toMatchObject({ unreadCount: 1, routeTarget: { type: 'deductionShelf' } });
    state = dispatch(state, { type: 'CONTENT_VIEWED', contentId: 'story-letter' });
    expect(getInvestigationNavModel(state).sections.find((section) => section.id === 'deduction')?.unreadCount).toBe(0);
  });

  it('Force 进度只表达已知数量，不暴露其他 Force 名称', () => {
    let state = reachPoliceInvestigation();
    state = dispatch(state, { type: 'ENTER_GATE', gateId: 'force' });
    for (const force of FORCE_GATE_DEFINITION.standardSets?.slice(0, 2) ?? []) state = dispatch(state, { type: 'FORCE_SOLVED', forceId: force.forceId });
    const reasoning = getInvestigationNavModel(state, { activeGateId: 'force' }).sections.find((section) => section.id === 'reasoning');
    expect(reasoning).toMatchObject({ label: '当前推理', detail: '已找到 2 / 4', status: 'active' });
    expect(JSON.stringify(reasoning)).not.toContain('F1_');
  });

  it('终盘只显示案件资料与阅读，阅读入口始终回到索引且不显示线性完成度', () => {
    let state = reachTerminal();
    let model = getInvestigationNavModel(state);
    expect(model.terminalMode).toBe(true);
    expect(model.sections.map((section) => section.label)).toEqual(['案件资料', '推理记录', '阅读']);
    expect(model.sections.some((section) => section.label === '枫' || section.label === '岚')).toBe(false);
    expect(model.sections.find((section) => section.id === 'terminal')?.routeTarget).toEqual({ type: 'terminal', chapterId: null });

    state = dispatch(state, { type: 'READING_CHAPTER_COMPLETED', chapterId: 'novel-ling', pageIndex: 0, totalPages: 1 });
    model = getInvestigationNavModel(state);
    expect(model.sections.map((section) => section.label)).toEqual(['案件资料', '推理记录', '阅读']);
    expect(model.sections.find((section) => section.id === 'terminal')?.routeTarget).toEqual({ type: 'terminal', chapterId: null });
    expect(JSON.stringify(model)).not.toContain('100%');

    state = dispatch(state, { type: 'READING_CHAPTER_COMPLETED', chapterId: 'novel-feng', pageIndex: 0, totalPages: 1 });
    expect(state.currentPhase).toBe('TERMINAL_REVEAL');
    expect(getInvestigationNavModel(state).sections.map((section) => section.label)).toEqual(['案件资料', '推理记录', '阅读']);
  });

  it('终盘仍可从案件桌回到已发现的推理记录，当前区域显示为推理记录', () => {
    let state = dispatch(reachDeductionPhase(), { type: 'DEDUCTION_UNLOCKED', deductionId: 'story-letter', source: DEDUCTION_UNLOCK_SOURCE });
    state = reachTerminal(state);
    const model = getInvestigationNavModel(state, { activeSection: 'deduction' });
    expect(model.sections.map((section) => section.label)).toEqual(['案件资料', '推理记录', '阅读']);
    expect(model.currentLabel).toBe('推理记录');
    expect(model.sections.find((section) => section.id === 'deduction')).toMatchObject({ unreadCount: 1, routeTarget: { type: 'deductionShelf' }, active: true });
  });

  it('section id 唯一且每个 target 都属于当前已开放入口', () => {
    const state = reachDeductionPhase();
    const sections = getInvestigationNavModel(state).sections;
    expect(new Set(sections.map((section) => section.id)).size).toBe(sections.length);
    for (const section of sections) {
      expect(section.visible).toBe(true);
      expect(section.routeTarget.type).toBe(section.id === 'case' || section.id === 'police' ? 'caseDesk' : section.id === 'deduction' ? 'deductionShelf' : section.id === 'reasoning' ? 'reasoning' : 'terminal');
    }
  });
});
