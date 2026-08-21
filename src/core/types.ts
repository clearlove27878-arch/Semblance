export type CaseStatus =
  | 'START'
  | 'IN_CASE'
  | 'CASE_TEMP_CLOSED'
  | 'FINAL_UNLOCKED'
  | 'CASE_RECONSTRUCTED'
  | 'ENDING'
  | 'REPLAY';

export type StageStatus =
  | 'LOCKED'
  | 'AVAILABLE'
  | 'IN_PROGRESS'
  | 'SUBMITTABLE'
  | 'COMPLETED'
  | 'HOST_COMPLETED';

export type DisplayMode = 'NORMAL' | 'READ_ONLY';
export type CompletionSource = 'PLAYER' | 'HOST' | 'AUTHOR_CODE';
export type AuthorOverrideAction = 'STAGE_OVERRIDE' | 'STORY_OVERRIDE' | 'REBUTTAL_OVERRIDE' | 'FINAL_UNLOCK';
export type AppView =
  | 'start'
  | 'intro'
  | 'case'
  | 'reading'
  | 'assessment'
  | 'paused'
  | 'endgame'
  | 'document'
  | 'complete'
  | 'blocked';

export type StageId =
  | 'G01' | 'G02' | 'G03' | 'G04' | 'G05' | 'G06' | 'G07'
  | 'C01' | 'C02' | 'C03' | 'C04'
  | 'T01' | 'T02' | 'T03' | 'T04'
  | 'F01' | 'F02' | 'F03' | 'F04' | 'F05' | 'F06' | 'F07' | 'F08' | 'F09'
  | 'E030';

export type EvidenceId = string;
export type FeedbackKind = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'INFO';

export interface EvidenceState {
  id: EvidenceId;
  availability: 'LOCKED' | 'AVAILABLE';
  viewed: boolean;
  viewed_versions: string[];
  current_view_version: string | null;
  used_in_stages: StageId[];
  is_output: boolean;
  output_source_stage: StageId | null;
  read_only: boolean;
}

export interface SubmissionRecord {
  ref: string;
  created_at: string;
  stage_id: StageId;
  payload: Record<string, unknown>;
  feedback_type?: FeedbackKind;
  result_code?: string;
}

export interface StageState {
  stage_id: StageId;
  status: StageStatus;
  display_mode: DisplayMode;
  draft: Record<string, unknown>;
  completed_by?: 'PLAYER' | 'HOST';
  completion_source?: CompletionSource;
  completed_at?: string;
  host_override_reason?: string;
  submission_history: SubmissionRecord[];
}

export interface ReadingState {
  current_paragraph: number;
  max_unlocked_paragraph: number;
  completed: boolean;
  host_assisted: boolean;
  author_assisted: boolean;
  last_exit_position: number;
}

export interface AuthorOverrideRecord {
  stage_id: StageId;
  timestamp: string;
  action_type: AuthorOverrideAction;
}

export interface GuessRecord {
  guess_id: string;
  player_input: string;
  created_at_stage: StageId;
  normalized_semantics: string;
  supported_now: boolean;
  support_stage: StageId | null;
  resolved_status:
    | 'RECORDED'
    | 'UNSUPPORTED_NOW'
    | 'SUPPORTED_LATER'
    | 'PARTIALLY_SUPPORTED'
    | 'CORRECTED_LATER';
  resolution_history: string[];
  created_at: string;
}

export interface AuditEvent {
  event_id: string;
  event_type: string;
  created_at: string;
  actor: 'PLAYER' | 'HOST' | 'SYSTEM';
  stage_id?: StageId;
  object_id?: string;
  from_stage_status?: StageStatus | null;
  to_stage_status?: StageStatus | null;
  evidence_field_delta?: Record<string, unknown>;
  feedback_type?: FeedbackKind;
  submission_ref?: string;
  host_override_reason?: string;
  safe_checkpoint_ref?: string;
}

export interface LastFeedback {
  kind: FeedbackKind;
  message: string;
  stage_id?: StageId;
  created_at: string;
}

export interface CaseState {
  save_version: number;
  case_status: CaseStatus;
  current_stage: StageId;
  current_view: AppView;
  stage_states: Record<StageId, StageState>;
  evidence: Record<EvidenceId, EvidenceState>;
  reading: Record<'C01' | 'C02' | 'C03' | 'C04', ReadingState>;
  guesses: GuessRecord[];
  author_override_history: AuthorOverrideRecord[];
  audit_log: AuditEvent[];
  last_feedback: LastFeedback | null;
  final_unlocked_by: 'HOST' | null;
  final_unlocked_at: string | null;
  f08_pattern_ready: boolean;
  final_timeline_ready: boolean;
  last_safe_checkpoint: string;
  intro_started: boolean;
  current_intro_step: number;
  max_unlocked_intro_step: number;
  intro_completed: boolean;
}

export interface JudgeResult {
  kind: FeedbackKind;
  code: string;
}

export interface StageMeta {
  id: StageId;
  chapter: string;
  title: string;
  view: AppView;
}
