import { describe, expect, it } from 'vitest';
import type { TransportationInstance } from '../../types';
import { createTransportState, computingPenalties, transportCost } from './common';
import { generateTransportation, validateTransportationInstance } from './generator';
import { solveLeastCost, validateLeastCost } from './leastCost';
import { northwestExpected, solveNorthwest, validateNorthwest } from './northwest';
import { optimalTransportCost } from './optimal';
import { solveVogel, validateVogelLine, validateVogelPenalties } from './vogel';
import { sum } from '../../utils';

function instance(
  costs: number[][],
  supply: number[],
  demand: number[],
  method: TransportationInstance['method'] = 'northwest',
): TransportationInstance {
  return {
    id: 'test',
    method,
    costs,
    supply,
    demand,
    seed: 1,
    difficulty: 'easy',
    createdAt: new Date().toISOString(),
  };
}

function checkFeasible(problem: TransportationInstance, allocations: Array<{ row: number; col: number; amount: number }>) {
  const rowSums = Array(problem.supply.length).fill(0);
  const colSums = Array(problem.demand.length).fill(0);
  for (const allocation of allocations) {
    expect(allocation.amount).toBeGreaterThan(0);
    rowSums[allocation.row] += allocation.amount;
    colSums[allocation.col] += allocation.amount;
  }
  expect(rowSums).toEqual(problem.supply);
  expect(colSums).toEqual(problem.demand);
  const keys = allocations.map((a) => `${a.row}-${a.col}`);
  expect(new Set(keys).size).toBe(keys.length);
}

describe('northwest corner', () => {
  it('produces the expected deterministic allocations and cost', () => {
    const problem = instance(
      [
        [2, 3, 1],
        [5, 4, 8],
        [5, 6, 8],
      ],
      [10, 15, 25],
      [15, 15, 20],
    );
    const reference = solveNorthwest(problem);
    checkFeasible(problem, reference.allocations);
    expect(reference.allocations).toEqual([
      { row: 0, col: 0, amount: 10 },
      { row: 1, col: 0, amount: 5 },
      { row: 1, col: 1, amount: 10 },
      { row: 2, col: 1, amount: 5 },
      { row: 2, col: 2, amount: 20 },
    ]);
    expect(reference.totalCost).toBe(transportCost(problem.costs, reference.allocations));
    expect(reference.optimalCost).toBeLessThanOrEqual(reference.totalCost);
  });

  it('detects degeneracy on a 2x2 balanced instance', () => {
    const problem = instance(
      [
        [1, 2],
        [3, 4],
      ],
      [10, 10],
      [10, 10],
    );
    const reference = solveNorthwest(problem);
    expect(reference.allocations).toHaveLength(2);
    expect(reference.degenerate).toBe(true);
    expect(reference.totalCost).toBe(10 * 1 + 10 * 4);
  });

  it('validates the cell order and the maximum amount', () => {
    const problem = instance(
      [
        [1, 2],
        [3, 4],
      ],
      [10, 10],
      [10, 10],
    );
    const state = createTransportState(problem);
    expect(northwestExpected(problem, state)).toEqual({ cell: { row: 0, col: 0 }, amount: 10 });
    expect(validateNorthwest(problem, state, { row: 0, col: 1 }, 10).correct).toBe(false);
    expect(validateNorthwest(problem, state, { row: 0, col: 0 }, 5).correct).toBe(false);
    expect(validateNorthwest(problem, state, { row: 0, col: 0 }, 10).correct).toBe(true);
  });
});

describe('least cost', () => {
  it('saturates minimum-cost cells and covers supply/demand', () => {
    const problem = instance(
      [
        [8, 6, 10],
        [9, 12, 5],
        [7, 4, 11],
      ],
      [20, 15, 25],
      [15, 25, 20],
      'leastCost',
    );
    const reference = solveLeastCost(problem);
    checkFeasible(problem, reference.allocations);
    expect(reference.totalCost).toBe(transportCost(problem.costs, reference.allocations));
    expect(reference.optimalCost).toBeLessThanOrEqual(reference.totalCost);
    expect(reference.allocations.length).toBeLessThanOrEqual(3 + 3 - 1);
  });

  it('accepts every valid tie and rejects a non-minimum cell', () => {
    const problem = instance(
      [
        [1, 1],
        [2, 2],
      ],
      [10, 10],
      [10, 10],
      'leastCost',
    );
    const state = createTransportState(problem);
    expect(validateLeastCost(problem, state, { row: 0, col: 0 }, 10).correct).toBe(true);
    expect(validateLeastCost(problem, state, { row: 0, col: 1 }, 10).correct).toBe(true);
    expect(validateLeastCost(problem, state, { row: 1, col: 0 }, 10).correct).toBe(false);
    expect(validateLeastCost(problem, state, { row: 0, col: 0 }, 4).correct).toBe(false);
  });

  it('uses the original matrix for the total cost', () => {
    const problem = instance(
      [
        [1, 9],
        [9, 1],
      ],
      [5, 5],
      [5, 5],
      'leastCost',
    );
    const reference = solveLeastCost(problem);
    expect(reference.totalCost).toBe(10);
    expect(reference.optimalCost).toBe(10);
  });
});

describe('Vogel', () => {
  it('computes penalties, selects the maximum line, and balances the solution', () => {
    const problem = instance(
      [
        [2, 2, 2, 1],
        [10, 8, 5, 4],
        [7, 6, 6, 8],
      ],
      [30, 30, 10],
      [15, 20, 15, 20],
      'vogel',
    );
    const reference = solveVogel(problem);
    checkFeasible(problem, reference.allocations);
    expect(reference.totalCost).toBe(transportCost(problem.costs, reference.allocations));
    expect(reference.optimalCost).toBeLessThanOrEqual(reference.totalCost);
    expect(reference.iterations.length).toBeGreaterThan(0);
    expect(reference.iterations[0].penalties).toBeDefined();
  });

  it('uses the single eligible cost when a line only has one cell', () => {
    const problem = instance(
      [
        [5, 9, 7],
        [9, 9, 9],
        [9, 9, 9],
      ],
      [5, 0, 0],
      [0, 5, 0],
      'vogel',
    );
    const state = createTransportState(problem);
    const penalties = computingPenalties(problem, state);
    expect(penalties.rows[0]).toBe(9);
    expect(penalties.rows[1]).toBeNull();
    expect(penalties.cols[1]).toBe(9);
    expect(penalties.cols[0]).toBeNull();
  });

  it('accepts ties in penalties without penalizing the alternative line', () => {
    const problem = instance(
      [
        [1, 2],
        [2, 1],
      ],
      [10, 10],
      [10, 10],
      'vogel',
    );
    const state = createTransportState(problem);
    const row = validateVogelLine(problem, state, { type: 'row', index: 0 });
    const col = validateVogelLine(problem, state, { type: 'col', index: 1 });
    expect(row.correct).toBe(true);
    expect(col.correct).toBe(true);
  });

  it('validates every active line penalty and flags a wrong value', () => {
    const problem = instance(
      [
        [3, 7],
        [8, 2],
      ],
      [10, 10],
      [10, 10],
      'vogel',
    );
    const state = createTransportState(problem);
    const expected = computingPenalties(problem, state);
    expect(validateVogelPenalties(problem, state, expected).correct).toBe(true);
    const wrong = {
      rows: expected.rows.map((v) => (v === null ? null : v + 1)),
      cols: expected.cols,
    };
    expect(validateVogelPenalties(problem, state, wrong).correct).toBe(false);
  });
});

describe('independent transportation optimum', () => {
  it('computes a known optimum', () => {
    expect(
      optimalTransportCost(
        [
          [1, 2],
          [3, 4],
        ],
        [10, 10],
        [10, 10],
      ),
    ).toBe(50);
  });

  it('never exceeds a greedy cost and satisfies balance on generated instances', () => {
    const methods = ['northwest', 'leastCost', 'vogel'] as const;
    for (const method of methods) {
      for (let seed = 1; seed <= 6; seed++) {
        const problem = generateTransportation(method, 'intermediate', 3, 4, seed * 131);
        expect(validateTransportationInstance(problem)).toEqual([]);
        const reference =
          method === 'northwest'
            ? solveNorthwest(problem)
            : method === 'leastCost'
              ? solveLeastCost(problem)
              : solveVogel(problem);
        checkFeasible(problem, reference.allocations);
        expect(sum(reference.allocations.map((a) => a.amount))).toBe(sum(problem.supply));
        expect(reference.optimalCost).toBeLessThanOrEqual(reference.totalCost);
      }
    }
  });
});
