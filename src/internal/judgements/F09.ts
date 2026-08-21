import { hasAll, result } from './helpers';
export function judge(payload: Record<string, unknown>) {
  const slots = (payload.slots ?? {}) as Record<string, unknown>;
  const ok = hasAll(slots.implementer, ['P01'])
    && hasAll(slots.trigger_motive, ['E029'])
    && hasAll(slots.xu_attempt, ['E007', 'E008', 'E028'])
    && hasAll(slots.poison_method, ['E031', 'E002'])
    && hasAll(slots.evidence_break, ['E012', 'E032'])
    && hasAll(slots.cheng_final_chain, ['E033', 'E034', 'F08_OUTPUT']);
  return ok ? result('F09_PASS') : result('F09_INCOMPLETE', 'B');
}
