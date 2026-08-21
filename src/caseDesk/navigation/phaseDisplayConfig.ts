import type { FormalGateId, InvestigationPhase } from '../types';
import type { NavSectionId } from './types';

export interface PhaseDisplayConfig {
  /** The label used by the existing CaseDesk stage banner. */
  deskLabel: string;
  prompt: string;
  /** The only player-facing section label used by InvestigationNav. */
  navLabel: string;
  navSection: NavSectionId;
}

export const phaseDisplayConfig: Record<InvestigationPhase, PhaseDisplayConfig> = {
  INTRO: { deskLabel: '序', prompt: '先把这场雨读完。', navLabel: '案件开始', navSection: 'case' },
  CASE_INVESTIGATION: { deskLabel: '案件调查', prompt: '从已经留下的材料开始。', navLabel: '案件资料', navSection: 'case' },
  TAP_GATE: { deskLabel: '两次“嗒、嗒”', prompt: '旧录音和多年前的雨夜，第一次接上了。', navLabel: '当前推理', navSection: 'reasoning' },
  POLICE_INVESTIGATION: { deskLabel: '人物与旧案', prompt: '材料逐渐从现场，伸向每一个人。', navLabel: '警方调查', navSection: 'police' },
  FORCE_GATE: { deskLabel: '四个 Force', prompt: '把相互牵引的三件材料放在一起。', navLabel: '当前推理', navSection: 'reasoning' },
  DEDUCTION_PHASE: { deskLabel: '虚构推理', prompt: '故事可以很像真的，但它不是证据。', navLabel: '推理记录', navSection: 'deduction' },
  FINAL_GATE: { deskLabel: '真凶', prompt: '最后一次判断，需要同时说清楚人、物、动作和伤口。', navLabel: '最终推理', navSection: 'reasoning' },
  TERMINAL_REVEAL: { deskLabel: '终盘阅读', prompt: '接下来，让他们自己把故事说完。', navLabel: '阅读', navSection: 'terminal' },
  COMPLETE: { deskLabel: '阅读', prompt: '已有内容可以继续回看。', navLabel: '阅读', navSection: 'terminal' }
};

export const gateDisplayConfig: Record<FormalGateId, { activeLabel: string; successLabel: string }> = {
  tapping: { activeLabel: '当前推理', successLabel: '已完成推理' },
  force: { activeLabel: '当前推理', successLabel: '已完成推理' },
  final: { activeLabel: '最终推理', successLabel: '已完成推理' }
};

export function getPhaseDisplay(phase: InvestigationPhase): PhaseDisplayConfig {
  return phaseDisplayConfig[phase];
}
