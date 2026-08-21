import type { AppView, StageId } from './types';

export const SAVE_VERSION = 1;
export const INTRO_STEP_COUNT = 4;

export const ALL_STAGE_IDS: StageId[] = [
  'G01', 'G02', 'G03', 'C01', 'G04', 'G05', 'C02', 'G06',
  'C03', 'C04', 'T01', 'T02', 'T03', 'T04', 'G07',
  'F01', 'F02', 'F03', 'E030', 'F04', 'F05', 'F06', 'F07', 'F08', 'F09'
];

export const READING_STAGE_IDS = ['C01', 'C02', 'C03', 'C04'] as const;

export const T_STAGE_IDS = ['T01', 'T02', 'T03', 'T04'] as const;

export const FINAL_STAGE_IDS = ['F01', 'F02', 'F03', 'F04', 'F05', 'F06', 'F07', 'F08', 'F09'] as const;

export const VIEW_FOR_STAGE: Record<StageId, AppView> = {
  G01: 'case', G02: 'case', G03: 'case', G04: 'case', G05: 'case', G06: 'case', G07: 'case',
  C01: 'reading', C02: 'reading', C03: 'reading', C04: 'reading',
  T01: 'assessment', T02: 'assessment', T03: 'assessment', T04: 'assessment',
  F01: 'endgame', F02: 'endgame', F03: 'endgame', F04: 'endgame', F05: 'endgame',
  F06: 'endgame', F07: 'endgame', F08: 'endgame', F09: 'endgame', E030: 'document'
};

export function isReadingStage(id: StageId): id is (typeof READING_STAGE_IDS)[number] {
  return READING_STAGE_IDS.includes(id as (typeof READING_STAGE_IDS)[number]);
}

export function isTrialStage(id: StageId): id is (typeof T_STAGE_IDS)[number] {
  return T_STAGE_IDS.includes(id as (typeof T_STAGE_IDS)[number]);
}

export function isFinalStage(id: StageId): id is (typeof FINAL_STAGE_IDS)[number] {
  return FINAL_STAGE_IDS.includes(id as (typeof FINAL_STAGE_IDS)[number]);
}

export function chapterForStage(id: StageId): string {
  if (id === 'E030' || isFinalStage(id)) return '始';
  if (['G01', 'G02'].includes(id)) return '尸';
  if (['G03', 'C01', 'G04'].includes(id)) return '家';
  if (['G05', 'C02', 'G06'].includes(id)) return '似';
  if (['C03', 'C04', 'T01', 'T02', 'T03', 'T04', 'G07'].includes(id)) return '证';
  return '调查';
}

export const FEEDBACK_TEXT: Record<'A' | 'B' | 'C' | 'D' | 'E' | 'F', string> = {
  A: '推理成立。',
  B: '你已经解释了其中一部分，但这条因果还没有闭合。',
  C: '现有材料不支持这个事实。',
  D: '这两件事都是真的，但你还没有证明它们之间存在这条线。',
  E: '当前材料不足以判断这一假设。',
  F: '这件证据确实重要，但它没有击穿当前这句话。'
};

export const E032_ID = 'E032';
