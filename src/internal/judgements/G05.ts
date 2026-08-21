import { hasAll, hasAny, result } from './helpers';
export function judge(payload: Record<string, unknown>) {
  if (!hasAll(payload.linkedIds, ['E001', 'E021'])) return result('G05_LINK', 'D');
  if (!hasAny(payload.meaning, ['否定', '纠错', '不对', '错误', '理解错'])) return result('G05_MEANING', 'C');
  return result('G05_PASS');
}
