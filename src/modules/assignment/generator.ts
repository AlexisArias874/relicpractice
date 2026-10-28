import type { AssignmentInstance, AssignmentMethod } from '../../types/assignment';
import type { Difficulty } from '../../types/transportation';
import { createRng, randomSeed, uid } from '../../utils';
import { enumerateOptimalAssignments } from './hungarian';

const RANGES: Record<Difficulty, [number, number]> = {
  easy: [10, 60],
  intermediate: [2, 20],
  hard: [1, 9],
};

function makeValues(
  n: number,
  difficulty: Difficulty,
  rng: ReturnType<typeof createRng>,
): number[][] {
  const [lo, hi] = RANGES[difficulty];
  let values = Array.from({ length: n }, () =>
    Array.from({ length: n }, () => rng.int(lo, hi)),
  );
  let guard = 0;
  while (guard++ < 50) {
    const unique = new Set(values.flat()).size;
    const rowSignatures = new Set(values.map((row) => row.join(','))).size;
    if (unique >= Math.min(n, 4) && rowSignatures > 1) break;
    values = Array.from({ length: n }, () =>
      Array.from({ length: n }, () => rng.int(lo, hi)),
    );
  }
  return values;
}

export function validateAssignmentInstance(
  instance: AssignmentInstance,
): string[] {
  const errors: string[] = [];
  const { values } = instance;
  const n = values.length;
  if (n < 3 || n > 6) errors.push('El húngaro admite matrices de 3×3 a 6×6.');
  if (values.some((row) => row.length !== n)) {
    errors.push('La matriz debe ser cuadrada.');
  }
  if (values.flat().some((v) => !Number.isInteger(v) || v <= 0)) {
    errors.push('Todos los valores deben ser enteros positivos.');
  }
  if (new Set(values.flat()).size < 2) {
    errors.push('La matriz es trivial (todos los valores iguales).');
  }
  return errors;
}

export function generateAssignment(
  method: AssignmentMethod,
  difficulty: Difficulty,
  size: number,
  seed = randomSeed(),
): AssignmentInstance {
  const n = Math.min(6, Math.max(3, size));
  const maximize = method === 'hungarianMax';
  const build = (currentSeed: number): AssignmentInstance => {
    const rng = createRng(currentSeed);
    const values = makeValues(n, difficulty, rng);
    const instance: AssignmentInstance = {
      id: uid('as'),
      method,
      values,
      seed: currentSeed,
      difficulty,
      createdAt: new Date().toISOString(),
    };
    const errors = validateAssignmentInstance(instance);
    if (errors.length) throw new Error(`Instancia inválida: ${errors.join(' ')}`);
    return instance;
  };

  // Hard: favour instances with alternative optimal assignments.
  if (difficulty === 'hard') {
    for (let i = 0; i < 80; i++) {
      const candidate = build(seed + i * 104729);
      const oracle = enumerateOptimalAssignments(candidate.values, maximize);
      if (oracle.assignments.length > 1) return candidate;
    }
    return build(seed);
  }
  // Easy: favour a unique optimum to keep ties out of the first contact.
  if (difficulty === 'easy') {
    for (let i = 0; i < 30; i++) {
      const candidate = build(seed + i * 7919);
      const oracle = enumerateOptimalAssignments(candidate.values, maximize);
      if (oracle.assignments.length === 1) return candidate;
    }
  }
  return build(seed);
}
