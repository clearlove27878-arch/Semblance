import type { JudgeResult } from '../../core/types';

export function text(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase().replace(/[\s，。！？、,.!?；;：:]/g, '') : '';
}

export function hasAny(value: unknown, terms: string[]): boolean {
  const haystack = text(value);
  return terms.some((term) => haystack.includes(text(term)));
}

export function hasAll(ids: unknown, required: string[]): boolean {
  return Array.isArray(ids) && required.every((id) => ids.includes(id));
}

export function count(ids: unknown): number {
  return Array.isArray(ids) ? ids.length : 0;
}

export function result(code: string, kind: JudgeResult['kind'] = 'A'): JudgeResult {
  return { code, kind };
}
