import { contentRegistry } from '../../content/ContentRegistry';
import type { ContentType, PlayerContentRecord } from '../../content/types';
import { getAvailableGateIds } from '../flow/InvestigationFlow';
import { isFinalGateCompleted } from '../state';
import { READING_INDEX_BASE_CHAPTER_IDS } from '../readingIndex';
import type { FormalGateId } from '../types';
import { gateDisplayConfig, getPhaseDisplay } from './phaseDisplayConfig';
import type {
  InvestigationNavModel,
  InvestigationNavSection,
  InvestigationNavState,
  NavSectionId
} from './types';

const NAV_SECTION_DEFINITIONS: ReadonlyArray<{ id: NavSectionId; label: string; order: number }> = [
  { id: 'case', label: '案件资料', order: 10 },
  { id: 'police', label: '警方调查', order: 20 },
  { id: 'deduction', label: '推理记录', order: 30 },
  { id: 'reasoning', label: '当前推理', order: 40 },
  { id: 'terminal', label: '阅读', order: 50 }
];

/**
 * This is a player-facing grouping, not a copy of ContentRegistry categories.
 * Keeping it here makes the release boundary and unread calculation auditable.
 */
export const CONTENT_TYPE_TO_NAV_SECTION: Partial<Record<ContentType, NavSectionId>> = {
  prologue: 'case',
  case_clue: 'case',
  visual_clue: 'case',
  recording: 'case',
  police_clue: 'police',
  fictional_deduction: 'deduction',
  terminal_chapter: 'terminal'
};

/** Some release records are physically visual/recording content but belong to
 * the later player-facing police-investigation area.  Keep those exceptions
 * explicit instead of making the component infer them from filenames. */
export const CONTENT_ID_TO_NAV_SECTION: Readonly<Record<string, NavSectionId>> = {
  'recording-old-treatment': 'police',
  'old-recorder-rewind': 'police',
  'tape-supplement': 'police',
  'wang-collage-photo': 'police'
};

const MATERIAL_NAV_SECTIONS = new Set<NavSectionId>(['case', 'police']);

export function getNavSectionForContent(content: Pick<PlayerContentRecord, 'id' | 'type'>): NavSectionId | null {
  return CONTENT_ID_TO_NAV_SECTION[content.id] ?? CONTENT_TYPE_TO_NAV_SECTION[content.type] ?? null;
}

export function getNavSectionForContentId(contentId: string): NavSectionId | null {
  const content = contentRegistry.getContentById(contentId);
  return content ? getNavSectionForContent(content) : null;
}

function countUnread(state: InvestigationNavState, sectionId: NavSectionId): number {
  if (sectionId === 'reasoning' || sectionId === 'terminal') return 0;

  const viewed = new Set(state.viewedContentIds);
  const unlocked = sectionId === 'deduction'
    ? state.unlockedDeductionIds
    : state.unlockedContentIds;

  return unlocked.filter((contentId) => {
    if (viewed.has(contentId)) return false;
    const content = contentRegistry.getContentById(contentId);
    return content !== undefined && getNavSectionForContent(content) === sectionId;
  }).length;
}

function hasUnlockedContent(state: InvestigationNavState, sectionId: NavSectionId): boolean {
  return state.unlockedContentIds.some((contentId) => getNavSectionForContentId(contentId) === sectionId);
}

function getForceTotal(): number {
  const runtime = contentRegistry.getGateById('force')?.runtime;
  return runtime && 'requiredCount' in runtime ? runtime.requiredCount : 4;
}

function clampForceProgress(state: InvestigationNavState): { current: number; total: number } {
  const total = getForceTotal();
  return { current: Math.min(Math.max(state.solvedForceIds.length, 0), total), total };
}

function currentTerminalId(state: InvestigationNavState): string | null {
  const fromProgress = state.terminalProgress?.chapterId;
  if (!fromProgress) return null;
  if ((READING_INDEX_BASE_CHAPTER_IDS as readonly string[]).includes(fromProgress)
    && state.unlockedContentIds.includes(fromProgress)) return fromProgress;
  return null;
}

function reasoningSection(state: InvestigationNavState, activeGateId: FormalGateId | null, activeSection: NavSectionId | null): InvestigationNavSection | null {
  const availableGateIds = getAvailableGateIds(state);
  const currentGateId = activeGateId ?? availableGateIds[0] ?? null;
  const historyGateId = state.solvedGateIds.length > 0 ? state.solvedGateIds[state.solvedGateIds.length - 1] : null;
  const targetGateId = currentGateId ?? historyGateId;
  if (!targetGateId) return null;

  const isActive = Boolean(activeGateId);
  const isAvailable = !isActive && availableGateIds.includes(targetGateId);
  const status = isActive ? 'active' : isAvailable ? 'available' : 'success';
  const forceProgress = targetGateId === 'force' ? clampForceProgress(state) : null;
  const label = status === 'success' ? gateDisplayConfig[targetGateId].successLabel : gateDisplayConfig[targetGateId].activeLabel;

  return {
    id: 'reasoning',
    label,
    visible: true,
    active: activeSection === 'reasoning' || isActive || getPhaseDisplay(state.currentPhase).navSection === 'reasoning',
    unreadCount: 0,
    order: 40,
    status,
    detail: forceProgress ? `已找到 ${forceProgress.current} / ${forceProgress.total}` : undefined,
    routeTarget: { type: 'reasoning', gateId: targetGateId }
  };
}

function buildSection(
  id: Exclude<NavSectionId, 'reasoning'>,
  state: InvestigationNavState,
  activeSection: NavSectionId | null,
  terminalMode: boolean
): InvestigationNavSection | null {
  const definition = NAV_SECTION_DEFINITIONS.find((item) => item.id === id);
  if (!definition) return null;

  if (id === 'case' && terminalMode) {
    return {
      ...definition,
      visible: true,
      active: activeSection === 'case',
      unreadCount: 0,
      routeTarget: { type: 'caseDesk', section: 'case' }
    };
  }

  const visible = id === 'deduction'
    ? state.currentPhase !== 'INTRO'
    : id === 'terminal'
      ? isFinalGateCompleted(state) && hasUnlockedContent(state, 'terminal')
      : hasUnlockedContent(state, id);

  if (!visible) return null;

  const routeTarget = id === 'deduction'
    ? { type: 'deductionShelf' as const }
    : id === 'terminal'
      ? { type: 'terminal' as const, chapterId: currentTerminalId(state) }
      : { type: 'caseDesk' as const, section: id };

  return {
    ...definition,
    visible: true,
    active: activeSection === id || (!activeSection && getPhaseDisplay(state.currentPhase).navSection === id),
    unreadCount: countUnread(state, id),
    routeTarget
  };
}

export interface InvestigationNavOptions {
  activeSection?: NavSectionId | null;
  activeGateId?: FormalGateId | null;
}

export function getInvestigationNavModel(state: InvestigationNavState, options: InvestigationNavOptions = {}): InvestigationNavModel {
  const activeSection = options.activeSection ?? null;
  const activeGateId = options.activeGateId ?? null;
  const terminalMode = isFinalGateCompleted(state) && (state.currentPhase === 'TERMINAL_REVEAL' || state.currentPhase === 'COMPLETE');
  const sections: InvestigationNavSection[] = [];

  if (terminalMode) {
    const caseSection = buildSection('case', state, activeSection, true);
    if (caseSection) sections.push(caseSection);
    const deductionSection = buildSection('deduction', state, activeSection, true);
    if (deductionSection) sections.push(deductionSection);
    const terminalSection = buildSection('terminal', state, activeSection, true);
    if (terminalSection) {
      terminalSection.active = activeSection === 'terminal' || !activeSection;
      terminalSection.routeTarget = { type: 'terminal', chapterId: currentTerminalId(state) };
      sections.push(terminalSection);
    }
  } else {
    const regularIds: Array<Exclude<NavSectionId, 'reasoning'>> = ['case', 'police', 'deduction', 'terminal'];
    for (const id of regularIds) {
      const section = buildSection(id, state, activeSection, false);
      if (section) sections.push(section);
    }
    const reasoning = reasoningSection(state, activeGateId, activeSection);
    if (reasoning) sections.push(reasoning);
  }

  sections.sort((left, right) => left.order - right.order);
  const activeLabel = activeSection ? sections.find((section) => section.id === activeSection)?.label : undefined;
  const isInvalidTerminalPhase = !isFinalGateCompleted(state) && (state.currentPhase === 'TERMINAL_REVEAL' || state.currentPhase === 'COMPLETE');
  return {
    currentPhase: state.currentPhase,
    currentLabel: activeLabel ?? (isInvalidTerminalPhase ? '案件资料' : getPhaseDisplay(state.currentPhase).navLabel),
    terminalMode,
    sections
  };
}

export function isMaterialNavSection(section: NavSectionId): section is 'case' | 'police' {
  return MATERIAL_NAV_SECTIONS.has(section);
}
