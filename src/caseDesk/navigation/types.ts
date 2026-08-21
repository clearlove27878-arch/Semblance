import type { FormalGateId, InvestigationPhase } from '../types';

export type NavSectionId = 'case' | 'police' | 'deduction' | 'reasoning' | 'terminal';

export type NavRouteTarget =
  | { type: 'caseDesk'; section: 'case' | 'police' }
  | { type: 'deductionShelf' }
  | { type: 'reasoning'; gateId: FormalGateId | null }
  | { type: 'terminal'; chapterId: string | null };

export interface InvestigationNavState {
  currentPhase: InvestigationPhase;
  unlockedContentIds: readonly string[];
  viewedContentIds: readonly string[];
  solvedGateIds: readonly FormalGateId[];
  solvedForceIds: readonly string[];
  unlockedDeductionIds: readonly string[];
  terminalProgress: { chapterId: string; pageIndex: number } | null;
  completedTerminalIds: readonly string[];
}

export interface InvestigationNavSection {
  id: NavSectionId;
  label: string;
  visible: boolean;
  active: boolean;
  unreadCount: number;
  order: number;
  routeTarget: NavRouteTarget;
  detail?: string;
  status?: 'available' | 'active' | 'success';
}

export interface InvestigationNavModel {
  currentPhase: InvestigationPhase;
  currentLabel: string;
  terminalMode: boolean;
  sections: InvestigationNavSection[];
}
