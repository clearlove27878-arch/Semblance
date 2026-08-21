import { hasAny, result } from './helpers';
export function judge(payload: Record<string, unknown>) {
  if (!payload.objection) return result('T02_NO_OBJECTION', 'B');
  if (!hasAny(payload.gapText, ['现场', '指令', '方式', '毒液', '方法', '凶器'])) return result('T02_GAP', 'B');
  if (!Array.isArray(payload.selectedEvidenceIds) || payload.selectedEvidenceIds.length === 0) return result('T02_EVIDENCE', 'F');
  return result('T02_PASS');
}
