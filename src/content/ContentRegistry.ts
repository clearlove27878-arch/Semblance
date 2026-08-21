import playerData from './generated/content.player.generated.json';
import runtimeData from './generated/content.runtime.generated.json';
import type {
  ContentType,
  GeneratedPlayerData,
  GeneratedRuntimeData,
  GateObjectMapping,
  PlayerContentRecord,
  RegistryGate
} from './types';
import { normalizeSearchInput } from '../core/searchNormalize';

const PLAYER = playerData as GeneratedPlayerData;
const RUNTIME = runtimeData as GeneratedRuntimeData;
const CLUE_TYPES = new Set<ContentType>(['case_clue', 'police_clue', 'visual_clue', 'recording']);

function includesQuery(value: string | null | undefined, query: string): boolean {
  return Boolean(value && normalizeSearchInput(value).includes(query));
}

export class ContentRegistry {
  private readonly contentById = new Map(PLAYER.contents.map((item) => [item.id, item]));
  private readonly gateById = new Map(PLAYER.gates.map((item) => [item.id, item]));
  private readonly gateRuntimeById = new Map(RUNTIME.gates.map((item) => [item.id, item.runtime]));

  getContentById(id: string): PlayerContentRecord | undefined {
    return this.contentById.get(id);
  }

  getClueById(id: string): PlayerContentRecord | undefined {
    const content = this.contentById.get(id);
    return content && CLUE_TYPES.has(content.type) ? content : undefined;
  }

  getGateById(id: string): RegistryGate | undefined {
    const player = this.gateById.get(id);
    const runtime = this.gateRuntimeById.get(id);
    if (!player || !runtime) return undefined;
    return { ...player, runtime };
  }

  getContentsByCategory(category: string): PlayerContentRecord[] {
    return PLAYER.contents.filter((item) => item.category === category || item.type === category);
  }

  searchContent(query: string, unlockedIds?: readonly string[]): PlayerContentRecord[] {
    const normalizedQuery = normalizeSearchInput(query);
    const unlocked = unlockedIds ? new Set(unlockedIds) : null;
    return PLAYER.contents.filter((item) => {
      if (unlocked && !unlocked.has(item.id)) return false;
      if (!normalizedQuery) return true;
      return [item.title, item.displayTitle, item.standardName, ...item.aliases, ...(item.searchAliases ?? []), ...item.body]
        .some((value) => includesQuery(value, normalizedQuery));
    });
  }

  getTerminalChapter(id: string): PlayerContentRecord | undefined {
    const content = this.contentById.get(id);
    return content?.type === 'terminal_chapter' ? content : undefined;
  }

  getStory(id: string): PlayerContentRecord | undefined {
    const content = this.contentById.get(id);
    return content?.type === 'fictional_deduction' ? content : undefined;
  }

  getPrologue(): PlayerContentRecord | undefined {
    return PLAYER.contents.find((item) => item.type === 'prologue');
  }

  getAllContents(): PlayerContentRecord[] {
    return [...PLAYER.contents];
  }

  getAllGates(): RegistryGate[] {
    return PLAYER.gates.flatMap((item) => {
      const gate = this.getGateById(item.id);
      return gate ? [gate] : [];
    });
  }

  getGateObject(objectId: string): GateObjectMapping | undefined {
    return RUNTIME.objectMap[objectId];
  }

  getAllReasoningObjectMappings(): Array<{ id: string; mapping: GateObjectMapping }> {
    return Object.entries(RUNTIME.objectMap).map(([id, mapping]) => ({ id, mapping }));
  }

  getSummary(): { counts: Record<string, number> } {
    const counts = PLAYER.contents.reduce<Record<string, number>>((result, item) => {
      result[item.type] = (result[item.type] ?? 0) + 1;
      return result;
    }, {});
    counts.gate = PLAYER.gates.length;
    return { counts };
  }
}

export const contentRegistry = new ContentRegistry();

export function getContentRegistry(): ContentRegistry {
  return contentRegistry;
}
