export function normalizeGuess(input: string): string {
  const value = input.toLowerCase();
  if (value.includes('磁带') || value.includes('录音')) return 'media_direction';
  if (value.includes('周枫') || value.includes('枫')) return 'person_direction';
  if (value.includes('许玲') || value.includes('玲')) return 'intent_direction';
  if (value.includes('自己') || value.includes('补') || value.includes('理解')) return 'interpretation_direction';
  if (value.includes('邻居') || value.includes('洗')) return 'evidence_gap_direction';
  return 'unclassified';
}
