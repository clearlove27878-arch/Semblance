import { describe, expect, it } from 'vitest';
import {
  filterReasoningObjects,
  getReasoningObjectById,
  getReasoningObjectForContent,
  getReasoningObjects,
  getUnlockedReasoningObjectIds,
  validateReasoningObjectRegistry
} from '../src/content/ReasoningObjectRegistry';
import { FINAL_GATE_DEFINITION, FORCE_GATE_DEFINITION } from '../src/caseDesk/gates/caseGateDefinitions';
import { matchesFinalSlots, matchesRelationSet } from '../src/caseDesk/gates/reasoningGate';
import { clearReasoningGateDraft, loadReasoningGateDraft, saveReasoningGateDraft } from '../src/caseDesk/reasoningDraftPersistence';

describe('ReasoningObject Registry', () => {
  it('uses one canonical object for Gate aliases and keeps source mappings', () => {
    expect(getReasoningObjectById('FENG')?.id).toBe('ZHOU_FENG');
    expect(getReasoningObjectById('TAPE_START')?.id).toBe('START_TAPE');
    expect(getReasoningObjectById('WANG_ZHENG_SPLICED_PHOTO')).toMatchObject({
      id: 'wang-collage-photo',
      kind: 'clue',
      displayName: '王峥的拼接照片',
      sourceContentIds: ['wang-collage-photo']
    });
    expect(getReasoningObjectById('ANON_RECOMMENDATION')).toBeUndefined();
    expect(getReasoningObjectById('ZHAO_ZHENHUA')).toMatchObject({ kind: 'person', sourceContentIds: ['statement-zhenhua'] });
  });

  it('only marks objects whose formal source content is unlocked', () => {
    const unlocked = getUnlockedReasoningObjectIds(['statement-feng', 'tape-supplement', 'wang-collage-photo']);
    expect(unlocked).toEqual(expect.arrayContaining(['ZHOU_FENG', 'START_TAPE', 'wang-collage-photo']));
    expect(getUnlockedReasoningObjectIds(['statement-feng', 'tape-supplement'])).not.toContain('wang-collage-photo');
    expect(unlocked).not.toContain('ZHAO_ZHENHUA');
    expect(getReasoningObjectById('ZHOU_FENG', ['statement-feng'])?.unlocked).toBe(true);
    expect(getReasoningObjectById('ZHOU_FENG', ['statement-wang'])?.unlocked).toBe(false);
  });

  it('filters by kind and simple title/alias search without semantic ranking', () => {
    const objects = getReasoningObjects(['snake-charm', 'statement-ling', 'tape-supplement', 'wang-collage-photo']);
    const clues = objects.filter((object) => object.unlocked && object.kind === 'clue');
    const people = objects.filter((object) => object.unlocked && object.kind === 'person');
    expect(filterReasoningObjects(clues, '蛇符').map((object) => object.id)).toContain('NEW_TALISMAN');
    expect(filterReasoningObjects(clues, '始磁带').map((object) => object.id)).toContain('START_TAPE');
    expect(filterReasoningObjects(clues, '拼接照片').map((object) => object.id)).toContain('wang-collage-photo');
    expect(filterReasoningObjects(people, '玲').map((object) => object.id)).toContain('XU_LING');
  });

  it('resolves CaseDesk material IDs to the same reasoning object IDs', () => {
    expect(getReasoningObjectForContent('snake-charm')?.id).toBe('NEW_TALISMAN');
    expect(getReasoningObjectForContent('wang-collage-photo')?.id).toBe('wang-collage-photo');
    expect(getReasoningObjectForContent('old-recorder-rewind')?.id).toBe('OLD_RECORDER_REWIND');
    expect(getReasoningObjectForContent('zhenhua-investigation-initial')?.id).toBe('TAPE_DISPOSAL');
  });

  it('has no duplicated clue source objects and every formal reference validates', () => {
    const clues = getReasoningObjects().filter((object) => object.kind === 'clue');
    const sourceIds = clues.flatMap((object) => object.sourceContentIds);
    expect(new Set(sourceIds).size).toBe(sourceIds.length);
    expect(validateReasoningObjectRegistry()).toEqual([]);
  });
});

describe('Reasoning Gate canonical matching', () => {
  it('accepts canonical picker IDs against existing formal Gate mappings', () => {
    const firstForce = FORCE_GATE_DEFINITION.standardSets?.[0];
    expect(firstForce).toBeDefined();
    expect(matchesRelationSet(firstForce?.objectIds ?? [], FORCE_GATE_DEFINITION.standardSets ?? [])).toBe('F1_PHOTO');
    expect(matchesRelationSet(['WANG_ZHENG', 'ANON_RECOMMENDATION', 'XU_LING'], FORCE_GATE_DEFINITION.standardSets ?? [])).toBeNull();
    const finalAnswer = {
      killer_slot: 'ZHOU_FENG',
      medium_slot: 'START_TAPE',
      action_slot: 'OLD_RECORDER_REWIND',
      wound_slot: 'LAN_THUMB_WOUND',
      disposal_slot: 'TAPE_DISPOSAL'
    } as const;
    expect(matchesFinalSlots(finalAnswer, FINAL_GATE_DEFINITION.slots ?? [])).toBe(true);
  });
});

describe('Reasoning Gate draft persistence', () => {
  it('restores canonical IDs and does not write drafts into CaseState', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
      removeItem: (key: string) => { values.delete(key); }
    };
    const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: storage } });

    try {
      saveReasoningGateDraft('force', { relationObjectIds: ['FENG', 'UNKNOWN'], finalSlotValues: {} });
      const draft = loadReasoningGateDraft('force');
      expect(draft?.relationObjectIds).toEqual(['ZHOU_FENG']);
      expect(JSON.stringify(draft)).not.toContain('UNKNOWN');
      clearReasoningGateDraft('force');
      expect(loadReasoningGateDraft('force')).toBeNull();
    } finally {
      if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow);
      else delete (globalThis as { window?: unknown }).window;
    }
  });
});
