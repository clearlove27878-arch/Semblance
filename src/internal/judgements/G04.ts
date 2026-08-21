import { hasAny, result } from './helpers';
export function judge(payload: Record<string, unknown>) {
  if (payload.step === 1) return payload.selectedFact === 'B' ? result('G04_STEP1') : result('G04_FACT', 'C');
  if (payload.selectedFact !== 'B') return result('G04_FACT', 'C');
  if (!hasAny(payload.timeText, ['案发前', '早于案发', '过去', '以前', '不是当天', '之前'])) return result('G04_TIME', 'B');
  return result('G04_PASS');
}
