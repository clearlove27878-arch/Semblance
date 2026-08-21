import { result } from './helpers';
const standard = ['E034-01', 'E034-02', 'E034-03', 'E034-04', 'E034-05', 'E034-06', 'E034-07', 'E034-08', 'E034-09', 'E034-10', 'E034-11', 'E034-12', 'E034-13'];
const tolerant = [...standard.slice(0, 6), 'E034-08', 'E034-07', ...standard.slice(8)];
export function judge(payload: Record<string, unknown>) {
  const order = payload.order;
  if (!Array.isArray(order)) return result('F07_STRUCTURE', 'B');
  if (order.join('|') === standard.join('|') || order.join('|') === tolerant.join('|')) return result('F07_PASS');
  return result('F07_ORDER', 'B');
}
