import type { BodyBlock } from '../../content/types';
import type { StoryContent } from '../content/types';

/** Reading chapters use only the author pages produced by ContentRegistry. */
export function getReadingReaderPages(story: StoryContent): readonly BodyBlock[][] {
  return story.pages ?? [];
}

export function clampReadingPageIndex(pageIndex: number, totalPages: number): number {
  if (totalPages <= 0) return 0;
  return Math.max(0, Math.min(Math.floor(pageIndex), totalPages - 1));
}
