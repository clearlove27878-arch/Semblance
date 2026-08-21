import { hasAny, result } from './helpers';
export function judge(payload: Record<string, unknown>) {
  if (!payload.e028Viewed) return result('F02_VIEW', 'B');
  if (!hasAny(payload.answer, ['没有', '未遂', '没成功', '未造成', '不'])) return result('F02_RESULT', 'C');
  return result('F02_PASS');
}
