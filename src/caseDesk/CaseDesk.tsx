import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { FINAL_GATE_DEFINITION, FORCE_GATE_DEFINITION, TAPPING_GATE_DEFINITION } from './gates/caseGateDefinitions';
import { matchesAcceptedTextAnswer, matchesFinalSlots, matchesPartialTextAnswer, matchesRelationSet, toggleReasoningObjectSelection } from './gates/reasoningGate';
import type { FinalGateDefinition, FinalSlotId, ReasoningGateDefinition, ReasoningGateStatus } from './gates/reasoningGate';
import { DEDUCTION_UNLOCK_SOURCE, getAvailableGateIds, isReadingChapterAccessible, READING_UNLOCK_SOURCE, resolveDeductionTitle, type FlowEvent } from './flow/InvestigationFlow';
import { PRODUCTION_FLOW } from './flow/flowDefinition';
import type { CaseState, FormalGateId, InvestigationPhase } from './types';
import type { ContentTextBlock } from '../content/types';
import { loadReadingChapter, loadStory } from './contentLoader';
import type { DeskContent, Material, StoryContent } from './content/types';
import {
  getReasoningObjectById,
  getReasoningObjectForContent,
  getReasoningObjects,
  getUnlockedReasoningObjectIds,
  type ReasoningObject,
  type ReasoningObjectKind
} from '../content/ReasoningObjectRegistry';
import { clearReasoningGateDraft, loadReasoningGateDraft, saveReasoningGateDraft } from './reasoningDraftPersistence';
import { CaseDeskHeader } from './components/CaseDeskHeader';
import { ClueCollection, type MaterialSectionFilter } from './components/ClueCollection';
import { ClueDrawer } from './components/ClueDrawer';
import { DeductionReader } from './components/DeductionReader';
import { DeductionShelf } from './components/DeductionShelf';
import { InvestigationNav } from './components/InvestigationNav';
import { MainEvidencePanel } from './components/MainEvidencePanel';
import { ReasoningGate } from './components/ReasoningGate';
import { ReasoningBar } from './components/ReasoningBar';
import { ReasoningObjectPicker } from './components/ReasoningObjectPicker';
import { ReadingReader } from './components/ReadingReader';
import { ReadingIndex } from './components/ReadingIndex';
import type { CaseClue, ReasoningMode } from './components/types';
import { filterClues, materialToClue } from './components/types';
import { copyText } from './components/clipboard';
import { getDeductionShelfItems, type DeductionShelfItem } from './deductionShelfModel';
import { getNavSectionForContentId } from './navigation/investigationNav';
import { getPhaseDisplay } from './navigation/phaseDisplayConfig';
import type { NavRouteTarget, NavSectionId } from './navigation/types';
import { getSafePhaseWithoutFinalGate, isFinalGateCompleted } from './state';
import { getReadingChapterTitle, isLanReadingChapterId, READING_CHAPTER_ORDER, resolveReadingChapterUnlock, type ReadingIndexEntry } from './readingIndex';
import { AmbientScene } from '../visual/AmbientScene';

interface CaseDeskProps {
  state: CaseState;
  onFlowEvent: (event: FlowEvent) => void;
  content: DeskContent;
  onIntroReview: () => void;
  onRestart: () => void;
  devTerminal?: boolean;
}

const GATE_DEFINITIONS: Record<FormalGateId, ReasoningGateDefinition> = {
  tapping: TAPPING_GATE_DEFINITION,
  force: FORCE_GATE_DEFINITION,
  final: FINAL_GATE_DEFINITION
};

const CHAPTER_META: Record<string, string> = {
  'novel-ling': '《玲》',
  'novel-feng': '《枫》'
};

type DeductionView =
  | { kind: 'desk' }
  | { kind: 'shelf' }
  | { kind: 'reader'; deductionId: string };

type DeductionHistoryState = {
  siDeductionView?: 'desk' | 'shelf' | 'reader';
  deductionId?: string;
  siCaseView?: 'desk' | 'material' | 'viewer' | 'gate' | 'picker' | 'reading-index' | 'reading-reader' | 'terminal';
  historyView?: string;
  materialId?: string;
  gateId?: FormalGateId;
  pickerMode?: 'relation' | 'slot';
  targetSlot?: FinalSlotId;
  activeReadingId?: string;
};

type GateSessionStatus = Exclude<ReasoningGateStatus, 'locked'>;

interface GateSession {
  gateId: FormalGateId;
  status: GateSessionStatus;
  answer: string;
  feedback: string;
  feedbackBlocks?: readonly ContentTextBlock[];
}

type PickerContext =
  | { selectionMode: 'relation'; title: string; allowedKinds: readonly ReasoningObjectKind[]; maxObjects: number }
  | { selectionMode: 'slot'; title: string; targetSlot: FinalSlotId; allowedKinds: readonly ReasoningObjectKind[] };

const FORCE_PICKER_KINDS: readonly ReasoningObjectKind[] = ['person', 'clue', 'fact'];
const FINAL_SLOT_KINDS: Readonly<Record<FinalSlotId, readonly ReasoningObjectKind[]>> = {
  killer_slot: ['person'],
  medium_slot: ['clue'],
  action_slot: ['clue', 'fact'],
  wound_slot: ['clue'],
  disposal_slot: ['clue', 'person']
};

const FINAL_SLOT_LABELS: Record<FinalSlotId, string> = {
  killer_slot: '真凶',
  medium_slot: '真正承载危险的物品',
  action_slot: '使程岚接触危险的行为习惯',
  wound_slot: '与之对应的身体创口',
  disposal_slot: '凶手怎么处理凶器'
};

function normalizedFeedbackLabel(value: string): string {
  return value.normalize('NFKC').replace(/[\s\p{P}\p{S}]+/gu, '');
}

function feedbackObjectId(label: string): string | null {
  const normalized = normalizedFeedbackLabel(label);
  if (!normalized) return null;
  return getReasoningObjects().find((object) => [object.displayName, object.standardName, ...object.aliases]
    .some((candidate) => normalizedFeedbackLabel(candidate) === normalized))?.id ?? null;
}

function extractFeedbackObjectIds(block: string): string[] {
  const lines = block.split(/\r?\n/).map((line) => line.trim());
  const markerIndex = lines.findIndex((line) => /^若玩家只(?:找到|提交)：$/.test(line));
  if (markerIndex < 0) return [];
  const endIndex = lines.findIndex((line, index) => index > markerIndex && line === '反馈：');
  if (endIndex < 0) return [];
  return [...new Set(lines.slice(markerIndex + 1, endIndex)
    .flatMap((line) => line.split(/[＋+]/u))
    .map((line) => line.trim())
    .filter((line) => line && line !== '＋' && line !== '+')
    .map(feedbackObjectId)
    .filter((id): id is string => Boolean(id)))];
}

function getForceSubmissionFeedback(candidateIds: readonly string[], definition: ReasoningGateDefinition & { type: 'relation' }): { text: string; blocks?: readonly ContentTextBlock[] } {
  const standardSets = definition.standardSets ?? [];
  const overlaps = standardSets.map((standardSet) => ({
    index: standardSets.indexOf(standardSet),
    count: standardSet.objectIds.filter((id) => candidateIds.includes(id) || candidateIds.includes(getReasoningObjectById(id)?.id ?? '')).length
  }));
  const maximum = Math.max(0, ...overlaps.map((item) => item.count));
  const maximumMatches = overlaps.filter((item) => item.count === maximum);

  if (maximum === 2 && maximumMatches.length === 1) {
    const forceFeedback = definition.forceFeedback?.[maximumMatches[0].index];
    const partialIndex = forceFeedback?.partial.findIndex((block) => {
      const objectIds = extractFeedbackObjectIds(block);
      return objectIds.length === 2 && objectIds.every((id) => candidateIds.includes(id));
    });
    if (partialIndex !== undefined && partialIndex >= 0) {
      const partial = forceFeedback?.partial[partialIndex] ?? '';
      return {
        text: partial,
        blocks: forceFeedback?.textBlocks?.partial?.slice(partialIndex, partialIndex + 1)
      };
    }
  }

  const partial = definition.feedback?.partial?.[0];
  if (partial) {
    const index = definition.feedback?.partial?.indexOf(partial) ?? -1;
    return { text: partial, blocks: index >= 0 ? definition.feedbackTextBlocks?.partial?.slice(index, index + 1) : undefined };
  }
  const incorrect = definition.feedback?.incorrect?.[0];
  if (incorrect) {
    const index = definition.feedback?.incorrect?.indexOf(incorrect) ?? -1;
    return { text: incorrect, blocks: index >= 0 ? definition.feedbackTextBlocks?.incorrect?.slice(index, index + 1) : undefined };
  }
  return { text: '这组三件材料还没有形成一个 Force。' };
}

function canonicalObjectId(objectId: string): string {
  return getReasoningObjectById(objectId)?.id ?? objectId;
}

function getFinalSubmissionFeedback(
  candidate: Partial<Record<FinalSlotId, string>>,
  definition: FinalGateDefinition
): { text: string; blocks?: readonly ContentTextBlock[] } {
  const candidateIds = [...new Set(Object.values(candidate).filter((value): value is string => Boolean(value)).map(canonicalObjectId))];
  const configuredCases = (definition.feedbackSections ?? []).flatMap((section) => section.blocks.map((block, index) => ({
    block,
    blocks: section.textBlocks?.slice(index, index + 1),
    objectIds: extractFeedbackObjectIds(block)
  })));

  const matchedCase = configuredCases
    .filter((item) => item.objectIds.length > 0 && item.objectIds.every((objectId) => candidateIds.includes(canonicalObjectId(objectId))))
    .sort((left, right) => right.objectIds.length - left.objectIds.length)[0];
  if (matchedCase) return { text: matchedCase.block, blocks: matchedCase.blocks };

  const coreSlots = (definition.slots ?? []).filter((slot) => slot.slotId !== 'disposal_slot');
  const coreComplete = coreSlots.every((slot) => {
    const candidateId = candidate[slot.slotId];
    return Boolean(candidateId) && canonicalObjectId(candidateId as string) === canonicalObjectId(slot.objectId);
  });
  if (coreComplete && !candidate.disposal_slot) {
    const missingDisposalCase = configuredCases.find((item) => item.block.includes('若玩家只完成前四项'));
    if (missingDisposalCase) return { text: missingDisposalCase.block, blocks: missingDisposalCase.blocks };
  }

  const fallback = definition.feedback?.incorrect?.[0] ?? '五个位置还没有全部对应上。';
  const index = definition.feedback?.incorrect?.indexOf(fallback) ?? -1;
  return { text: fallback, blocks: index >= 0 ? definition.feedbackTextBlocks?.incorrect?.slice(index, index + 1) : undefined };
}

function readCaseHistory(): DeductionHistoryState {
  return (window.history.state ?? {}) as DeductionHistoryState;
}

function writeCaseHistory(changes: Partial<DeductionHistoryState>, replace = false): void {
  const next = { ...readCaseHistory(), ...changes };
  if (replace) window.history.replaceState(next, '', window.location.href);
  else window.history.pushState(next, '', window.location.href);
}

function clearCaseHistoryView(): void {
  window.history.replaceState({
    ...readCaseHistory(),
    siCaseView: 'desk',
    historyView: undefined,
    materialId: undefined,
    gateId: undefined,
    pickerMode: undefined,
    targetSlot: undefined,
    activeReadingId: undefined
  }, '', window.location.href);
}

function isTerminalPhase(phase: CaseState['currentPhase']): boolean {
  return phase === 'TERMINAL_REVEAL' || phase === 'COMPLETE';
}

function initialReadingView(state: CaseState, devReading: boolean): 'reading-index' | 'reading-reader' | null {
  if (!isFinalGateCompleted(state) || !isTerminalPhase(state.currentPhase)) return null;
  if (devReading) return 'reading-index';
  const historyView = typeof window !== 'undefined' ? readCaseHistory() : {};
  if (historyView.historyView === 'terminal') return 'reading-index';
  if (historyView.siCaseView === 'reading-index') return 'reading-index';
  if (historyView.siCaseView !== 'reading-reader' && historyView.siCaseView !== 'terminal') return null;
  const readingId = historyView.activeReadingId ?? state.terminalProgress?.chapterId;
  return readingId && isReadingChapterAccessible(state, readingId) ? 'reading-reader' : 'reading-index';
}

function readingChapterLabel(id: string): string {
  if (CHAPTER_META[id]) return CHAPTER_META[id];
  if (isLanReadingChapterId(id)) return getReadingChapterTitle(id) ?? id;
  return id;
}

function isUnlockedDeduction(state: CaseState, deductionId: string): boolean {
  return (PRODUCTION_FLOW.fictionalDeductionIds as readonly string[]).includes(deductionId)
    && state.unlockedDeductionIds.includes(deductionId);
}

const DEFAULT_MATERIAL_ID = 'death-scene';

function getDefaultMaterialId(materials: readonly Material[]): string | null {
  return materials.find((item) => item.id === DEFAULT_MATERIAL_ID)?.id ?? materials[0]?.id ?? null;
}

function ReviewList({ state, content, onIntroReview, onOpenMaterial }: {
  state: CaseState;
  content: DeskContent;
  onIntroReview: () => void;
  onOpenMaterial: (item: Material) => void;
}) {
  const viewedMaterials = content.materials.filter((item) => state.viewedContentIds.includes(item.id));
  const hasAny = viewedMaterials.length > 0 || state.intro_completed;
  const count = viewedMaterials.length;
  return (
    <aside className="review-panel">
      <div className="section-heading compact-heading"><h2>资料</h2><span className="section-count">{count}</span></div>
      {!hasAny ? <p className="review-empty">还没有打开过资料。</p> : null}
      {state.intro_completed ? <button type="button" className="review-link" onClick={onIntroReview}><span>序</span><small>回看序</small></button> : null}
      {viewedMaterials.map((item) => <button type="button" className="review-link" key={item.id} onClick={() => onOpenMaterial(item)}><span>{item.title}</span><small>已阅</small></button>)}
    </aside>
  );
}

function FinalSlotPicker({ values, onChoose, onClear }: { values: Partial<Record<FinalSlotId, string>>; onChoose: (slotId: FinalSlotId) => void; onClear: (slotId: FinalSlotId) => void }) {
  return (
    <div className="gate-answer-surface final-slot-surface">
      <p className="gate-answer-label">把五个位置分别说清楚</p>
      {(Object.keys(FINAL_SLOT_LABELS) as FinalSlotId[]).map((slotId) => {
        const objectId = values[slotId];
        const object = objectId ? getReasoningObjectById(objectId) : undefined;
        return (
          <div className="final-slot-row" key={slotId}>
            <div className="final-slot-copy">
              <span className="final-slot-label">{FINAL_SLOT_LABELS[slotId]}</span>
              <span className="final-slot-value">{object?.displayName ?? '尚未选择'}</span>
            </div>
            <div className="final-slot-actions">
              <button type="button" className="secondary-button" onClick={() => onChoose(slotId)}>{object ? '重新选择' : '选择'}</button>
              {object ? <button type="button" className="text-button" onClick={() => onClear(slotId)}>清除</button> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FlowNotice({ children }: { children: ReactNode }) {
  return <p className="flow-notice" role="status" aria-live="polite">{children}</p>;
}

export function CaseDesk({ state, onFlowEvent, content, onIntroReview, onRestart, devTerminal = false }: CaseDeskProps) {
  const finalGateCompleted = isFinalGateCompleted(state);
  const readingViewAllowed = finalGateCompleted && isTerminalPhase(state.currentPhase);
  const [activeMaterialId, setActiveMaterialId] = useState<string | null>(() => getDefaultMaterialId(content.materials));
  const [readingStory, setReadingStory] = useState<StoryContent | null>(null);
  const [deductionView, setDeductionView] = useState<DeductionView>(() => {
    const historyView = typeof window !== 'undefined' ? readCaseHistory() : {};
    if (historyView.siDeductionView === 'shelf') return { kind: 'shelf' };
    if (historyView.siDeductionView === 'reader' && historyView.deductionId && isUnlockedDeduction(state, historyView.deductionId)) {
      return { kind: 'reader', deductionId: historyView.deductionId };
    }
    return { kind: 'desk' };
  });
  const [deductionStory, setDeductionStory] = useState<StoryContent | null>(null);
  const [deductionStoryLoading, setDeductionStoryLoading] = useState(false);
  const initialReadingRoute = initialReadingView(state, devTerminal);
  const [readingReaderOpen, setReadingReaderOpen] = useState(initialReadingRoute === 'reading-reader');
  const [readingIndexOpen, setReadingIndexOpen] = useState(initialReadingRoute === 'reading-index');
  const [readingNotice, setReadingNotice] = useState('');
  const [viewerOpen, setViewerOpen] = useState(false);
  const [gateSession, setGateSession] = useState<GateSession | null>(null);
  const [finalSlotValues, setFinalSlotValues] = useState<Partial<Record<FinalSlotId, string>>>({});
  const [pickerContext, setPickerContext] = useState<PickerContext | null>(null);
  const [clueSearch, setClueSearch] = useState('');
  const [readingSearchTerm, setReadingSearchTerm] = useState('');
  const [reasoningMode, setReasoningMode] = useState<ReasoningMode>('search');
  const [relationIds, setRelationIds] = useState<string[]>([]);
  const [clueDrawerOpen, setClueDrawerOpen] = useState(false);
  const [activeMaterialSection, setActiveMaterialSection] = useState<MaterialSectionFilter>('all');
  const [activeSection, setActiveSection] = useState<NavSectionId | null>(null);
  const [reviewGateId, setReviewGateId] = useState<FormalGateId | null>(null);
  const [copiedClueId, setCopiedClueId] = useState<string | null>(null);
  const [flowNotice, setFlowNotice] = useState('');
  const [deductionNotice, setDeductionNotice] = useState('');
  const previousUnlockedRef = useRef<string[] | null>(null);
  const pendingMaterialScrollRef = useRef(false);

  const publishedMaterials = useMemo(() => content.materials.filter((item) => state.unlockedContentIds.includes(item.id)), [content.materials, state.unlockedContentIds]);
  const deductionShelfItems = useMemo(() => getDeductionShelfItems(state.unlockedDeductionIds, state.viewedContentIds), [state.unlockedDeductionIds, state.viewedContentIds]);
  const clues = useMemo(() => publishedMaterials.map((item) => materialToClue(item, state.viewedContentIds.includes(item.id))), [publishedMaterials, state.viewedContentIds]);
  const availableMaterialSections = useMemo<MaterialSectionFilter[]>(() => {
    const sections: MaterialSectionFilter[] = ['all'];
    if (clues.some((item) => getNavSectionForContentId(item.id) === 'case')) sections.push('case');
    if (clues.some((item) => getNavSectionForContentId(item.id) === 'police')) sections.push('police');
    return sections;
  }, [clues]);
  const scopedClues = useMemo(() => activeMaterialSection === 'all'
    ? clues
    : clues.filter((item) => getNavSectionForContentId(item.id) === activeMaterialSection), [activeMaterialSection, clues]);
  const searchedClues = useMemo(() => filterClues(scopedClues, clueSearch), [clueSearch, scopedClues]);
  const visibleClues = reasoningMode === 'search' ? searchedClues : scopedClues;
  const clueById = useMemo(() => new Map(clues.map((item) => [item.id, item])), [clues]);
  const defaultMaterialId = useMemo(() => getDefaultMaterialId(publishedMaterials), [publishedMaterials]);
  const reasoningObjects = useMemo(() => getReasoningObjects(state.unlockedContentIds), [state.unlockedContentIds]);
  const unlockedObjectIds = useMemo(() => getUnlockedReasoningObjectIds(state.unlockedContentIds), [state.unlockedContentIds]);
  const relationChips = useMemo(() => relationIds.flatMap((id) => {
    const object = getReasoningObjectById(id, state.unlockedContentIds);
    return object ? [{ id: object.id, label: object.standardName || object.displayName }] : [];
  }), [relationIds, state.unlockedContentIds]);
  const availableGateIds = getAvailableGateIds(state);
  const activeReadingId = state.terminalProgress?.chapterId ?? null;

  useEffect(() => {
    setActiveMaterialId((current) => current && clueById.has(current) ? current : defaultMaterialId);
    if (!defaultMaterialId) setViewerOpen(false);
  }, [clueById, defaultMaterialId]);

  useEffect(() => {
    if (!activeMaterialId) return;
    const activeClue = clueById.get(activeMaterialId);
    if (!activeClue || activeClue.viewed) return;
    onFlowEvent({ type: 'CONTENT_VIEWED', contentId: activeMaterialId });
  }, [activeMaterialId, clueById, onFlowEvent]);

  useEffect(() => {
    if (!pendingMaterialScrollRef.current || !activeMaterialId || !window.matchMedia('(max-width: 760px)').matches) return undefined;
    pendingMaterialScrollRef.current = false;
    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        document.getElementById('material-reader')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
    return () => {
      window.cancelAnimationFrame(firstFrame);
      if (secondFrame) window.cancelAnimationFrame(secondFrame);
    };
  }, [activeMaterialId]);

  useEffect(() => {
    const previous = previousUnlockedRef.current;
    previousUnlockedRef.current = state.unlockedContentIds;
    if (!previous) return;
    const added = state.unlockedContentIds.filter((id) => !previous.includes(id));
    const addedInvestigationContent = added.filter((id) => getNavSectionForContentId(id) !== 'deduction');
    if (addedInvestigationContent.length > 0) {
      setFlowNotice(`新的调查内容已加入案件桌（${addedInvestigationContent.length}）`);
      const timer = window.setTimeout(() => setFlowNotice(''), 4200);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [state.unlockedContentIds]);

  useEffect(() => {
    if (!readingViewAllowed) {
      setReadingStory(null);
      return undefined;
    }
    if (!activeReadingId || !isReadingChapterAccessible(state, activeReadingId)) {
      setReadingStory(null);
      return undefined;
    }
    let cancelled = false;
    setReadingStory(null);
    void loadReadingChapter(activeReadingId).then((story) => { if (!cancelled) setReadingStory(story); });
    return () => { cancelled = true; };
  }, [activeReadingId, readingViewAllowed, state.currentPhase, state.solvedGateIds, state.unlockedReadingChapterIds]);

  useEffect(() => {
    const current = readCaseHistory();
    const legacyReadingId = current.activeReadingId ?? state.terminalProgress?.chapterId;
    const devDefaultReading = devTerminal && !current.siCaseView && current.historyView === undefined;
    const initialCaseView = devDefaultReading
      ? 'reading-index'
      : current.historyView === 'terminal'
      ? readingViewAllowed ? 'reading-index' : 'desk'
      : current.siCaseView === 'terminal'
        ? readingViewAllowed && legacyReadingId && isReadingChapterAccessible(state, legacyReadingId)
          ? 'reading-reader'
          : readingViewAllowed ? 'reading-index' : 'desk'
        : (current.siCaseView === 'reading-index' || current.siCaseView === 'reading-reader') && !readingViewAllowed
          ? 'desk'
          : current.siCaseView ?? 'desk';
    if (current.siCaseView !== initialCaseView || current.historyView !== undefined || current.siDeductionView === undefined) {
      window.history.replaceState({ ...current, siCaseView: initialCaseView, historyView: undefined, siDeductionView: current.siDeductionView ?? 'desk' }, '', window.location.href);
    }

    const restoreCaseView = (next: DeductionHistoryState) => {
      const view = next.siCaseView ?? 'desk';
      if (view === 'material' || view === 'viewer') {
        const item = next.materialId ? content.materials.find((candidate) => candidate.id === next.materialId) : undefined;
        if (item) {
          setActiveMaterialId(item.id);
          setViewerOpen(view === 'viewer' && Boolean(item.image));
          setPickerContext(null);
          return;
        }
        setActiveMaterialId(getDefaultMaterialId(content.materials));
        setViewerOpen(false);
        setPickerContext(null);
        window.history.replaceState({
          ...readCaseHistory(),
          siCaseView: 'desk',
          materialId: undefined,
          gateId: undefined,
          pickerMode: undefined,
          targetSlot: undefined
        }, '', window.location.href);
        return;
      }
      if (view === 'gate' || view === 'picker') {
        setViewerOpen(false);
        if (next.gateId && (!gateSession || gateSession.gateId !== next.gateId)) openGate(next.gateId, false);
        if (view !== 'picker') setPickerContext(null);
        return;
      }
      if (view === 'reading-reader' || view === 'terminal') {
        const requestedReadingId = next.activeReadingId;
        const currentReadingId = state.terminalProgress?.chapterId;
        const safeReadingId = requestedReadingId ?? currentReadingId;
        if (!readingViewAllowed || !safeReadingId || !isReadingChapterAccessible(state, safeReadingId)
          || (requestedReadingId && currentReadingId !== requestedReadingId)) {
          setReadingReaderOpen(false);
          setViewerOpen(false);
          setPickerContext(null);
          setGateSession(null);
          setReasoningMode('search');
          setReadingIndexOpen(readingViewAllowed);
          if (readingViewAllowed) {
            window.history.replaceState({ ...readCaseHistory(), siCaseView: 'reading-index', historyView: undefined, activeReadingId: undefined }, '', window.location.href);
          } else {
            clearCaseHistoryView();
          }
          return;
        }
        setViewerOpen(false);
        setPickerContext(null);
        setGateSession(null);
        setReasoningMode('search');
        setReadingIndexOpen(false);
        setReadingReaderOpen(true);
        return;
      }
      if (view === 'reading-index') {
        if (!readingViewAllowed) {
          setReadingReaderOpen(false);
          setReadingIndexOpen(false);
          setViewerOpen(false);
          setPickerContext(null);
          setGateSession(null);
          setReasoningMode('search');
          clearCaseHistoryView();
          return;
        }
        setViewerOpen(false);
        setPickerContext(null);
        setGateSession(null);
        setReasoningMode('search');
        setReadingReaderOpen(false);
        setReadingIndexOpen(true);
        return;
      }
      setViewerOpen(false);
      setPickerContext(null);
      setGateSession(null);
      setReviewGateId(null);
      setReasoningMode('search');
      setReadingReaderOpen(false);
      setReadingIndexOpen(false);
    };

    restoreCaseView({ ...current, siCaseView: initialCaseView });

    const handlePopState = () => {
      const next = readCaseHistory();
      if (next.siDeductionView === 'shelf') {
        setActiveSection('deduction');
        setDeductionStory(null);
        setDeductionView({ kind: 'shelf' });
        return;
      }
      if (next.siDeductionView === 'reader' && next.deductionId) {
        if (!isUnlockedDeduction(state, next.deductionId)) {
          setActiveSection('deduction');
          setDeductionStory(null);
          setDeductionView({ kind: 'shelf' });
          window.history.replaceState({ ...next, siDeductionView: 'shelf', deductionId: undefined }, '', window.location.href);
          return;
        }
        setActiveSection('deduction');
        setDeductionView({ kind: 'reader', deductionId: next.deductionId });
        return;
      }
      setDeductionStory(null);
      setDeductionView({ kind: 'desk' });
      restoreCaseView(next);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [content.materials, devTerminal, gateSession, state.currentPhase, state.solvedGateIds, state.unlockedReadingChapterIds, state.terminalProgress?.chapterId, readingViewAllowed]);

  useEffect(() => {
    if (deductionView.kind !== 'reader') {
      setDeductionStory(null);
      setDeductionStoryLoading(false);
      return undefined;
    }
    if (!isUnlockedDeduction(state, deductionView.deductionId)) {
      setDeductionStory(null);
      setDeductionStoryLoading(false);
      setDeductionView({ kind: 'shelf' });
      window.history.replaceState({ ...(window.history.state ?? {}), siDeductionView: 'shelf', deductionId: undefined }, '', window.location.href);
      return undefined;
    }

    let cancelled = false;
    setDeductionStory(null);
    setDeductionStoryLoading(true);
    void loadStory(deductionView.deductionId).then((story) => {
      if (cancelled) return;
      setDeductionStory(story);
      setDeductionStoryLoading(false);
    }).catch(() => {
      if (cancelled) return;
      setDeductionStoryLoading(false);
      setDeductionView({ kind: 'shelf' });
      window.history.replaceState({ ...(window.history.state ?? {}), siDeductionView: 'shelf', deductionId: undefined }, '', window.location.href);
    });
    return () => { cancelled = true; };
  }, [deductionView, state]);

  useEffect(() => {
    if (gateSession && !isGatePhaseForSession(state.currentPhase, gateSession.gateId)) {
      setGateSession(null);
      setPickerContext(null);
      setReasoningMode('search');
    }
  }, [gateSession, state.currentPhase]);

  useEffect(() => {
    if (!gateSession || gateSession.status === 'success') return;
    if (gateSession.gateId === 'force') {
      saveReasoningGateDraft('force', { relationObjectIds: relationIds, finalSlotValues: {} });
    } else if (gateSession.gateId === 'final') {
      saveReasoningGateDraft('final', { relationObjectIds: [], finalSlotValues: finalSlotValues });
    }
  }, [finalSlotValues, gateSession, relationIds]);

  useEffect(() => {
    if (gateSession?.status !== 'success') return;
    clearReasoningGateDraft(gateSession.gateId);
  }, [gateSession?.gateId, gateSession?.status]);

  const openMaterial = (item: Material, options: { replaceHistory?: boolean } = {}) => {
    onFlowEvent({ type: 'CONTENT_VIEWED', contentId: item.id });
    if (item.id !== activeMaterialId && window.matchMedia('(max-width: 760px)').matches) pendingMaterialScrollRef.current = true;
    setActiveMaterialId(item.id);
    setViewerOpen(false);
    writeCaseHistory({ siCaseView: 'material', materialId: item.id, gateId: undefined, pickerMode: undefined, targetSlot: undefined }, Boolean(options.replaceHistory));
  };

  const pushDeductionHistory = (next: DeductionHistoryState) => {
    window.history.pushState(next, '', window.location.href);
  };

  const replaceWithDeskHistory = () => {
    window.history.replaceState({ ...readCaseHistory(), siDeductionView: 'desk', deductionId: undefined, siCaseView: 'desk' }, '', window.location.href);
  };

  const leaveDeductionToDesk = () => {
    replaceWithDeskHistory();
    setDeductionStory(null);
    setDeductionView({ kind: 'desk' });
  };

  const openDeductionShelf = () => {
    if (deductionView.kind === 'desk') pushDeductionHistory({ siDeductionView: 'shelf' });
    setActiveSection('deduction');
    setDeductionView({ kind: 'shelf' });
  };

  const openStory = (item: DeductionShelfItem) => {
    if (!item.unlocked || !isUnlockedDeduction(state, item.id)) {
      setActiveSection('deduction');
      setDeductionView({ kind: 'shelf' });
      return;
    }
    onFlowEvent({ type: 'CONTENT_VIEWED', contentId: item.id });
    if (deductionView.kind === 'desk') pushDeductionHistory({ siDeductionView: 'shelf' });
    pushDeductionHistory({ siDeductionView: 'reader', deductionId: item.id });
    setActiveSection('deduction');
    setDeductionView({ kind: 'reader', deductionId: item.id });
  };

  const returnToDeductionShelf = () => {
    if (deductionView.kind === 'reader') {
      window.history.replaceState({ ...readCaseHistory(), siDeductionView: 'shelf', deductionId: undefined }, '', window.location.href);
      setActiveSection('deduction');
      setDeductionStory(null);
      setDeductionView({ kind: 'shelf' });
      return;
    }
    openDeductionShelf();
  };

  const openReadingById = (id: string) => {
    if (!isReadingChapterAccessible(state, id)) {
      setReadingReaderOpen(false);
      setReadingIndexOpen(readingViewAllowed);
      if (readingViewAllowed) {
        window.history.replaceState({ ...readCaseHistory(), siCaseView: 'reading-index', activeReadingId: undefined }, '', window.location.href);
      } else {
        clearCaseHistoryView();
        setActiveSection('case');
      }
      return;
    }
    writeCaseHistory({ siCaseView: 'reading-reader', materialId: undefined, gateId: undefined, pickerMode: undefined, targetSlot: undefined, activeReadingId: id });
    setReadingIndexOpen(false);
    setReadingReaderOpen(true);
    setViewerOpen(false);
    onFlowEvent({ type: 'OPEN_READING_CHAPTER', chapterId: id });
  };

  const openChapter = openReadingById;

  const openReadingIndex = () => {
    if (!readingViewAllowed) return;
    if (readCaseHistory().siCaseView !== 'reading-index') {
      writeCaseHistory({ siCaseView: 'reading-index', materialId: undefined, gateId: undefined, pickerMode: undefined, targetSlot: undefined, activeReadingId: undefined });
    }
    setReadingNotice('');
    setReadingReaderOpen(false);
    setReadingIndexOpen(true);
    setReadingSearchTerm('');
    setViewerOpen(false);
    setPickerContext(null);
    setGateSession(null);
    setReasoningMode('search');
  };

  const completeReadingChapter = (pageIndex: number, totalPages: number) => {
    if (!readingStory) return;
    onFlowEvent({ type: 'READING_CHAPTER_COMPLETED', chapterId: readingStory.id, pageIndex, totalPages });
  };

  const finishReadingChapter = (pageIndex: number, totalPages: number) => {
    if (!readingStory || readingStory.id !== 'lan-death') return;
    completeReadingChapter(pageIndex, totalPages);
    onFlowEvent({ type: 'ENTER_FINAL_ENDING', chapterId: readingStory.id, pageIndex, totalPages });
  };

  const openReadingEntry = (entry: ReadingIndexEntry) => {
    if (!isReadingChapterAccessible(state, entry.id)) {
      setReadingNotice(entry.kind === 'lan' ? '这段阅读内容尚未发现。' : '这段阅读内容暂不可用。');
      return;
    }
    if (!readingViewAllowed) return;
    setReadingNotice('');
    openReadingById(entry.id);
  };

  const openEvidenceViewer = () => {
    if (!activeMaterialId) return;
    writeCaseHistory({ siCaseView: 'viewer', materialId: activeMaterialId });
    setViewerOpen(true);
  };

  const closeEvidenceViewer = () => {
    if (readCaseHistory().siCaseView === 'viewer') {
      window.history.replaceState({ ...readCaseHistory(), siCaseView: 'material', viewerOpen: undefined }, '', window.location.href);
      setViewerOpen(false);
      return;
    }
    setViewerOpen(false);
  };

  const addRelation = (item: CaseClue) => {
    const allowedKinds = gateSession?.gateId === 'force' ? FORCE_PICKER_KINDS : undefined;
    const object = item.relationObjectId
      ? getReasoningObjectById(item.relationObjectId, state.unlockedContentIds)
      : getReasoningObjectForContent(item.id, allowedKinds);
    if (!object || (allowedKinds && !allowedKinds.includes(object.kind))) {
      setFlowNotice('这条材料不能加入当前推理。');
      return;
    }
    setRelationIds((previous) => {
      if (previous.includes(object.id)) return previous;
      const maxObjects = gateSession?.gateId === 'force' ? 3 : 4;
      if (previous.length >= maxObjects) return previous;
      return [...previous, object.id];
    });
  };
  const removeRelation = (id: string) => setRelationIds((previous) => previous.filter((item) => item !== id));

  const copyClueName = async (item: CaseClue) => {
    const copied = await copyText(item.standardName ?? item.title);
    if (!copied) return;
    setCopiedClueId(item.id);
    window.setTimeout(() => setCopiedClueId((previous) => previous === item.id ? null : previous), 1600);
  };

  const openGate = (gateId: FormalGateId, pushHistory = true) => {
    if (!availableGateIds.includes(gateId)) return;
    setReviewGateId(null);
    if (pushHistory) {
      writeCaseHistory({ siCaseView: 'gate', gateId, materialId: undefined, pickerMode: undefined, targetSlot: undefined });
    }
    onFlowEvent({ type: 'ENTER_GATE', gateId });
    const draft = loadReasoningGateDraft(gateId);
    if (gateId === 'force') setRelationIds(draft?.relationObjectIds ?? relationIds.slice(0, 3));
    if (gateId === 'final') setFinalSlotValues(draft?.finalSlotValues ?? {});
    setPickerContext(null);
    setGateSession({
      gateId,
        status: gateId === 'force' && state.solvedForceIds.length > 0 ? 'active' : 'available',
        answer: '',
      feedback: '',
      feedbackBlocks: undefined
    });
    setReasoningMode(gateId === 'tapping' ? 'answer' : 'relation');
  };

  const closeReasoningGate = () => {
    if (gateSession?.status === 'success') onFlowEvent({ type: 'GATE_SOLVED', gateId: gateSession.gateId });
    if (gateSession?.status !== 'success' && gateSession?.gateId === 'force') {
      saveReasoningGateDraft('force', { relationObjectIds: relationIds, finalSlotValues: {} });
    }
    if (gateSession?.status !== 'success' && gateSession?.gateId === 'final') {
      saveReasoningGateDraft('final', { relationObjectIds: [], finalSlotValues });
    }
    onFlowEvent({ type: 'RETURN_TO_DESK' });
    // “回到案件桌”只关闭当前 Gate 视图。即使 Final Gate 已经通过，
    // 状态仍由现有 flow 进入终盘阶段，但不能把返回按钮改成打开终盘阅读器。
    setReadingReaderOpen(false);
    setReadingIndexOpen(false);
    clearCaseHistoryView();
    setPickerContext(null);
    setGateSession(null);
    setReasoningMode('search');
  };

  const returnFromReadingToDesk = () => {
    setReadingReaderOpen(false);
    setReadingIndexOpen(false);
    onFlowEvent({ type: 'RETURN_TO_DESK' });
    clearCaseHistoryView();
  };

  const returnFromReadingToReadingIndex = () => {
    onFlowEvent({ type: 'RETURN_TO_READING_INDEX' });
    openReadingIndex();
  };

  const closeGateReview = () => setReviewGateId(null);

  const focusDeskSection = (section: NavSectionId) => {
    const targetId = section === 'deduction' ? 'deduction-records' : section === 'reasoning' ? 'reasoning-node' : 'case-materials';
    window.requestAnimationFrame(() => document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const handleNavNavigate = (target: NavRouteTarget) => {
    if (target.type === 'caseDesk') {
      if (deductionView.kind !== 'desk') leaveDeductionToDesk();
      if (isTerminalPhase(state.currentPhase)) {
        returnFromReadingToDesk();
        setActiveSection('case');
        return;
      }
      setActiveSection(target.section);
      setActiveMaterialSection(target.section);
      focusDeskSection(target.section);
      return;
    }

    if (target.type === 'deductionShelf') {
      if (deductionView.kind === 'reader') {
        returnToDeductionShelf();
        return;
      }
      if (isTerminalPhase(state.currentPhase)) {
        setReadingReaderOpen(false);
        setReadingIndexOpen(false);
        onFlowEvent({ type: 'RETURN_TO_DESK' });
      }
      setActiveSection('deduction');
      setActiveMaterialSection('all');
      if (deductionView.kind === 'desk') openDeductionShelf();
      return;
    }

    if (target.type === 'reasoning') {
      if (deductionView.kind !== 'desk') leaveDeductionToDesk();
      setActiveSection('reasoning');
      if (gateSession?.gateId === target.gateId) {
        focusDeskSection('reasoning');
        return;
      }
      if (target.gateId && availableGateIds.includes(target.gateId)) {
        openGate(target.gateId);
      } else if (target.gateId && state.solvedGateIds.includes(target.gateId)) {
        setReviewGateId(target.gateId);
      }
      focusDeskSection('reasoning');
      return;
    }

    if (!finalGateCompleted) {
      setReadingReaderOpen(false);
      setReadingIndexOpen(false);
      clearCaseHistoryView();
      setActiveSection('case');
      return;
    }

    if (deductionView.kind !== 'desk') leaveDeductionToDesk();
    setActiveSection('terminal');
    if (isTerminalPhase(state.currentPhase)) {
      openReadingIndex();
    } else if (target.chapterId) {
      openReadingById(target.chapterId);
    }
  };

  const handleGateSolved = (gateId: string) => {
    if (gateId === 'tapping' || gateId === 'force' || gateId === 'final') onFlowEvent({ type: 'GATE_SOLVED', gateId });
  };

  const updateGateAnswer = (value: string) => {
    setGateSession((previous) => previous ? { ...previous, answer: value, status: value.trim() ? 'active' : 'available', feedback: '', feedbackBlocks: undefined } : previous);
  };

  const submitActiveGate = () => {
    if (!gateSession || gateSession.status === 'success') return;
    if (gateSession.gateId === 'tapping') {
      if (matchesAcceptedTextAnswer(gateSession.answer, TAPPING_GATE_DEFINITION.acceptedAnswers)) {
        setGateSession((previous) => previous ? { ...previous, status: 'success', feedback: '', feedbackBlocks: undefined } : previous);
      } else if (matchesPartialTextAnswer(gateSession.answer, TAPPING_GATE_DEFINITION.partialAnswers ?? [])) {
        setGateSession((previous) => previous ? { ...previous, status: 'incorrect', feedback: '方向接近，但还不是他真正表达的意思。', feedbackBlocks: undefined } : previous);
      } else {
        setGateSession((previous) => previous ? { ...previous, status: 'incorrect', feedback: '这个解释还不能对应现有材料。', feedbackBlocks: undefined } : previous);
      }
      return;
    }
    if (gateSession.gateId === 'force') {
      if (relationIds.length !== 3) {
        setGateSession((previous) => previous ? { ...previous, status: 'incorrect', feedback: '先选三件材料。', feedbackBlocks: undefined } : previous);
        return;
      }
      const forceId = matchesRelationSet(relationIds, FORCE_GATE_DEFINITION.standardSets ?? []);
      if (!forceId) {
        const submissionFeedback = getForceSubmissionFeedback(relationIds, FORCE_GATE_DEFINITION);
        setGateSession((previous) => previous ? {
          ...previous,
          status: 'incorrect',
          feedback: submissionFeedback.text,
          feedbackBlocks: submissionFeedback.blocks
        } : previous);
        return;
      }
      if (state.solvedForceIds.includes(forceId)) {
        setGateSession((previous) => previous ? { ...previous, status: 'incorrect', feedback: '这个 Force 已经找到了。', feedbackBlocks: undefined } : previous);
        return;
      }
      onFlowEvent({ type: 'FORCE_SOLVED', forceId });
      const total = FORCE_GATE_DEFINITION.standardSets?.length ?? 4;
      const nextCount = new Set([...state.solvedForceIds, forceId]).size;
      const forceIndex = FORCE_GATE_DEFINITION.standardSets?.findIndex((item) => item.forceId === forceId) ?? -1;
      const forceSuccess = forceIndex >= 0 ? FORCE_GATE_DEFINITION.forceFeedback?.[forceIndex]?.success.join('\n\n') : undefined;
      const forceSuccessBlocks = forceIndex >= 0 ? FORCE_GATE_DEFINITION.forceFeedback?.[forceIndex]?.textBlocks?.success : undefined;
      setGateSession((previous) => previous ? {
        ...previous,
        status: nextCount >= total ? 'success' : 'active',
        feedback: nextCount >= total ? '' : forceSuccess ?? '这组关系已经记录。',
        feedbackBlocks: nextCount >= total ? undefined : forceSuccessBlocks
      } : previous);
      setRelationIds([]);
      saveReasoningGateDraft('force', { relationObjectIds: [], finalSlotValues: {} });
      return;
    }
    if (matchesFinalSlots(finalSlotValues, FINAL_GATE_DEFINITION.slots ?? [])) {
      setGateSession((previous) => previous ? { ...previous, status: 'success', feedback: '', feedbackBlocks: undefined } : previous);
    } else {
      const submissionFeedback = getFinalSubmissionFeedback(finalSlotValues, FINAL_GATE_DEFINITION);
      setGateSession((previous) => previous ? {
        ...previous,
        status: 'incorrect',
        feedback: submissionFeedback.text,
        feedbackBlocks: submissionFeedback.blocks
      } : previous);
    }
  };

  const handleReasoningSubmit = () => {
    if (gateSession) {
      submitActiveGate();
      return;
    }
    if (reasoningMode !== 'search') return;
    const searchContext = readingIndexOpen
      ? 'reading-index'
      : deductionView.kind === 'shelf'
        ? 'deduction'
        : 'case-desk';
    if (searchContext === 'reading-index') {
      const chapterId = resolveReadingChapterUnlock(readingSearchTerm);
      if (!chapterId) return;
      if (state.unlockedReadingChapterIds.includes(chapterId)) {
        setReadingNotice('这段阅读内容已经在索引中。');
        return;
      }
      onFlowEvent({ type: 'READING_CHAPTER_UNLOCKED', chapterId, source: READING_UNLOCK_SOURCE });
      setReadingSearchTerm('');
      setReadingNotice('发现了一段新的阅读内容。');
      return;
    }
    if (searchContext === 'case-desk') {
      if (window.matchMedia('(max-width: 760px)').matches) {
        focusDeskSection(activeMaterialSection === 'all' ? 'case' : activeMaterialSection);
      } else {
        setClueDrawerOpen(true);
      }
      return;
    }
    // Deduction owns its exact-title resolver; it is not shared with the
    // CaseDesk material filter or the Reading chapter resolver.
    const match = resolveDeductionTitle(state, clueSearch);
    if (!match) return;
    if (match.alreadyUnlocked) {
      const item = deductionShelfItems.find((story) => story.id === match.deductionId);
      if (item) openStory(item);
      return;
    }
    if (!['POLICE_INVESTIGATION', 'FORCE_GATE', 'DEDUCTION_PHASE', 'FINAL_GATE'].includes(state.currentPhase)) return;
    onFlowEvent({ type: 'DEDUCTION_UNLOCKED', deductionId: match.deductionId, source: DEDUCTION_UNLOCK_SOURCE });
    setClueSearch('');
    setDeductionNotice('发现一套新的推理。');
    window.setTimeout(() => setDeductionNotice(''), 3200);
  };

  const updateFinalSlot = (slotId: FinalSlotId, objectId: string) => {
    setFinalSlotValues((previous) => ({ ...previous, [slotId]: objectId }));
    setGateSession((previous) => previous ? { ...previous, status: 'active', feedback: '', feedbackBlocks: undefined } : previous);
  };

  const openRelationPicker = () => {
    if (!gateSession || gateSession.gateId !== 'force' || gateSession.status === 'success') return;
    writeCaseHistory({ siCaseView: 'picker', gateId: gateSession.gateId, pickerMode: 'relation', targetSlot: undefined });
    setPickerContext({ selectionMode: 'relation', title: '选择推理对象', allowedKinds: FORCE_PICKER_KINDS, maxObjects: 3 });
  };

  const openFinalSlotPicker = (slotId: FinalSlotId) => {
    if (!gateSession || gateSession.gateId !== 'final' || gateSession.status === 'success') return;
    writeCaseHistory({ siCaseView: 'picker', gateId: gateSession.gateId, pickerMode: 'slot', targetSlot: slotId });
    setPickerContext({ selectionMode: 'slot', title: `选择：${FINAL_SLOT_LABELS[slotId]}`, targetSlot: slotId, allowedKinds: FINAL_SLOT_KINDS[slotId] });
  };

  const closePicker = () => {
    if (readCaseHistory().siCaseView === 'picker') {
      const current = readCaseHistory();
      window.history.replaceState({ ...current, siCaseView: current.gateId ? 'gate' : 'desk', pickerMode: undefined, targetSlot: undefined }, '', window.location.href);
      setPickerContext(null);
      return;
    }
    setPickerContext(null);
  };

  const handlePickerSelect = (objectId: string, targetSlot?: FinalSlotId) => {
    if (!pickerContext) return;
    if (pickerContext.selectionMode === 'relation') {
      setRelationIds((previous) => toggleReasoningObjectSelection(previous, objectId, pickerContext.maxObjects));
      setGateSession((previous) => previous ? { ...previous, status: 'active', feedback: '', feedbackBlocks: undefined } : previous);
      return;
    }
    if (!targetSlot) return;
    const usedInOtherSlot = Object.entries(finalSlotValues).some(([slotId, value]) => slotId !== targetSlot && value === objectId);
    if (usedInOtherSlot) return;
    updateFinalSlot(targetSlot, objectId);
    closePicker();
  };

  const clearFinalSlot = (slotId: FinalSlotId) => {
    setFinalSlotValues((previous) => {
      const next = { ...previous };
      delete next[slotId];
      return next;
    });
    setGateSession((previous) => previous ? { ...previous, status: 'active', feedback: '' } : previous);
  };

  const viewPickerSource = (object: ReasoningObject) => {
    const sourceId = object.sourceContentIds.find((id) => clueById.has(id));
    const material = sourceId ? clueById.get(sourceId) : undefined;
    if (!material) {
      setFlowNotice('当前来源还不能在案件桌打开。');
      return;
    }
    setPickerContext(null);
    openMaterial(material, { replaceHistory: true });
  };

  const activeDefinition = gateSession ? GATE_DEFINITIONS[gateSession.gateId] : null;
  const activeDefinitionWithProgress: ReasoningGateDefinition | null = activeDefinition?.type === 'relation'
    ? { ...activeDefinition, progress: { current: state.solvedForceIds.length, total: activeDefinition.standardSets?.length ?? 4 } }
    : activeDefinition;
  const displayPhase = !finalGateCompleted && isTerminalPhase(state.currentPhase)
    ? getSafePhaseWithoutFinalGate(state)
    : state.currentPhase;
  const currentPhaseGateId = gateIdForPhase(displayPhase);
  const currentPhaseGateSolved = currentPhaseGateId ? state.solvedGateIds.includes(currentPhaseGateId) : false;
  const launcherGateId = availableGateIds[0] ?? null;

  if (deductionView.kind === 'shelf') {
    return (
      <AmbientScene sceneKey="deduction-shelf" variant="normal">
        <div className="deduction-shell">
          <InvestigationNav state={state} activeSection="deduction" onNavigate={handleNavNavigate} />
          <DeductionShelf items={deductionShelfItems} onOpen={openStory} onBackToDesk={leaveDeductionToDesk} />
          <ReasoningBar
            mode={reasoningMode}
            query={clueSearch}
            relationChips={[]}
            onModeChange={setReasoningMode}
            onQueryChange={setClueSearch}
            onRemoveRelation={removeRelation}
            onClearRelations={() => setRelationIds([])}
            onSubmit={handleReasoningSubmit}
            inputDisabled={false}
            modeLocked={false}
            submitDisabled={false}
          />
        </div>
      </AmbientScene>
    );
  }

  if (deductionView.kind === 'reader') {
    return (
      <AmbientScene sceneKey="deduction-reader" variant="reader">
        <div className="deduction-shell">
          <InvestigationNav state={state} activeSection="deduction" onNavigate={handleNavNavigate} />
          {deductionStory ? (
            <DeductionReader story={deductionStory} unlockedDeductionIds={state.unlockedDeductionIds} onBackToShelf={returnToDeductionShelf} onBackToDesk={leaveDeductionToDesk} />
          ) : (
            <main className="deduction-reader-page deduction-reader-loading"><div className="deduction-reader-frame"><p className="loading-copy">正在打开……</p>{deductionStoryLoading ? null : <button type="button" className="secondary-button" onClick={returnToDeductionShelf}>返回推理记录</button>}</div></main>
          )}
        </div>
      </AmbientScene>
    );
  }

  if (readingViewAllowed && readingStory && readingReaderOpen) {
    return (
      <AmbientScene sceneKey={`reading-reader-${readingStory.id}`} variant={readingStory.id === 'lan-death' ? 'quiet' : 'reader'}>
        <div className="reading-reader-shell">
          <ReadingReader
            story={readingStory}
            pageIndex={state.terminalProgress?.pageIndex ?? 0}
            completed={state.completedTerminalIds.includes(readingStory.id)}
            onPageChange={(pageIndex) => onFlowEvent({ type: 'READING_PAGE_CHANGED', chapterId: readingStory.id, pageIndex })}
            onComplete={completeReadingChapter}
            onEnd={finishReadingChapter}
            onBack={returnFromReadingToReadingIndex}
            devTools={devTerminal ? {
              chapters: READING_CHAPTER_ORDER.map((id) => ({ id, title: readingChapterLabel(id).replace(/[《》]/g, '') })),
              onSelectChapter: openChapter
            } : undefined}
          />
        </div>
      </AmbientScene>
    );
  }

  if (readingReaderOpen && readingViewAllowed) {
    return <AmbientScene sceneKey="reading-reader-loading" variant="reader"><main className="center-page"><section className="center-card"><p className="loading-copy">正在打开……</p></section></main></AmbientScene>;
  }

  if (readingIndexOpen && readingViewAllowed) {
    return (
      <AmbientScene sceneKey="reading-index" variant="reading-index">
        <div className="reading-index-shell">
          <InvestigationNav state={state} activeSection="terminal" onNavigate={handleNavNavigate} />
          <ReadingIndex state={state} notice={readingNotice} onOpenEntry={openReadingEntry} />
          <ReasoningBar
            mode={reasoningMode}
            query={readingSearchTerm}
            relationChips={[]}
            onModeChange={setReasoningMode}
            onQueryChange={setReadingSearchTerm}
            onRemoveRelation={removeRelation}
            onClearRelations={() => setRelationIds([])}
            onSubmit={handleReasoningSubmit}
            inputDisabled={false}
            modeLocked={false}
            submitDisabled={false}
          />
        </div>
      </AmbientScene>
    );
  }

  const activeMaterialClue = activeMaterialId ? clueById.get(activeMaterialId) ?? null : null;
  const activeMaterialReasoningObject = activeMaterialClue
    ? activeMaterialClue.relationObjectId
      ? getReasoningObjectById(activeMaterialClue.relationObjectId)
      : getReasoningObjectForContent(activeMaterialClue.id)
    : undefined;
  const activeMaterialSectionId = activeMaterialClue ? getNavSectionForContentId(activeMaterialClue.id) : null;
  const activeNavSection = gateSession || reviewGateId
    ? 'reasoning'
    : activeMaterialSectionId
      ? activeMaterialSectionId
      : activeSection ?? getPhaseDisplay(displayPhase).navSection;
  const stage = getPhaseDisplay(displayPhase);
  const batchComplete = state.currentPhase === 'CASE_INVESTIGATION'
    && (PRODUCTION_FLOW.investigationBatches[state.investigationBatch - 1] ?? []).every((id) => state.viewedContentIds.includes(id));

  return (
    <AmbientScene sceneKey="desk" variant="normal">
      <div className="desk-page">
      <CaseDeskHeader caseName="《似》" stage={stage.deskLabel} clueCount={publishedMaterials.length} onIntroReview={onIntroReview} onRestart={onRestart} />
      <InvestigationNav state={state} activeSection={activeNavSection} activeGateId={gateSession?.gateId ?? null} onNavigate={handleNavNavigate} />
      {flowNotice ? <FlowNotice>{flowNotice}</FlowNotice> : null}
      {deductionNotice ? <FlowNotice>{deductionNotice}</FlowNotice> : null}

      <ClueCollection
        items={visibleClues}
        totalCount={publishedMaterials.length}
        selectedId={activeMaterialId}
        onSelect={openMaterial}
        activeSection={activeMaterialSection}
        availableSections={availableMaterialSections}
        onSectionChange={(section) => { setActiveMaterialSection(section); setActiveSection(section === 'all' ? 'case' : section); }}
      />

      <main className="desk-layout">
        <section className="desk-main">
          {activeMaterialClue ? (
            <section id="material-reader" className="desk-material-reader" aria-label="案件资料主阅读区">
              <MainEvidencePanel
                clue={activeMaterialClue}
                onAddRelation={() => addRelation(activeMaterialClue)}
                onCopyName={() => void copyClueName(activeMaterialClue)}
                relationAdded={Boolean(activeMaterialReasoningObject && relationIds.includes(activeMaterialReasoningObject.id))}
                copied={copiedClueId === activeMaterialClue.id}
                viewerOpen={viewerOpen}
                onViewerOpen={openEvidenceViewer}
                onViewerClose={closeEvidenceViewer}
              />
            </section>
          ) : (
            <section id="material-reader" className="desk-material-reader" aria-label="案件资料主阅读区">
              <p className="clue-empty">暂无已解锁的案件资料。</p>
            </section>
          )}

          {gateSession && activeDefinitionWithProgress ? (
            <ReasoningGate
              id="reasoning-node"
              gate={activeDefinitionWithProgress}
              status={gateSession.status}
              open
              feedback={gateSession.feedback}
              feedbackBlocks={gateSession.feedbackBlocks}
              onBack={closeReasoningGate}
              onSolved={handleGateSolved}
              answerValue={gateSession.gateId === 'tapping' ? gateSession.answer : undefined}
              onAnswerChange={gateSession.gateId === 'tapping' ? updateGateAnswer : undefined}
              onAnswerSubmit={gateSession.gateId === 'tapping' ? handleReasoningSubmit : undefined}
              answerDisabled={gateSession.gateId === 'tapping' && gateSession.status === 'success'}
            >
              {gateSession.gateId === 'force' && gateSession.status !== 'success' ? (
                <>
                  <div className="gate-answer-surface">
                    <p className="gate-answer-label">从已经解锁的人物、线索与事实中选择三个对象。</p>
                    <button type="button" className="secondary-button gate-picker-launch" onClick={openRelationPicker}>＋ 添加对象</button>
                    <p className="gate-answer-note">当前已选 {relationIds.length} / 3</p>
                  </div>
                  <button type="button" className="primary-button gate-surface-submit" onClick={submitActiveGate} disabled={relationIds.length !== 3}>提交这一组关系</button>
                </>
              ) : null}
              {gateSession.gateId === 'final' && gateSession.status !== 'success' ? (
                <>
                  <FinalSlotPicker values={finalSlotValues} onChoose={openFinalSlotPicker} onClear={clearFinalSlot} />
                  <button type="button" className="primary-button gate-surface-submit" onClick={submitActiveGate}>提交最后判断</button>
                </>
              ) : null}
            </ReasoningGate>
          ) : reviewGateId ? (
            <ReasoningGate id="reasoning-node" gate={GATE_DEFINITIONS[reviewGateId]} status="success" open onBack={closeGateReview} />
          ) : currentPhaseGateSolved && currentPhaseGateId ? (
            <ReasoningGate id="reasoning-node" gate={GATE_DEFINITIONS[currentPhaseGateId]} status="success" open onBack={closeReasoningGate} />
          ) : launcherGateId ? (
            <ReasoningGate id="reasoning-node" gate={GATE_DEFINITIONS[launcherGateId]} status="available" open={false} onOpen={() => openGate(launcherGateId)} onBack={() => undefined} />
          ) : null}

          {state.currentPhase === 'CASE_INVESTIGATION' ? (
            <div className="advance-section"><span className="small-note">已解锁材料可以稍后回看；本批关键材料看过以后，再决定是否继续。</span><button type="button" className="primary-button" disabled={!batchComplete} onClick={() => onFlowEvent({ type: 'CONTINUE' })}>继续调查</button></div>
          ) : null}

          {state.currentPhase === 'POLICE_INVESTIGATION' ? (
            <section className="desk-section flow-section"><div className="section-heading"><h2>调查还在继续</h2></div><p>人物、旧案和录音已经加入案件桌。你可以先查看材料，也可以在判断准备好以后进入 Force。</p></section>
          ) : null}

        </section>

        <ReviewList state={state} content={content} onIntroReview={onIntroReview} onOpenMaterial={openMaterial} />
      </main>

      <ClueDrawer
        open={clueDrawerOpen}
        items={searchedClues}
        totalCount={publishedMaterials.length}
        selectedId={activeMaterialId}
        searchTerm={clueSearch}
        onSearchChange={setClueSearch}
        onSelect={openMaterial}
        onClose={() => setClueDrawerOpen(false)}
        activeSection={activeMaterialSection}
        availableSections={availableMaterialSections}
        onSectionChange={(section) => { setActiveMaterialSection(section); setActiveSection(section === 'all' ? 'case' : section); }}
      />
      {gateSession?.gateId !== 'tapping' ? (
        <ReasoningBar
          mode={gateSession ? 'relation' : reasoningMode}
          query={clueSearch}
          relationChips={gateSession?.gateId === 'final' ? [] : relationChips}
          onModeChange={gateSession ? () => undefined : setReasoningMode}
          onQueryChange={setClueSearch}
          onRemoveRelation={removeRelation}
          onClearRelations={() => setRelationIds([])}
          onSubmit={handleReasoningSubmit}
          onOpenObjectPicker={gateSession?.gateId === 'force' && gateSession.status !== 'success' ? openRelationPicker : undefined}
          relationMaxObjects={gateSession?.gateId === 'force' ? 3 : 4}
          inputDisabled={Boolean(gateSession)}
          modeLocked={Boolean(gateSession)}
          submitDisabled={false}
        />
      ) : null}

      {pickerContext ? (
        <ReasoningObjectPicker
          open
          selectionMode={pickerContext.selectionMode}
          title={pickerContext.title}
          targetSlot={pickerContext.selectionMode === 'slot' ? pickerContext.targetSlot : undefined}
          allowedKinds={pickerContext.allowedKinds}
          maxObjects={pickerContext.selectionMode === 'relation' ? pickerContext.maxObjects : undefined}
          objects={reasoningObjects}
          unlockedObjectIds={unlockedObjectIds}
          selectedObjectIds={pickerContext.selectionMode === 'relation' ? relationIds : pickerContext.targetSlot && finalSlotValues[pickerContext.targetSlot] ? [finalSlotValues[pickerContext.targetSlot] as string] : []}
          usedObjectIds={pickerContext.selectionMode === 'slot'
            ? Object.entries(finalSlotValues).filter(([slotId]) => slotId !== pickerContext.targetSlot).map(([, objectId]) => objectId).filter((objectId): objectId is string => Boolean(objectId))
            : []}
          onSelect={handlePickerSelect}
          onViewSource={viewPickerSource}
          onClose={closePicker}
        />
      ) : null}
      </div>
    </AmbientScene>
  );
}

function gateIdForPhase(phase: InvestigationPhase): FormalGateId | null {
  if (phase === 'TAP_GATE') return 'tapping';
  if (phase === 'FORCE_GATE') return 'force';
  if (phase === 'FINAL_GATE') return 'final';
  return null;
}

function isGatePhaseForSession(phase: InvestigationPhase, gateId: FormalGateId): boolean {
  return gateIdForPhase(phase) === gateId;
}

export default CaseDesk;

