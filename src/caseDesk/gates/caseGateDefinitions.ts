import { contentRegistry } from '../../content/ContentRegistry';
import type { FinalGateRuntime, RelationGateRuntime, RegistryGate, TextGateRuntime } from '../../content/types';
import type { FinalGateDefinition, ReasoningGateDefinition, RelationGateDefinition, TextAnswerGateDefinition } from './reasoningGate';

function requireGate(id: string): RegistryGate {
  const gate = contentRegistry.getGateById(id);
  if (!gate) throw new Error(`Gate content is not registered: ${id}`);
  return gate;
}

function baseDefinition(gate: RegistryGate): Omit<ReasoningGateDefinition, 'type'> & { type: RegistryGate['type'] } {
  return {
    id: gate.id,
    title: gate.displayTitle,
    prompt: gate.prompt,
    promptBlocks: gate.promptBlocks,
    promptTextBlocks: gate.promptTextBlocks,
    instructionsBlocks: gate.player.instructionsBlocks,
    instructionsTextBlocks: gate.player.textBlocks.instructions,
    feedback: gate.player.feedback,
    feedbackTextBlocks: gate.player.textBlocks.feedback,
    feedbackSections: gate.player.feedbackSections,
    type: gate.type,
    runtime: gate.runtime,
    successMessage: gate.player.feedback.success.join('\n\n') || '推理成立'
  } as Omit<ReasoningGateDefinition, 'type'> & { type: RegistryGate['type'] };
}

const tappingSource = requireGate('tapping');
const tappingRuntime = tappingSource.runtime as TextGateRuntime;
if (tappingRuntime.normalization === undefined) throw new Error('嗒嗒 Gate runtime 缺少 normalization');

export const TAPPING_GATE_DEFINITION: TextAnswerGateDefinition = {
  ...baseDefinition(tappingSource),
  type: 'text_answer',
  acceptedAnswers: tappingRuntime.acceptedAnswers,
  partialAnswers: tappingRuntime.partialAliases
};

const forceSource = requireGate('force');
const forceRuntime = forceSource.runtime as RelationGateRuntime;
export const FORCE_GATE_DEFINITION: RelationGateDefinition = {
  ...baseDefinition(forceSource),
  type: 'relation',
  entityIds: forceRuntime.standardSets.flatMap((item) => item.objectIds),
  requiredCount: forceRuntime.requiredCount,
  standardSets: forceRuntime.standardSets,
  forceFeedback: forceSource.player.forceFeedback
};

const finalSource = requireGate('final');
const finalRuntime = finalSource.runtime as FinalGateRuntime;
export const FINAL_GATE_DEFINITION: FinalGateDefinition = {
  ...baseDefinition(finalSource),
  type: 'final',
  entityIds: finalRuntime.slots.map((item) => item.objectId),
  slots: finalRuntime.slots
};

export const FORMAL_GATE_DEFINITIONS: readonly ReasoningGateDefinition[] = [
  TAPPING_GATE_DEFINITION,
  FORCE_GATE_DEFINITION,
  FINAL_GATE_DEFINITION
];
