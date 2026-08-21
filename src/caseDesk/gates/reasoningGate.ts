import type { ContentTextBlock, GateFeedbackBlocks, GateRuntimeSpec, GateTextFeedbackBlocks } from '../../content/types';
import { canonicalizeReasoningObjectId } from '../../content/ReasoningObjectRegistry';
import { normalizeSearchInput } from '../../core/searchNormalize';

export type ReasoningGateType = 'text_answer' | 'relation' | 'final';
export type ReasoningGateStatus = 'locked' | 'available' | 'active' | 'incorrect' | 'success';
export type FinalSlotId = 'killer_slot' | 'medium_slot' | 'action_slot' | 'wound_slot' | 'disposal_slot';

export interface GateProgress {
  current: number;
  total: number;
}

interface ReasoningGateBase {
  id: string;
  title: string;
  prompt: string;
  type: ReasoningGateType;
  promptBlocks?: readonly string[];
  promptTextBlocks?: readonly ContentTextBlock[];
  instructionsBlocks?: readonly string[];
  instructionsTextBlocks?: readonly ContentTextBlock[];
  feedback?: GateFeedbackBlocks;
  feedbackTextBlocks?: GateTextFeedbackBlocks;
  feedbackSections?: readonly { key: string; blocks: readonly string[]; textBlocks?: readonly ContentTextBlock[] }[];
  runtime?: GateRuntimeSpec;
  status?: ReasoningGateStatus;
  unlockCondition?: string;
  successMessage?: string;
  progress?: GateProgress;
}

export interface TextAnswerGateDefinition extends ReasoningGateBase {
  type: 'text_answer';
  acceptedAnswers: readonly string[];
  partialAnswers?: readonly string[];
}

export interface RelationGateDefinition extends ReasoningGateBase {
  type: 'relation';
  entityIds?: readonly string[];
  requiredCount?: number;
  standardSets?: readonly { forceId: string; objectIds: readonly string[] }[];
  forceFeedback?: readonly ForceFeedbackDefinition[];
}

export interface FinalGateDefinition extends ReasoningGateBase {
  type: 'final';
  entityIds?: readonly string[];
  slots?: readonly { objectId: string; slotId: FinalSlotId }[];
}

export type ReasoningGateDefinition = TextAnswerGateDefinition | RelationGateDefinition | FinalGateDefinition;

export interface TextAnswer {
  kind: 'text_answer';
  value: string;
}

export interface RelationAnswer {
  kind: 'relation';
  entityIds: string[];
}

export interface ForceFeedbackDefinition {
  label: string;
  success: readonly string[];
  partial: readonly string[];
  incorrect: readonly string[];
  textBlocks?: {
    success: readonly ContentTextBlock[];
    partial: readonly ContentTextBlock[];
    incorrect: readonly ContentTextBlock[];
  };
}

export interface FinalAnswer {
  kind: 'final';
  culpritId: string;
  entityIds: string[];
}

export type ReasoningAnswer = TextAnswer | RelationAnswer | FinalAnswer;

export const AUTHOR_OVERRIDE_ANSWER = 'ragdollcat';

/**
 * Normalize only the representation of an answer. Matching remains exact
 * against the configured aliases; this is intentionally not fuzzy matching.
 */
export function normalizeTextAnswer(input: string): string {
  return normalizeSearchInput(input);
}

export function matchesAcceptedTextAnswer(
  input: string,
  acceptedAnswers: readonly string[],
  overrides: readonly string[] = import.meta.env.DEV ? [AUTHOR_OVERRIDE_ANSWER] : []
): boolean {
  const normalized = normalizeTextAnswer(input);
  if (!normalized) return false;

  return [...acceptedAnswers, ...overrides]
    .map((answer) => normalizeTextAnswer(answer))
    .some((answer) => answer === normalized);
}

export function matchesPartialTextAnswer(input: string, partialAnswers: readonly string[]): boolean {
  const normalized = normalizeTextAnswer(input);
  if (!normalized) return false;
  return partialAnswers
    .map((answer) => normalizeTextAnswer(answer))
    .some((answer) => answer === normalized);
}

export function matchesRelationSet(candidateIds: readonly string[], standardSets: readonly { forceId: string; objectIds: readonly string[] }[]): string | null {
  const candidate = [...new Set(candidateIds.map((id) => canonicalizeReasoningObjectId(id) ?? id))];
  if (candidate.length !== 3) return null;
  const normalizedCandidate = [...candidate].sort().join('|');
  return standardSets.find((item) => [...item.objectIds].map((id) => canonicalizeReasoningObjectId(id) ?? id).sort().join('|') === normalizedCandidate)?.forceId ?? null;
}

export function matchesFinalSlots(
  candidate: Partial<Record<FinalSlotId, string>>,
  slots: readonly { objectId: string; slotId: FinalSlotId }[]
): boolean {
  return slots.every((slot) => {
    const candidateId = candidate[slot.slotId];
    if (!candidateId) return false;
    return (canonicalizeReasoningObjectId(candidateId) ?? candidateId) === (canonicalizeReasoningObjectId(slot.objectId) ?? slot.objectId);
  });
}
