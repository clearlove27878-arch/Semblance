import { hasAny, result } from './helpers';
export function judge(payload: Record<string, unknown>) {
  if (Array.isArray(payload.initials) && payload.initials.length === 9 && payload.anomaly === '雄手' && hasAny(payload.interpretation, ['凶手'])) return result('E030_SOLVED');
  return result('E030_NOT_SOLVED', 'B');
}
