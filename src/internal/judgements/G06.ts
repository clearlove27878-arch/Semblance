import { count, hasAny, result } from './helpers';
export function judge(payload: Record<string, unknown>) {
  if (count(payload.suspicionIds) < 2 || count(payload.gapIds) < 1) return result('G06_STRUCTURE', 'B');
  if (!hasAny(payload.model, ['高度可疑', '可疑']) || !hasAny(payload.model, ['无法证明', '不能证明', '实施链缺失', '证据不足'])) return result('G06_MODEL', 'B');
  return result('G06_PASS');
}
