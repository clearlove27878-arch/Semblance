import { contentRegistry } from '../content/ContentRegistry';
import type { PlayerContentRecord, RegistryGate } from '../content/types';
import type { CaseState } from './types';
import type { DeskContent, Material, PhaseModule, SpecialReading, StoryContent, StorySummary } from './content/types';

function materialFromRecord(record: PlayerContentRecord): Material {
  return {
    id: record.id,
    type: record.type,
    category: record.category,
    title: record.displayTitle,
    displayTitle: record.displayTitle,
    body: record.body,
    bodyBlocks: record.bodyBlocks,
    pages: record.pages,
    pageLabels: record.pageLabels,
    standardName: record.standardName ?? undefined,
    aliases: record.aliases,
    searchAliases: record.searchAliases,
    imageRef: record.imageRef,
    image: record.image,
    images: record.images,
    highlights: record.highlights,
    visibleHighlights: record.visibleHighlights,
    relationObjectId: record.relationObjectId
  };
}

function storyFromRecord(record: PlayerContentRecord): StoryContent {
  return {
    id: record.id,
    title: record.displayTitle,
    subtitle: undefined,
    paragraphs: record.body,
    bodyBlocks: record.bodyBlocks,
    pages: record.pages,
    pageLabels: record.pageLabels,
    openingImage: record.openingImage,
    endingImage: record.endingImage
  };
}

function specialReadingFromGate(gate: RegistryGate): SpecialReading {
  return {
    id: gate.id,
    title: gate.displayTitle,
    summary: undefined,
    body: [...gate.promptBlocks, ...gate.player.instructionsBlocks],
    bodyBlocks: gate.promptBlocks.map((text) => ({ kind: 'paragraph', text }))
  };
}

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  return items.filter((item, index) => items.findIndex((candidate) => candidate.id === item.id) === index);
}

export async function loadDeskContent(state: CaseState): Promise<DeskContent> {
  const legacyStateMode = state.currentPhase === 'INTRO' && state.case_phase !== 'INTRO';
  const unlockedMaterialIds = state.unlockedContentIds.length > 0 ? state.unlockedContentIds : state.published_material_ids;
  const materials = uniqueById(state.screen === 'DESK'
    ? unlockedMaterialIds.flatMap((id) => {
      const record = contentRegistry.getClueById(id);
      return record ? [materialFromRecord(record)] : [];
    })
    : []);

  const specialReadings: SpecialReading[] = [];
  // The current player path renders Force through ReasoningGate.  Keep the
  // former special-reading projection only for old in-memory/test states.
  if (legacyStateMode && ['PEOPLE', 'INVESTIGATION', 'EVIDENCE', 'POLICE_HALT', 'BEGINNING_LING_GATE', 'LING_REVEAL', 'POISON_GATE', 'AFTERMATH', 'RITUAL', 'ENDING', 'FINISHED'].includes(state.case_phase)) {
    const force = contentRegistry.getGateById('force');
    if (force) specialReadings.push(specialReadingFromGate(force));
  }

  const stories: StorySummary[] = [];
  for (const storyId of state.unlockedDeductionIds) {
    const record = contentRegistry.getStory(storyId);
    if (record) {
      stories.push({ id: record.id, title: record.displayTitle });
    }
  }

  const module: PhaseModule = { materials, specialReadings, stories };
  return {
    materials: module.materials ?? [],
    questions: [],
    specialReadings: module.specialReadings ?? [],
    stories: module.stories ?? []
  };
}

export async function loadStory(id: string): Promise<StoryContent> {
  const record = contentRegistry.getStory(id);
  if (!record) throw new Error(`Unknown fictional deduction content: ${id}`);
  return storyFromRecord(record);
}

export async function loadReadingChapter(id: string): Promise<StoryContent> {
  const record = contentRegistry.getTerminalChapter(id);
  if (!record) throw new Error(`Unknown reading chapter content: ${id}`);
  return storyFromRecord(record);
}

export function loadPrologue(): StoryContent {
  const record = contentRegistry.getPrologue();
  if (!record) throw new Error('Prologue content is not registered');
  return storyFromRecord(record);
}

export function loadGate(id: string): RegistryGate {
  const gate = contentRegistry.getGateById(id);
  if (!gate) throw new Error(`Unknown Gate content: ${id}`);
  return gate;
}
