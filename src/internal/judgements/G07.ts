import { hasAll, result } from './helpers';
export function judge(payload: Record<string, unknown>) {
  const chain = payload.chain;
  if (!hasAll(chain, ['home', 'snake', 'poison', 'leave', 'fall'])) return result('G07_CHAIN', 'B');
  return result('G07_PASS');
}
