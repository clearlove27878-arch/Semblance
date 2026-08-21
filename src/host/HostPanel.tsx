import type { CaseState, StageId } from '../core/types';

export interface HostActions {
  openAllowedEvidence: () => void;
  forceCurrentStage: () => void;
  openStory: () => void;
  resetCurrent: () => void;
  openFinal: () => void;
  resetAll: () => void;
  exit: () => void;
}

export function HostPanel({ state, actions, onExit }: { state: CaseState; actions: HostActions; onExit: () => void }) {
  const current = state.stage_states[state.current_stage];
  const trialProgress = (['T01', 'T02', 'T03', 'T04'] as StageId[]).map((id) => `${id}:${state.stage_states[id].status}`).join(' · ');
  const f08 = state.stage_states.F08.draft;
  return <main className="host-page">
    <header className="host-header"><div><p className="eyebrow">GRAYBOX HOST MODE</p><h1>主持人控制台</h1></div><button type="button" className="secondary-button" onClick={onExit}>退出主持人模式</button></header>
    <div className="host-grid">
      <section className="panel host-status"><h2>当前状态</h2><dl className="status-list"><div><dt>case_status</dt><dd>{state.case_status}</dd></div><div><dt>stage_id</dt><dd>{state.current_stage}</dd></div><div><dt>stage_status</dt><dd>{current?.status}</dd></div><div><dt>display_mode</dt><dd>{current?.display_mode}</dd></div><div><dt>PLAYER view</dt><dd>{state.current_view}</dd></div></dl><div className="host-button-row"><button type="button" className="secondary-button" onClick={actions.openAllowedEvidence}>开放当前允许证据</button><button type="button" className="primary-button" onClick={actions.forceCurrentStage}>强制通过当前阶段</button><button type="button" className="secondary-button" onClick={actions.openStory}>开放 / 代读 C 故事</button></div><div className="host-button-row"><button type="button" className="secondary-button" onClick={actions.resetCurrent}>重置当前阶段草稿</button><button type="button" className="secondary-button" onClick={actions.openFinal} disabled={state.case_status !== 'CASE_TEMP_CLOSED'}>开放《始》</button><button type="button" className="danger-button" onClick={actions.resetAll}>重置全部进度</button></div></section>
      <section className="panel"><h2>证据与阶段</h2><p className="small-note">PLAYER 当前可见 evidence keys：</p><div className="host-id-list">{Object.entries(state.evidence).map(([id, evidence]) => <span key={id} className={evidence.availability === 'AVAILABLE' ? 'id-on' : 'id-off'}>{id}{evidence.is_output ? ' · output' : ''}</span>)}</div><p className="small-note">T 进度：{trialProgress}</p><p className="small-note">E032 generated：{String(state.evidence.E032?.is_output ?? false)}</p><p className="small-note">《始》已开放：{String(state.case_status === 'FINAL_UNLOCKED' || state.case_status === 'CASE_RECONSTRUCTED')}</p><p className="small-note">F08 反证进度：{String(f08.completed_rebuttal ?? 0)}/4</p></section>
      <section className="panel"><h2>当前提交与反馈</h2><pre className="host-pre">{JSON.stringify(current?.submission_history?.slice(-3) ?? [], null, 2)}</pre>{state.last_feedback ? <div className="host-feedback"><span>{state.last_feedback.kind}</span>{state.last_feedback.message}</div> : <p className="small-note">暂无反馈。</p>}</section>
      <section className="panel"><h2>先行猜测（仅 HOST）</h2>{state.guesses.length ? <div className="guess-list">{state.guesses.map((guess) => <div key={guess.guess_id}><strong>{guess.player_input}</strong><small>{guess.created_at_stage} · {guess.resolved_status} · {guess.normalized_semantics}</small></div>)}</div> : <p className="small-note">暂无记录。</p>}</section>
      <section className="panel host-log"><h2>审计日志</h2><div className="log-list">{state.audit_log.slice(-30).reverse().map((event) => <div key={event.event_id}><span>{event.event_type}</span><small>{event.actor} · {event.stage_id ?? event.object_id ?? ''} · {new Date(event.created_at).toLocaleTimeString()}</small></div>)}</div></section>
    </div>
  </main>;
}
