import type { Material } from '../content/types';
import { normalizeSearchInput } from '../../core/searchNormalize';

export type ReasoningMode = 'search' | 'answer' | 'relation';

export interface CaseClue extends Material {
  viewed: boolean;
}

export interface RelationChipData {
  id: string;
  label: string;
}

export function materialToClue(item: Material, viewed: boolean): CaseClue {
  return { ...item, viewed };
}

export function filterClues(items: CaseClue[], query: string): CaseClue[] {
  const normalizedQuery = normalizeSearchInput(query);
  if (!normalizedQuery) return items;
  return items.filter((item) => [
    item.title,
    item.standardName ?? '',
    ...(item.aliases ?? []),
    ...(item.searchAliases ?? []),
    item.category,
    item.summary ?? '',
    ...item.body
  ].some((value) => normalizeSearchInput(value).includes(normalizedQuery)));
}
