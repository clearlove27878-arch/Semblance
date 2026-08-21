function normalize(input: string): string {
  return input.trim().toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, '');
}

export function validateSnakeAnswer(input: string): boolean {
  const normalized = normalize(input);
  if (!normalized) return false;
  if (normalized === 'ragdollcat') return true;

  const hasCharm = normalized.includes('蛇符') || normalized.includes('护符');
  const hasIntent = ['杀', '害', '弄死', '凶器', '机关', '危险'].some((keyword) => normalized.includes(keyword));
  return hasCharm && hasIntent;
}
