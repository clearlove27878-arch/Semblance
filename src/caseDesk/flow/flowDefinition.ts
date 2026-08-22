import { contentRegistry } from '../../content/ContentRegistry';
import type { FormalGateId, InvestigationPhase } from '../types';
import { READING_CHAPTER_ORDER } from '../readingIndex';

export const FLOW_VERSION = 1;
export const INTRO_STEP_COUNT = 6;

export const SCENE_MATERIAL_IDS = [
  'death-scene',
  'forensic-report',
  'body-injuries',
  'recording-old-treatment'
] as const;

export const HOME_FIRST_MATERIAL_IDS = [
  'feng-home',
  'treatment-mirror',
  'snake-cabinet',
  'snake-charm'
] as const;

export const HOME_SECOND_MATERIAL_IDS = [
  'tapes-initial',
  'feng-hand-injury',
  'antivenom-initial'
] as const;

/**
 * This is the first explicit release table.  It carries forward the already
 * shipped 4 / 4 / 3 investigation batches and makes the later Gate inputs
 * available as one named police-investigation release.  It does not infer
 * order from filenames.
 */
export const POLICE_INVESTIGATION_CONTENT_IDS = [
  'statement-ling',
  'statement-feng',
  'statement-zhenhua',
  'statement-wang',
  'wang-investigation-initial',
  'old-recorder-rewind',
  'tape-supplement',
  'wang-collage-photo',
  'zhenhua-investigation-initial'
] as const;

export const INVESTIGATION_BATCHES = [
  SCENE_MATERIAL_IDS,
  HOME_FIRST_MATERIAL_IDS,
  HOME_SECOND_MATERIAL_IDS
] as const;

export const FICTIONAL_DEDUCTION_IDS = [
  'story-letter',
  'story-question',
  'story-silent-letter',
  'story-snake-bride'
] as const;

export { READING_CHAPTER_ORDER } from '../readingIndex';

export interface FlowPhaseDefinition {
  id: InvestigationPhase;
  label: string;
  unlockOnEntry?: readonly string[];
  availableGateIds?: readonly FormalGateId[];
  nextPhase?: InvestigationPhase;
}

export interface FlowDefinition {
  id: 'PRODUCTION_FLOW' | 'DEV_FLOW';
  version: number;
  initialPhase: InvestigationPhase;
  phases: Record<InvestigationPhase, FlowPhaseDefinition>;
  investigationBatches: readonly (readonly string[])[];
  policeInvestigationContentIds: readonly string[];
  fictionalDeductionIds: readonly string[];
  terminalChapterOrder: readonly string[];
  gateNextPhase: Readonly<Record<FormalGateId, InvestigationPhase>>;
}

const PHASES: Record<InvestigationPhase, FlowPhaseDefinition> = {
  INTRO: { id: 'INTRO', label: '序', nextPhase: 'CASE_INVESTIGATION' },
  CASE_INVESTIGATION: {
    id: 'CASE_INVESTIGATION',
    label: '案件调查',
    unlockOnEntry: SCENE_MATERIAL_IDS,
    nextPhase: 'TAP_GATE'
  },
  TAP_GATE: {
    id: 'TAP_GATE',
    label: '嗒。嗒。',
    availableGateIds: ['tapping'],
    nextPhase: 'POLICE_INVESTIGATION'
  },
  POLICE_INVESTIGATION: {
    id: 'POLICE_INVESTIGATION',
    label: '人物与旧案',
    unlockOnEntry: POLICE_INVESTIGATION_CONTENT_IDS,
    availableGateIds: ['force'],
    nextPhase: 'FORCE_GATE'
  },
  FORCE_GATE: {
    id: 'FORCE_GATE',
    label: '四个 Force',
    availableGateIds: ['force'],
    nextPhase: 'DEDUCTION_PHASE'
  },
  DEDUCTION_PHASE: {
    id: 'DEDUCTION_PHASE',
    label: '虚构推理',
    availableGateIds: ['final'],
    nextPhase: 'FINAL_GATE'
  },
  FINAL_GATE: {
    id: 'FINAL_GATE',
    label: '真凶',
    availableGateIds: ['final'],
    nextPhase: 'TERMINAL_REVEAL'
  },
  TERMINAL_REVEAL: {
    id: 'TERMINAL_REVEAL',
    label: '终盘阅读',
    nextPhase: 'COMPLETE'
  },
  COMPLETE: { id: 'COMPLETE', label: '完成' }
};

export const PRODUCTION_FLOW: FlowDefinition = {
  id: 'PRODUCTION_FLOW',
  version: FLOW_VERSION,
  initialPhase: 'INTRO',
  phases: PHASES,
  investigationBatches: INVESTIGATION_BATCHES,
  policeInvestigationContentIds: POLICE_INVESTIGATION_CONTENT_IDS,
  fictionalDeductionIds: FICTIONAL_DEDUCTION_IDS,
  terminalChapterOrder: READING_CHAPTER_ORDER,
  gateNextPhase: {
    tapping: 'POLICE_INVESTIGATION',
    force: 'DEDUCTION_PHASE',
    final: 'TERMINAL_REVEAL'
  }
};

/**
 * DEV_FLOW is intentionally a named configuration, not a runtime shortcut.
 * It currently mirrors production so the full chain can be exercised without
 * inventing a second set of content or answers.  Future debug-only shortcuts
 * can be added here without entering PRODUCTION_FLOW.
 */
export const DEV_FLOW: FlowDefinition = {
  ...PRODUCTION_FLOW,
  id: 'DEV_FLOW'
};

function hasUniqueValues(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}

function validatePhaseGraph(definition: FlowDefinition): string[] {
  const errors: string[] = [];
  const visited = new Set<InvestigationPhase>();
  const visiting = new Set<InvestigationPhase>();

  const visit = (phase: InvestigationPhase) => {
    if (visiting.has(phase)) {
      errors.push(`phase graph contains a cycle at ${phase}`);
      return;
    }
    if (visited.has(phase)) return;
    visiting.add(phase);
    const next = definition.phases[phase].nextPhase;
    if (next) visit(next);
    visiting.delete(phase);
    visited.add(phase);
  };

  visit(definition.initialPhase);
  for (const phase of Object.keys(definition.phases) as InvestigationPhase[]) {
    if (!visited.has(phase)) errors.push(`phase is unreachable: ${phase}`);
  }
  return errors;
}

function validateForceAvailability(definition: FlowDefinition): string[] {
  const errors: string[] = [];
  const forceGate = contentRegistry.getGateById('force');
  if (!forceGate || forceGate.type !== 'relation' || !('standardSets' in forceGate.runtime)) return errors;

  const releasedBeforeForce = new Set([
    ...definition.investigationBatches.flat(),
    ...definition.policeInvestigationContentIds
  ]);
  for (const standardSet of forceGate.runtime.standardSets) {
    for (const objectId of standardSet.objectIds) {
      const mapping = contentRegistry.getGateObject(objectId);
      if (mapping && !releasedBeforeForce.has(mapping.contentId)) {
        errors.push(`Force ${standardSet.forceId} 需要的对象 ${objectId} 在 Gate 开放前未解锁: ${mapping.contentId}`);
      }
    }
  }
  return errors;
}

export function validateFlowDefinition(definition: FlowDefinition = PRODUCTION_FLOW): string[] {
  const errors: string[] = [];
  const phaseIds = Object.keys(definition.phases) as InvestigationPhase[];

  if (!hasUniqueValues(phaseIds)) errors.push('phase ids must be unique');
  if (!hasUniqueValues(definition.terminalChapterOrder)) errors.push('reading chapter order must be unique');
  if (definition.phases[definition.initialPhase] === undefined) errors.push('initial phase does not exist');

  for (const phase of phaseIds) {
    const phaseDefinition = definition.phases[phase];
    if (phaseDefinition.nextPhase && !definition.phases[phaseDefinition.nextPhase]) {
      errors.push(`${phase} points to missing phase ${phaseDefinition.nextPhase}`);
    }
    for (const contentId of phaseDefinition.unlockOnEntry ?? []) {
      if (!contentRegistry.getContentById(contentId)) errors.push(`${phase} references missing content ${contentId}`);
    }
    for (const gateId of phaseDefinition.availableGateIds ?? []) {
      if (!contentRegistry.getGateById(gateId)) errors.push(`${phase} references missing Gate ${gateId}`);
    }
  }

  for (const contentId of definition.investigationBatches.flat()) {
    if (!contentRegistry.getContentById(contentId)) errors.push(`investigation batch references missing content ${contentId}`);
  }
  for (const contentId of definition.policeInvestigationContentIds) {
    if (!contentRegistry.getContentById(contentId)) errors.push(`police investigation references missing content ${contentId}`);
  }
  for (const contentId of definition.fictionalDeductionIds) {
    const content = contentRegistry.getContentById(contentId);
    if (!content || content.type !== 'fictional_deduction') errors.push(`fictional deduction reference is invalid: ${contentId}`);
  }
  for (const chapterId of definition.terminalChapterOrder) {
    const content = contentRegistry.getContentById(chapterId);
    if (!content || content.type !== 'terminal_chapter') {
      errors.push(`terminal chapter reference is invalid: ${chapterId}`);
    } else {
      if (!Array.isArray(content.pages) || content.pages.length < 1) errors.push(`terminal chapter has no author pages: ${chapterId}`);
      if (content.pages.some((page) => page.length === 0)) errors.push(`terminal chapter contains an empty author page: ${chapterId}`);
    }
  }
  for (const gateId of Object.keys(definition.gateNextPhase) as FormalGateId[]) {
    if (!contentRegistry.getGateById(gateId)) errors.push(`gate transition references missing Gate ${gateId}`);
    if (!definition.phases[definition.gateNextPhase[gateId]]) errors.push(`Gate ${gateId} points to missing phase`);
  }

  if (definition.terminalChapterOrder.join('|') !== READING_CHAPTER_ORDER.join('|')) {
    errors.push('reading chapter order must remain novel-ling -> novel-feng -> lan-past -> lan-and-zheng -> lan-leaving-and-threat -> lan-first-meeting -> lan-snakebite -> lan-case-day -> lan-death');
  }
  if (definition.gateNextPhase.final !== 'TERMINAL_REVEAL') errors.push('final Gate must enter TERMINAL_REVEAL');
  if (definition.phases.COMPLETE.nextPhase) errors.push('COMPLETE must not point to another phase');

  errors.push(...validateForceAvailability(definition));
  errors.push(...validatePhaseGraph(definition));
  return [...new Set(errors)];
}

export function assertValidFlowDefinition(definition: FlowDefinition = PRODUCTION_FLOW): void {
  const errors = validateFlowDefinition(definition);
  if (errors.length > 0) throw new Error(`Invalid InvestigationFlow definition:\n${errors.join('\n')}`);
}
