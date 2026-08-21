import { hasAll, hasAny, result } from './helpers';
export function judge(payload: Record<string, unknown>) {
  if (!hasAll(payload.supportIds, ['E004'])) return result('G02_SUPPORT', 'E');
  if (!hasAny(payload.conclusion, ['周枫家', '男主家', '枫家'])) return result('G02_LOCATION', 'C');
  return result('G02_PASS');
}
