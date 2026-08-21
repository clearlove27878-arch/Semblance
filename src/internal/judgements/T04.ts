import { hasAll, hasAny, result } from './helpers';
export function judge(payload: Record<string, unknown>) {
  if (!payload.objection) return result('T04_NO_OBJECTION', 'B');
  if (!hasAll(payload.selectedEvidenceIds, ['E002', 'E026'])) return result('T04_EVIDENCE', 'F');
  if (!hasAny(payload.gapText, ['来源', '同源', '毒液', '方式', '不能证明', '未确认'])) return result('T04_GAP', 'B');
  return result('T04_PASS');
}
