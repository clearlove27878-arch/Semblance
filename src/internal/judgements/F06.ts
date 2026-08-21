import { hasAll, hasAny, result } from './helpers';
export function judge(payload: Record<string, unknown>) {
  if (!hasAll(payload.behaviorIds, ['E012']) || !hasAll(payload.objectIds, ['E031'])) return result('F06_STRUCTURE', 'B');
  if (!hasAny(payload.impact, ['证据', '证明', '痕迹', '磨损', '无法形成', '清洗'])) return result('F06_IMPACT', 'B');
  return result('F06_PASS');
}
