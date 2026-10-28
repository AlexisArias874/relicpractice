export interface DraftEnvelope<T> {
  version: number;
  value: T;
}

export function readDraft<T>(key: string, version: number): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DraftEnvelope<T>;
    if (!parsed || parsed.version !== version) return null;
    return parsed.value;
  } catch {
    return null;
  }
}

export function writeDraft<T>(key: string, version: number, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify({ version, value }));
  } catch {
    // Ignore storage failures; practice is still usable in memory.
  }
}

export function clearDraft(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore.
  }
}

export function transportDraftKey(exerciseId: string): string {
  return `relicpractice.draft.transport.${exerciseId}`;
}

export function assignmentDraftKey(exerciseId: string): string {
  return `relicpractice.draft.assignment.${exerciseId}`;
}
