import { normalizeSearchInput } from '../core/searchNormalize';

export type ReadingIndexEntry =
  | { kind: 'existing'; id: 'novel-ling' | 'novel-feng'; title: string }
  | { kind: 'lan'; id: LanReadingChapterId };

export const READING_INDEX_BASE_CHAPTER_IDS = ['novel-ling', 'novel-feng'] as const;

export const LAN_READING_CHAPTERS = [
  { id: 'lan-past', title: '岚的过去' },
  { id: 'lan-and-zheng', title: '岚与峥' },
  { id: 'lan-leaving-and-threat', title: '离开与威胁' },
  { id: 'lan-first-meeting', title: '初识' },
  { id: 'lan-snakebite', title: '蛇咬' },
  { id: 'lan-case-day', title: '案发当日' },
  { id: 'lan-death', title: '岚之死' }
] as const;

export type LanReadingChapterId = (typeof LAN_READING_CHAPTERS)[number]['id'];

export const READING_CHAPTER_ORDER = [
  ...READING_INDEX_BASE_CHAPTER_IDS,
  ...LAN_READING_CHAPTERS.map((chapter) => chapter.id)
] as const;

/**
 * The first Reading Index prototype used these two placeholder IDs.  They
 * are accepted only while migrating saved state; all new state and runtime
 * access checks use the formal chapter IDs above.
 */
export const LEGACY_READING_CHAPTER_ID_ALIASES = {
  'lan-leaving-threat': 'lan-leaving-and-threat',
  'lan-meets-feng': 'lan-first-meeting'
} as const;

export function migrateReadingChapterId(value: string): string {
  return LEGACY_READING_CHAPTER_ID_ALIASES[value as keyof typeof LEGACY_READING_CHAPTER_ID_ALIASES] ?? value;
}

export interface ReadingChapterUnlockRule {
  chapterId: LanReadingChapterId;
  title: string;
  keywords: readonly string[];
  aliases?: readonly string[];
}

/**
 * The formal chapter title is the only production search key configured here.
 * No new story keywords are invented in this integration step; the existing
 * Reading ReasoningBar/resolver remains the sole unlock mechanism.
 */
export const READING_CHAPTER_UNLOCK_RULES: readonly ReadingChapterUnlockRule[] = LAN_READING_CHAPTERS.map((chapter) => ({
  chapterId: chapter.id,
  title: chapter.title,
  keywords: []
}));

export const READING_INDEX_ENTRIES: readonly ReadingIndexEntry[] = [
  { kind: 'existing', id: 'novel-ling', title: '玲' },
  { kind: 'existing', id: 'novel-feng', title: '枫' },
  ...LAN_READING_CHAPTERS.map((chapter) => ({ kind: 'lan' as const, id: chapter.id }))
];

export function isLanReadingChapterId(value: string): value is LanReadingChapterId {
  return LAN_READING_CHAPTERS.some((chapter) => chapter.id === value);
}

/**
 * Returns the configured player-facing title for a formal chapter.  Callers
 * must still check the persisted unlock set before rendering it to players.
 */
export function getReadingChapterTitle(chapterId: LanReadingChapterId): string | null {
  return READING_CHAPTER_UNLOCK_RULES.find((rule) => rule.chapterId === chapterId)?.title ?? null;
}

/**
 * Resolve only exact configured keywords or aliases.  The resolver is kept
 * independent from React so tests can pass mock rules without leaking them
 * into production content.
 */
export function resolveReadingChapterUnlock(
  input: string,
  rules: readonly ReadingChapterUnlockRule[] = READING_CHAPTER_UNLOCK_RULES
): LanReadingChapterId | null {
  const normalizedInput = normalizeSearchInput(input);
  if (!normalizedInput) return null;
  return rules.find((rule) => [rule.title, ...rule.keywords, ...(rule.aliases ?? [])]
    .some((candidate) => normalizeSearchInput(candidate) === normalizedInput))?.chapterId ?? null;
}

/** Compatibility name for callers from the first Reading Index step. */
export const resolveLanReadingChapter = resolveReadingChapterUnlock;
