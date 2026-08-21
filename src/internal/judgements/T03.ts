import { hasAll, result } from './helpers';
export function judge(payload: Record<string, unknown>) {
  if (!payload.objection) return result('T03_NO_OBJECTION', 'B');
  if (!hasAll(payload.selectedEvidenceIds, ['E008', 'E023'])) return result('T03_EVIDENCE', 'F');
  return result('T03_PASS');
}
