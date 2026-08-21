import { contentRegistry } from '../content/ContentRegistry';
import { FICTIONAL_DEDUCTION_IDS } from './flow/flowDefinition';

/**
 * The title contract is deliberately small and exact.  The body never lives
 * here; it remains in the build-time ContentRegistry generated from 网页文本源.
 */
export const DEDUCTION_DISPLAY_TITLES: Readonly<Record<typeof FICTIONAL_DEDUCTION_IDS[number], string>> = {
  'story-letter': '磁带传音',
  'story-question': '往日重现',
  'story-silent-letter': '无字情书',
  'story-snake-bride': '蛇选新娘'
};

export interface DeductionShelfItem {
  id: string;
  title: string;
  unlocked: boolean;
  viewed: boolean;
}

/**
 * Build the player-facing shelf from the canonical unlock/view state.
 * Filtering by the formal ID order keeps discovery order from changing the
 * archive layout. Locked rows intentionally carry only a placeholder title;
 * the player must search to reveal the corresponding record.
 */
export function getDeductionShelfItems(
  unlockedDeductionIds: readonly string[],
  viewedContentIds: readonly string[]
): DeductionShelfItem[] {
  const unlocked = new Set(unlockedDeductionIds);
  const viewed = new Set(viewedContentIds);

  return FICTIONAL_DEDUCTION_IDS.flatMap((id) => {
    const record = contentRegistry.getStory(id);
    if (!record) return [];
    const isUnlocked = unlocked.has(id);
    return [{ id, title: isUnlocked ? record.displayTitle : '???', unlocked: isUnlocked, viewed: isUnlocked && viewed.has(id) }];
  });
}

export function validateDeductionRegistry(): string[] {
  const errors: string[] = [];
  if (new Set(FICTIONAL_DEDUCTION_IDS).size !== FICTIONAL_DEDUCTION_IDS.length) {
    errors.push('fictional deduction IDs must be unique');
  }

  for (const id of FICTIONAL_DEDUCTION_IDS) {
    const record = contentRegistry.getContentById(id);
    if (!record) {
      errors.push(`fictional deduction is missing from ContentRegistry: ${id}`);
      continue;
    }
    if (record.type !== 'fictional_deduction') errors.push(`fictional deduction type is invalid: ${id}`);
    if (record.displayTitle !== DEDUCTION_DISPLAY_TITLES[id]) {
      errors.push(`fictional deduction displayTitle is invalid: ${id}`);
    }
    if (!record.body.some((paragraph) => paragraph.trim().length > 0)) {
      errors.push(`fictional deduction body is empty: ${id}`);
    }
    if (JSON.stringify(record).includes('internalNotes')) {
      errors.push(`fictional deduction player data contains internalNotes: ${id}`);
    }
  }

  return [...new Set(errors)];
}

export function validateUnlockedDeductionIds(ids: readonly string[]): string[] {
  const knownIds = new Set(FICTIONAL_DEDUCTION_IDS);
  return [...new Set(ids.filter((id) => !knownIds.has(id as typeof FICTIONAL_DEDUCTION_IDS[number]) || !contentRegistry.getStory(id)))];
}
