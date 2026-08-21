import { hasAll, hasAny, result } from './helpers';
export function judge(payload: Record<string, unknown>) {
  if (payload.medium !== 'E031' || payload.body !== 'E002') return result('F05_CORE', 'F');
  if (!hasAny(payload.action, ['正常处理', '翻找', '操作', '处理'])) return result('F05_ACTION', 'B');
  if (!hasAny(payload.connectionText, ['蛇毒', '中毒', '进入', '创口', '伤口'])) return result('F05_CONNECTION', 'B');
  return result('F05_PASS');
}
