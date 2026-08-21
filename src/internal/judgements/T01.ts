import { hasAll, result } from './helpers';
export function judge(payload: Record<string, unknown>) {
  if (!payload.objection) return result('T01_NO_OBJECTION', 'B');
  if (!hasAll(payload.selectedEvidenceIds, ['E012'])) return result('T01_EVIDENCE', 'F');
  return result('T01_PASS');
}
