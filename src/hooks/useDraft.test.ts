import { beforeEach, describe, expect, it } from 'vitest';
import {
  assignmentDraftKey,
  clearDraft,
  readDraft,
  transportDraftKey,
  writeDraft,
} from './useDraft';

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

beforeEach(() => {
  globalThis.localStorage = new MemoryStorage() as unknown as Storage;
});

describe('useDraft', () => {
  it('round-trips a versioned value', () => {
    const key = transportDraftKey('ex_1');
    writeDraft(key, 1, { phase: 'allocate', total: 16 });
    expect(readDraft<{ phase: string; total: number }>(key, 1)).toEqual({
      phase: 'allocate',
      total: 16,
    });
  });

  it('ignores drafts written with another version', () => {
    const key = assignmentDraftKey('ex_2');
    writeDraft(key, 1, { stage: 'cover' });
    expect(readDraft(key, 2)).toBeNull();
  });

  it('ignores malformed JSON and clears drafts on demand', () => {
    const key = transportDraftKey('ex_3');
    localStorage.setItem(key, '{not json');
    expect(readDraft(key, 1)).toBeNull();

    writeDraft(key, 1, { phase: 'line' });
    clearDraft(key);
    expect(localStorage.getItem(key)).toBeNull();
  });

  it('uses distinct keys per category and exercise', () => {
    expect(transportDraftKey('ex_4')).toBe('relicpractice.draft.transport.ex_4');
    expect(assignmentDraftKey('ex_4')).toBe('relicpractice.draft.assignment.ex_4');
    expect(transportDraftKey('ex_4')).not.toBe(assignmentDraftKey('ex_4'));
  });
});
