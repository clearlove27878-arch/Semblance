import { count, hasAll, hasAny, result } from './helpers';
export function judge(payload: Record<string, unknown>) {
  const facts = payload.selectedFacts;
  if (count(facts) < 2) return result('G01_STRUCTURE', 'B');
  if (!hasAll(facts, ['tox', 'fall_after'])) return result('G01_RELATION', 'B');
  if (!hasAny(payload.conclusion, ['先中毒后坠落', '先中蛇毒后坠落', '中毒在前', '先中毒'])) return result('G01_SEMANTIC', 'B');
  return result('G01_PASS');
}
