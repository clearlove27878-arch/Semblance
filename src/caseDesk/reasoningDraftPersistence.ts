import { canonicalizeReasoningObjectId, getReasoningObjectById } from '../content/ReasoningObjectRegistry';
import type { FinalSlotId } from './gates/reasoningGate';
import type { FormalGateId } from './types';

export const REASONING_DRAFTS_KEY = 'si_reasoning_gate_drafts_v1';

export interface ReasoningGateDraft {
  relationObjectIds: string[];
  finalSlotValues: Partial<Record<FinalSlotId, string>>;
}

type DraftStore = Partial<Record<FormalGateId, ReasoningGateDraft>>;

function hasBrowserStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function normalizeObjectIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => canonicalizeReasoningObjectId(item))
    .filter((item): item is string => Boolean(item))
    .filter((item) => Boolean(getReasoningObjectById(item))))];
}

function normalizeSlots(value: unknown): Partial<Record<FinalSlotId, string>> {
  if (!value || typeof value !== 'object') return {};
  const raw = value as Record<string, unknown>;
  const slots: Partial<Record<FinalSlotId, string>> = {};
  for (const slotId of ['killer_slot', 'medium_slot', 'action_slot', 'wound_slot', 'disposal_slot'] as FinalSlotId[]) {
    const valueAtSlot = raw[slotId];
    if (typeof valueAtSlot !== 'string') continue;
    const canonicalId = canonicalizeReasoningObjectId(valueAtSlot);
    if (canonicalId && getReasoningObjectById(canonicalId)) slots[slotId] = canonicalId;
  }
  return slots;
}

function normalizeDraft(value: unknown): ReasoningGateDraft {
  if (!value || typeof value !== 'object') return { relationObjectIds: [], finalSlotValues: {} };
  const raw = value as Partial<ReasoningGateDraft>;
  return { relationObjectIds: normalizeObjectIds(raw.relationObjectIds), finalSlotValues: normalizeSlots(raw.finalSlotValues) };
}

function readStore(): DraftStore {
  if (!hasBrowserStorage()) return {};
  try {
    const raw = window.localStorage.getItem(REASONING_DRAFTS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as DraftStore;
    const store: DraftStore = {};
    for (const gateId of ['tapping', 'force', 'final'] as FormalGateId[]) {
      if (parsed[gateId] !== undefined) store[gateId] = normalizeDraft(parsed[gateId]);
    }
    return store;
  } catch {
    return {};
  }
}

function writeStore(store: DraftStore): void {
  if (!hasBrowserStorage()) return;
  try {
    window.localStorage.setItem(REASONING_DRAFTS_KEY, JSON.stringify(store));
  } catch {
    // The Gate remains usable when local storage is unavailable.
  }
}

export function loadReasoningGateDraft(gateId: FormalGateId): ReasoningGateDraft | null {
  const draft = readStore()[gateId];
  return draft ? normalizeDraft(draft) : null;
}

export function saveReasoningGateDraft(gateId: FormalGateId, draft: ReasoningGateDraft): void {
  const store = readStore();
  store[gateId] = normalizeDraft(draft);
  writeStore(store);
}

export function clearReasoningGateDraft(gateId: FormalGateId): void {
  const store = readStore();
  delete store[gateId];
  writeStore(store);
}

export function clearAllReasoningGateDrafts(): void {
  if (!hasBrowserStorage()) return;
  try {
    window.localStorage.removeItem(REASONING_DRAFTS_KEY);
  } catch {
    // Ignore unavailable storage.
  }
}
