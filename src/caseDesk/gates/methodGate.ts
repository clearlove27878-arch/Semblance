function normalize(input: string): string {
  return input.trim().toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, '');
}

function hasAny(value: string, keywords: string[]): boolean {
  return keywords.some((keyword) => value.includes(keyword));
}

export function validateMethodAnswer(input: string): boolean {
  const normalized = normalize(input);
  if (!normalized) return false;
  if (normalized === 'ragdollcat') return true;

  const hasKiller = hasAny(normalized, ['枫', '周枫']);
  const hasMedium = hasAny(normalized, ['磁带', '儿童旧带', '旧磁带', '始']);
  const hasInjury = hasAny(normalized, ['拇指', '手指', '伤口', '创口', '刺伤', '划伤', '割伤']);
  const hasPoison = hasAny(normalized, ['蛇毒', '毒液', '中毒']);
  return hasKiller && hasMedium && hasInjury && hasPoison;
}
