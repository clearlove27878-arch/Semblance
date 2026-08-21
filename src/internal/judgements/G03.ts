import { count, hasAny, result } from './helpers';
export function judge(payload: Record<string, unknown>) {
  if (count(payload.relationIds) < 2) return result('G03_STRUCTURE', 'B');
  if (!hasAny(payload.behavior, ['翻找', '寻找东西', '主动搜寻', '找东西', '翻看'])) return result('G03_SEMANTIC', 'E');
  return result('G03_PASS');
}
