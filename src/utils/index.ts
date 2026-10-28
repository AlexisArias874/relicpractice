export interface Rng {
  next: () => number;
  int: (min: number, max: number) => number;
  pick: <T>(items: T[]) => T;
  shuffle: <T>(items: T[]) => T[];
}

/** Mulberry32: small, deterministic, seedable PRNG. */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min: number, max: number) =>
    Math.floor(next() * (max - min + 1)) + min;
  const pick = <T,>(items: T[]) => items[int(0, items.length - 1)];
  const shuffle = <T,>(items: T[]) => {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = int(0, i);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };
  return { next, int, pick, shuffle };
}

export function randomSeed(): number {
  return (Math.floor(Math.random() * 2 ** 31) ^ Date.now()) >>> 0;
}

export function uid(prefix = 'ex'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.floor(
    Math.random() * 1e9,
  ).toString(36)}`;
}

export function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

export function cloneMatrix(matrix: number[][]): number[][] {
  return matrix.map((row) => [...row]);
}

export function matricesEqual(a: number[][], b: number[][]): boolean {
  return (
    a.length === b.length &&
    a.every(
      (row, i) =>
        row.length === b[i].length && row.every((v, j) => v === b[i][j]),
    )
  );
}

export function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function percent(part: number, total: number): number {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}
