import type { AuditEvent, CaseState, StageId } from './types';

export function audit(
  state: CaseState,
  event_type: string,
  actor: AuditEvent['actor'],
  details: Omit<AuditEvent, 'event_id' | 'event_type' | 'created_at' | 'actor'> = {}
): CaseState {
  const created_at = new Date().toISOString();
  const event: AuditEvent = {
    event_id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    event_type,
    created_at,
    actor,
    ...details
  };
  return {
    ...state,
    audit_log: [...state.audit_log, event].slice(-500),
    last_safe_checkpoint: event.event_id
  };
}

export function stageEntered(state: CaseState, stage_id: StageId, actor: 'PLAYER' | 'HOST' = 'PLAYER'): CaseState {
  return audit(state, 'stage_entered', actor, { stage_id });
}
