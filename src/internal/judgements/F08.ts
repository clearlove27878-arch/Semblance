import { hasAny, result } from './helpers';
const required: Record<number, string> = { 1: 'E033', 2: 'E031', 3: 'E006', 4: 'E018' };
export function judge(payload: Record<string, unknown>) {
  if (payload.finalPattern) {
    return hasAny(payload.finalPattern, ['没有人告诉她', '自己补完', '把事实当指令', '替别人定义', '自译']) ? result('F08_PASS') : result('F08_FINAL_PATTERN', 'B');
  }
  const index = Number(payload.index);
  if (!required[index] || payload.evidenceId !== required[index]) return result('F08_EVIDENCE', 'F');
  if (!hasAny(payload.text, ['不能证明', '没有证据', '不等于', '不能说明', '未证明', '只是事实'])) return result('F08_TEXT', 'B');
  return result(`F08_STEP${index}`);
}
