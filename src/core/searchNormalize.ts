/**
 * Shared representation-level cleanup for player search inputs.
 * Business resolvers remain owned by their individual contexts.
 */
export function normalizeSearchInput(value: string): string {
  return value
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase()
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
    .replace(/[\s\p{P}\p{S}]+/gu, '');
}
