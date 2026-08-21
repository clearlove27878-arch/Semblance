import { hasAny, result } from './helpers';
export function judge(payload: Record<string, unknown>) {
  if (!hasAny(payload.implementer, ['周枫', '枫'])) return result('F03_IMPLEMENTER', 'C');
  return result('F03_PASS');
}
