import { TAPPING_GATE_DEFINITION } from './caseGateDefinitions';
import { matchesAcceptedTextAnswer } from './reasoningGate';

export function validateTappingAnswer(input: string): boolean {
  return matchesAcceptedTextAnswer(input, TAPPING_GATE_DEFINITION.acceptedAnswers);
}
