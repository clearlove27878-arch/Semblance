import { hasAll, hasAny, result } from './helpers';
export function judge(payload: Record<string, unknown>) {
  if (!hasAll(payload.linkedIds, ['E007', 'E008'])) return result('F04_LINK', 'D');
  if (!hasAny(payload.triggerAnswer, ['越线', '准备杀', '真正准备', '杀人'])) return result('F04_TRIGGER', 'B');
  if (!hasAny(payload.motiveAnswer, ['周枫', '自己实施', '自己动手', '替'])) return result('F04_MOTIVE', 'B');
  return result('F04_PASS');
}
