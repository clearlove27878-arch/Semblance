import type { ComponentType } from 'react';
import type { AppView, CaseState, EvidenceId, StageId } from '../core/types';

export interface StageViewProps {
  state: CaseState;
  updateDraft: (stage: StageId, draft: Record<string, unknown>) => void;
  openEvidence: (id: EvidenceId, version?: string) => void;
  unlockEvidence: (id: EvidenceId) => void;
  markUsed: (ids: EvidenceId[], stage?: StageId) => void;
  enterStage: (id: StageId, view?: AppView) => void;
  openIntroReview: () => void;
  navigate: (view: AppView) => void;
  submit: (payload: Record<string, unknown>) => void;
  continueReading: (id: 'C01' | 'C02' | 'C03' | 'C04', total: number) => void;
  updateReadingExit: (id: 'C01' | 'C02' | 'C03' | 'C04') => void;
  recordGuess: (input: string) => void;
  submitSupplemental: (input: string) => void;
}

export interface StageModule {
  meta: Omit<import('../core/types').StageMeta, 'id'> & { id: string };
  default: ComponentType<StageViewProps>;
}
