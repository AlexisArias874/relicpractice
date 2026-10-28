import { describe, expect, it } from 'vitest';
import type { AssignmentInstance } from '../../types';
import { generateAssignment, validateAssignmentInstance } from './generator';
import {
  adjustedMatrix,
  adjustedMatrixWithLines,
  buildHungarianReference,
  colReduced,
  coversAllZeros,
  enumerateOptimalAssignments,
  isValidAssignment,
  matchingOnZeros,
  maximumMatchingSize,
  minimumLineCount,
  minimumLineCover,
  optimalAssignmentValue,
  rowReduced,
  totalForAssignment,
} from './hungarian';
import {
  validateAdjustment,
  validateAssignment,
  validateColReduction,
  validateCover,
  validateRowReduction,
  validateTransform,
} from './validator';

function assignment(
  values: number[][],
  method: AssignmentInstance['method'] = 'hungarianMin',
): AssignmentInstance {
  return {
    id: 'test',
    method,
    values,
    seed: 1,
    difficulty: 'easy',
    createdAt: new Date().toISOString(),
  };
}

describe('Hungarian helpers', () => {
  it('reduces rows and columns correctly', () => {
    const matrix = [
      [82, 83, 69, 92],
      [77, 37, 49, 92],
      [11, 69, 5, 86],
      [8, 9, 98, 23],
    ];
    const rows = rowReduced(matrix);
    expect(rows[0]).toEqual([13, 14, 0, 23]);
    expect(rows[1]).toEqual([40, 0, 12, 55]);
    const columns = colReduced(rows);
    expect(Math.min(...columns.flat())).toBe(0);
    expect(columns.every((row) => row.some((v) => v === 0))).toBe(true);
  });

  it('finds a maximum matching and a minimum line cover of the same size', () => {
    const matrix = [
      [0, 2, 0, 1],
      [1, 0, 0, 3],
      [0, 1, 1, 0],
      [2, 0, 3, 1],
    ];
    const matching = matchingOnZeros(matrix);
    expect(isValidAssignment(matching)).toBe(true);
    const lines = minimumLineCover(matrix);
    expect(lines.length).toBe(maximumMatchingSize(matrix));
    expect(minimumLineCount(matrix)).toBe(lines.length);
    expect(coversAllZeros(matrix, lines)).toBe(true);
    const allRows = matrix.map((_, index) => ({ type: 'row' as const, index }));
    expect(coversAllZeros(matrix, allRows)).toBe(true);
  });

  it('accepts alternative minimum covers and their corresponding adjustments', () => {
    const matrix = [
      [0, 1, 2],
      [1, 0, 3],
      [2, 3, 0],
    ];
    const lines = minimumLineCover(matrix);
    const adjusted = adjustedMatrixWithLines(matrix, lines);
    expect(validateAdjustment(matrix, adjusted)).toEqual(
      expect.objectContaining({ ok: true }),
    );
    expect(validateCover(matrix, lines).ok).toBe(true);
  });

  it('computes the optimum by exhaustive enumeration', () => {
    const matrix = [
      [1, 2, 3],
      [2, 4, 6],
      [3, 6, 9],
    ];
    expect(optimalAssignmentValue(matrix, false)).toBe(10);
    expect(optimalAssignmentValue(matrix, true)).toBe(14);
  });
});

describe('Hungarian reference', () => {
  const minMatrix = [
    [82, 83, 69, 92],
    [77, 37, 49, 92],
    [11, 69, 5, 86],
    [8, 9, 98, 23],
  ];

  it('returns an independent optimal assignment for minimization', () => {
    const problem = assignment(minMatrix);
    const reference = buildHungarianReference(problem);
    expect(isValidAssignment(reference.assignment)).toBe(true);
    expect(reference.total).toBe(optimalAssignmentValue(minMatrix, false));
    expect(reference.optimalVerified).toBe(true);
    expect(reference.total).toBe(totalForAssignment(minMatrix, reference.assignment));
  });

  it('transforms benefits and maximizes with the original matrix', () => {
    const benefits = [
      [10, 5, 8],
      [6, 12, 4],
      [9, 7, 11],
    ];
    const problem = assignment(benefits, 'hungarianMax');
    const reference = buildHungarianReference(problem);
    expect(reference.transformed[0][0]).toBe(2);
    expect(reference.total).toBe(optimalAssignmentValue(benefits, true));
    expect(reference.optimalVerified).toBe(true);
    expect(Object.values(reference.stages.map((s) => s.kind))).toContain('transform');
  });

  it('validates the max transformation stage', () => {
    const benefits = [
      [10, 5, 8],
      [6, 12, 4],
      [9, 7, 11],
    ];
    const problem = assignment(benefits, 'hungarianMax');
    const reference = buildHungarianReference(problem);
    expect(validateTransform(problem, reference.transformed).ok).toBe(true);
    expect(validateTransform(problem, benefits).ok).toBe(false);
  });

  it('accepts alternative optimal assignments and rejects feasible non-optimal ones', () => {
    // Multiple optima: rows can swap the 1/10 pair in columns 0/1.
    const matrix = [
      [1, 10, 5],
      [10, 1, 5],
      [7, 7, 20],
    ];
    const problem = assignment(matrix);
    const oracle = enumerateOptimalAssignments(matrix, false);
    expect(oracle.assignments.length).toBeGreaterThan(1);
    const reference = buildHungarianReference(problem);
    for (const candidate of oracle.assignments) {
      expect(validateAssignment(problem, reference.stages.at(-1)!.matrix, candidate).ok).toBe(true);
    }
    const feasibleNonOptimal = [2, 0, 1];
    expect(totalForAssignment(matrix, feasibleNonOptimal)).not.toBe(oracle.value);
    expect(validateAssignment(problem, reference.stages.at(-1)!.matrix, feasibleNonOptimal).ok).toBe(false);
  });
});

describe('Hungarian stage validators', () => {
  const matrix = [
    [82, 83, 69, 92],
    [77, 37, 49, 92],
    [11, 69, 5, 86],
    [8, 9, 98, 23],
  ];
  const problem = assignment(matrix);

  it('checks row and column reductions', () => {
    const rows = rowReduced(matrix);
    expect(validateRowReduction(problem, matrix, rows).ok).toBe(true);
    expect(validateRowReduction(problem, matrix, matrix).ok).toBe(false);
    const cols = colReduced(rows);
    expect(validateColReduction(rows, cols).ok).toBe(true);
    expect(validateColReduction(rows, rows).ok).toBe(false);
  });

  it('rejects covers that are not minimal', () => {
    const reduced = colReduced(rowReduced(matrix));
    const allRows = matrix.map((_, index) => ({ type: 'row' as const, index }));
    const validation = validateCover(reduced, allRows);
    if (minimumLineCount(reduced) < 4) {
      expect(validation.ok).toBe(false);
    }
    expect(validateCover(reduced, minimumLineCover(reduced)).ok).toBe(true);
  });

  it('detects a missing or duplicated assignment', () => {
    const finished = buildHungarianReference(problem);
    expect(validateAssignment(problem, finished.stages.at(-1)!.matrix, [0, 0, 1, 2]).ok).toBe(false);
    expect(validateAssignment(problem, finished.stages.at(-1)!.matrix, [0, 1, 2, -1]).ok).toBe(false);
  });

  it('applies the adjustment rule independently', () => {
    const reduced = colReduced(rowReduced(matrix));
    expect(validateAdjustment(reduced, adjustedMatrix(reduced)).ok).toBe(true);
  });
});

describe('assignment generator', () => {
  it('generates valid deterministic instances', () => {
    const first = generateAssignment('hungarianMin', 'easy', 4, 12345);
    const second = generateAssignment('hungarianMin', 'easy', 4, 12345);
    expect(validateAssignmentInstance(first)).toEqual([]);
    expect(first.values).toEqual(second.values);
    expect(first.id).not.toBe(second.id);
  });

  it('produces instances for all sizes, modes and difficulties', () => {
    for (const method of ['hungarianMin', 'hungarianMax'] as const) {
      for (const difficulty of ['easy', 'intermediate', 'hard'] as const) {
        for (const size of [3, 4, 5, 6]) {
          const problem = generateAssignment(method, difficulty, size, 1000 + size);
          expect(validateAssignmentInstance(problem)).toEqual([]);
          const reference = buildHungarianReference(problem);
          expect(reference.optimalVerified).toBe(true);
          expect(isValidAssignment(reference.assignment)).toBe(true);
        }
      }
    }
  });

  it('favours alternative optima for hard instances', () => {
    const hard = generateAssignment('hungarianMin', 'hard', 4, 777);
    const reference = buildHungarianReference(hard);
    expect(reference.alternativeOptima).toBeGreaterThan(1);
  });
});
