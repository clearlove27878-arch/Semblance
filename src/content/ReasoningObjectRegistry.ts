import { contentRegistry } from './ContentRegistry';
import type { ContentType, ReasoningObjectKind } from './types';
import { normalizeSearchInput } from '../core/searchNormalize';

export type { ReasoningObjectKind } from './types';

export interface ReasoningObject {
  id: string;
  kind: ReasoningObjectKind;
  displayName: string;
  standardName: string;
  category: string;
  sourceContentIds: string[];
  aliases: string[];
  thumbnail: string | null;
  unlocked: boolean;
  /** Formal Gate IDs that point to this canonical object. */
  aliasIds: string[];
}

const CLUE_TYPES = new Set<ContentType>(['case_clue', 'police_clue', 'visual_clue', 'recording']);
const KIND_LABELS: Record<ReasoningObjectKind, string> = {
  person: '人物',
  clue: '线索',
  fact: '事实'
};

function unique(values: readonly string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

function mappingEntries() {
  return contentRegistry.getAllReasoningObjectMappings();
}

function createFormalObjects(): ReasoningObject[] {
  const objects: ReasoningObject[] = [];
  const byCanonicalId = new Map<string, ReasoningObject>();

  for (const { id: aliasId, mapping } of mappingEntries()) {
    const source = contentRegistry.getContentById(mapping.contentId);
    if (!source) continue;
    const canonicalId = mapping.canonicalId ?? aliasId;
    const existing = byCanonicalId.get(canonicalId);
    if (existing) {
      existing.aliasIds = unique([...existing.aliasIds, aliasId]);
      existing.sourceContentIds = unique([...existing.sourceContentIds, mapping.contentId]);
      existing.aliases = unique([...existing.aliases, mapping.label, ...source.aliases]);
      continue;
    }

    const standardName = mapping.kind === 'clue'
      ? source.standardName ?? mapping.label
      : mapping.label;
    const object: ReasoningObject = {
      id: canonicalId,
      kind: mapping.kind,
      displayName: mapping.label,
      standardName,
      category: KIND_LABELS[mapping.kind],
      sourceContentIds: [mapping.contentId],
      aliases: unique([mapping.label, standardName, source.displayTitle, source.title, ...source.aliases]),
      thumbnail: source.image,
      unlocked: false,
      aliasIds: unique([aliasId])
    };
    objects.push(object);
    byCanonicalId.set(canonicalId, object);
  }

  const mappedContentIds = new Set(mappingEntries().map(({ mapping }) => mapping.contentId));
  for (const source of contentRegistry.getAllContents()) {
    if (!CLUE_TYPES.has(source.type) || mappedContentIds.has(source.id)) continue;
    const object: ReasoningObject = {
      id: source.id,
      kind: 'clue',
      displayName: source.displayTitle,
      standardName: source.standardName ?? source.displayTitle,
      category: '线索',
      sourceContentIds: [source.id],
      aliases: unique([source.displayTitle, source.title, source.standardName ?? '', ...source.aliases]),
      thumbnail: source.image,
      unlocked: false,
      aliasIds: []
    };
    objects.push(object);
    byCanonicalId.set(object.id, object);
  }

  return objects;
}

const BASE_OBJECTS = createFormalObjects();
const OBJECT_BY_ID = new Map(BASE_OBJECTS.map((object) => [object.id, object]));
const OBJECT_ID_TO_CANONICAL = new Map<string, string>();
for (const object of BASE_OBJECTS) {
  OBJECT_ID_TO_CANONICAL.set(object.id, object.id);
  for (const aliasId of object.aliasIds) OBJECT_ID_TO_CANONICAL.set(aliasId, object.id);
}

function withAvailability(object: ReasoningObject, unlockedContentIds?: readonly string[]): ReasoningObject {
  if (!unlockedContentIds) return { ...object, unlocked: true, sourceContentIds: [...object.sourceContentIds], aliases: [...object.aliases], aliasIds: [...object.aliasIds] };
  const unlocked = object.sourceContentIds.some((id) => unlockedContentIds.includes(id));
  return { ...object, unlocked, sourceContentIds: [...object.sourceContentIds], aliases: [...object.aliases], aliasIds: [...object.aliasIds] };
}

export function canonicalizeReasoningObjectId(objectId: string): string | null {
  return OBJECT_ID_TO_CANONICAL.get(objectId) ?? null;
}

export function getReasoningObjectById(objectId: string, unlockedContentIds?: readonly string[]): ReasoningObject | undefined {
  const canonicalId = canonicalizeReasoningObjectId(objectId);
  const object = canonicalId ? OBJECT_BY_ID.get(canonicalId) : undefined;
  return object ? withAvailability(object, unlockedContentIds) : undefined;
}

export function getReasoningObjects(unlockedContentIds?: readonly string[]): ReasoningObject[] {
  return BASE_OBJECTS.map((object) => withAvailability(object, unlockedContentIds));
}

export function getUnlockedReasoningObjectIds(unlockedContentIds: readonly string[]): string[] {
  return getReasoningObjects(unlockedContentIds).filter((object) => object.unlocked).map((object) => object.id);
}

export function getReasoningObjectsForContent(contentId: string, allowedKinds?: readonly ReasoningObjectKind[]): ReasoningObject[] {
  return BASE_OBJECTS.filter((object) => object.sourceContentIds.includes(contentId) && (!allowedKinds || allowedKinds.includes(object.kind)));
}

export function getReasoningObjectForContent(contentId: string, allowedKinds?: readonly ReasoningObjectKind[]): ReasoningObject | undefined {
  const source = contentRegistry.getContentById(contentId);
  const mappedId = source?.relationObjectId;
  if (mappedId) {
    const mapped = getReasoningObjectById(mappedId);
    if (mapped && (!allowedKinds || allowedKinds.includes(mapped.kind))) return mapped;
  }
  return getReasoningObjectsForContent(contentId, allowedKinds)[0];
}

export function normalizeReasoningObjectSearch(value: string): string {
  return normalizeSearchInput(value);
}

export function filterReasoningObjects(objects: readonly ReasoningObject[], query: string): ReasoningObject[] {
  const normalizedQuery = normalizeSearchInput(query);
  if (!normalizedQuery) return [...objects];
  return objects.filter((object) => [object.displayName, object.standardName, ...object.aliases]
    .some((value) => normalizeSearchInput(value).includes(normalizedQuery)));
}

export function validateReasoningObjectRegistry(): string[] {
  const errors: string[] = [];
  const objectIds = new Set<string>();
  const aliasIds = new Map<string, string>();

  const photoObject = getReasoningObjectById('WANG_ZHENG_SPLICED_PHOTO');
  if (!photoObject) errors.push('拼接照片未注册为 reasoning clue');
  else if (photoObject.id !== 'wang-collage-photo') errors.push(`拼接照片未复用现有 stable ID: ${photoObject.id}`);
  if (getReasoningObjectById('ANON_RECOMMENDATION')) errors.push('ANON_RECOMMENDATION 不得注册为 reasoning object');
  const lingObject = getReasoningObjectById('XU_LING');
  if (lingObject && lingObject.displayName !== '玲') errors.push(`XU_LING 玩家显示名必须为玲: ${lingObject.displayName}`);

  for (const object of BASE_OBJECTS) {
    if (objectIds.has(object.id)) errors.push(`reasoning object ID 重复: ${object.id}`);
    objectIds.add(object.id);
    if (!object.displayName.trim()) errors.push(`reasoning object 缺少 displayName: ${object.id}`);
    if (!object.standardName.trim()) errors.push(`reasoning object 缺少 standardName: ${object.id}`);
    if (object.sourceContentIds.length === 0) errors.push(`reasoning object 缺少 sourceContentIds: ${object.id}`);
    for (const sourceContentId of object.sourceContentIds) {
      if (!contentRegistry.getContentById(sourceContentId)) errors.push(`${object.id} 引用了不存在的 sourceContentId: ${sourceContentId}`);
    }
    if (object.kind === 'fact' && object.sourceContentIds.some((id) => !contentRegistry.getContentById(id))) {
      errors.push(`fact source 不存在: ${object.id}`);
    }
    for (const aliasId of object.aliasIds) {
      const previous = aliasIds.get(aliasId);
      if (previous && previous !== object.id) errors.push(`reasoning object alias 重复: ${aliasId}`);
      aliasIds.set(aliasId, object.id);
    }
  }

  for (const { id, mapping } of mappingEntries()) {
    const canonicalId = mapping.canonicalId ?? id;
    if (!OBJECT_BY_ID.has(canonicalId)) errors.push(`formal mapping 未注册: ${id}`);
    if (!contentRegistry.getContentById(mapping.contentId)) errors.push(`formal mapping source 不存在: ${id}`);
    if (!mapping.kind) errors.push(`formal mapping 缺少 kind: ${id}`);
  }

  const clueSources = new Map<string, string>();
  for (const object of BASE_OBJECTS.filter((item) => item.kind === 'clue')) {
    for (const sourceContentId of object.sourceContentIds) {
      const previous = clueSources.get(sourceContentId);
      if (previous && previous !== object.id) errors.push(`同一 clue 被创建为多个 reasoning object: ${sourceContentId}`);
      clueSources.set(sourceContentId, object.id);
    }
  }

  for (const gate of contentRegistry.getAllGates()) {
    if (gate.type === 'relation' && 'standardSets' in gate.runtime) {
      for (const objectId of gate.runtime.standardSets.flatMap((set) => set.objectIds)) {
        if (!canonicalizeReasoningObjectId(objectId)) errors.push(`Force 引用不存在的 reasoning object: ${objectId}`);
      }
    }
    if (gate.type === 'final' && 'slots' in gate.runtime) {
      for (const slot of gate.runtime.slots) {
        if (!canonicalizeReasoningObjectId(slot.objectId)) errors.push(`Final slot 引用不存在的 reasoning object: ${slot.objectId}`);
      }
    }
  }

  return [...new Set(errors)];
}

export function assertValidReasoningObjectRegistry(): void {
  const errors = validateReasoningObjectRegistry();
  if (errors.length > 0) throw new Error(`Invalid ReasoningObject Registry:\n${errors.join('\n')}`);
}

assertValidReasoningObjectRegistry();
