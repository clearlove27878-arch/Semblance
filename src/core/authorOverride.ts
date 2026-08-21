const AUTHOR_CODE_SHA256 = '338404150ef6c6ce9d6beb2c77cc9be61e6993633c9349c2a0e5aa25735b19da';

function normalizeAuthorInput(input: string): string {
  return input.trim().toLowerCase();
}

async function sha256(input: string): Promise<string | null> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return null;
  const digest = await subtle.digest('SHA-256', new TextEncoder().encode(normalizeAuthorInput(input)));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function isAuthorCode(input: unknown): Promise<boolean> {
  if (typeof input !== 'string' || !input.trim()) return false;
  return (await sha256(input)) === AUTHOR_CODE_SHA256;
}

function collectStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(collectStrings);
  if (value && typeof value === 'object') return Object.values(value).flatMap(collectStrings);
  return [];
}

export async function containsAuthorCode(value: unknown): Promise<boolean> {
  for (const candidate of collectStrings(value)) {
    if (await isAuthorCode(candidate)) return true;
  }
  return false;
}

export async function redactAuthorCode<T>(value: T): Promise<T> {
  if (typeof value === 'string') return (await isAuthorCode(value) ? '[AUTHOR_CODE]' : value) as T;
  if (Array.isArray(value)) return (await Promise.all(value.map((item) => redactAuthorCode(item)))) as T;
  if (value && typeof value === 'object') {
    const entries = await Promise.all(Object.entries(value as Record<string, unknown>).map(async ([key, item]) => [key, await redactAuthorCode(item)] as const));
    return Object.fromEntries(entries) as T;
  }
  return value;
}
