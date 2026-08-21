import { hasAll, hasAny, result } from './helpers';
export function judge(payload: Record<string, unknown>) {
  if (!hasAll(payload.evidenceIds, ['E007', 'E008'])) return result('F01_EVIDENCE', 'F');
  if (!hasAny(payload.conclusion, ['杀人准备', '杀伤目的', '危险机关', '想杀'])) return result('F01_BEHAVIOR', 'B');
  return result('F01_PASS');
}
