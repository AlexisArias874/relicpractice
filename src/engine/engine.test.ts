import { describe, expect, it } from 'vitest';
import { createExercise, buildExerciseResult } from './exerciseFactory';
import { generateTransportation, validateTransportationInstance } from '../modules/transportation/generator';
import { generateAssignment, validateAssignmentInstance } from '../modules/assignment/generator';
import { solveNorthwest } from '../modules/transportation/northwest';
import { solveLeastCost } from '../modules/transportation/leastCost';
import { solveVogel } from '../modules/transportation/vogel';
import type { ExerciseConfig, StepResult } from '../types';

const config: ExerciseConfig = {
  category: 'transportation',
  method: 'northwest',
  difficulty: 'easy',
  rows: 3,
  cols: 3,
  mode: 'training',
};

function step(correct: boolean, weight: number): StepResult {
  return { label: 'Paso', detail: 'detalle', correct, weight };
}

describe('exercise factory', () => {
  it('computes a reference before the user starts and keeps it outside the instance', () => {
    const exercise = createExercise(config, 4242);
    expect(exercise.transportation).toBeDefined();
    expect((exercise.transportation as unknown as Record<string, unknown>).allocations).toBeUndefined();
    expect((exercise.transportation as unknown as Record<string, unknown>).totalCost).toBeUndefined();
    expect(exercise.reference).toBeDefined();
    expect((exercise.reference as { allocations: unknown[] }).allocations.length).toBeGreaterThan(0);
    expect((exercise.reference as { summary: string[] }).summary.length).toBeGreaterThan(0);
  });

  it('creates a fresh exercise with a new id and clean data on restart', () => {
    const first = createExercise(config, 90);
    const second = createExercise(config, 90);
    expect(first.id).not.toBe(second.id);
    expect(first.reference).not.toBe(second.reference);
  });

  it('creates valid Hungarian exercises for both modalities', () => {
    const min = createExercise(
      { ...config, category: 'assignment', method: 'hungarianMin', rows: 4, cols: 4, mode: 'exam' },
      111,
    );
    const max = createExercise(
      { ...config, category: 'assignment', method: 'hungarianMax', rows: 4, cols: 4 },
      111,
    );
    expect(min.assignment).toBeDefined();
    expect(max.assignment).toBeDefined();
    expect(validateAssignmentInstance(min.assignment!)).toEqual([]);
    expect(validateAssignmentInstance(max.assignment!)).toEqual([]);
  });
});

describe('scoring', () => {
  it('is a reproducible weighted percentage', () => {
    const exercise = createExercise(config, 55);
    const result = buildExerciseResult({
      exercise,
      steps: [step(true, 10), step(true, 10), step(false, 20)],
      totalValue: 100,
      totalLabel: 'Costo total',
      timeSeconds: 75,
    });
    expect(result.score).toBe(50);
    expect(result.passed).toBe(false);
    expect(result.timeSeconds).toBe(75);
    expect(result.referenceSummary.length).toBeGreaterThan(0);
    expect(result.totalValue).toBe(100);
  });

  it('gives 100 when every step is correct', () => {
    const exercise = createExercise(config, 56);
    const result = buildExerciseResult({
      exercise,
      steps: [step(true, 10), step(true, 20)],
      totalValue: 100,
      totalLabel: 'Costo total',
      timeSeconds: 10,
    });
    expect(result.score).toBe(100);
    expect(result.passed).toBe(true);
  });
});

describe('transportation generator difficulty', () => {
  it('generates valid balanced instances with the requested dimensions', () => {
    const methods = ['northwest', 'leastCost', 'vogel'] as const;
    for (const method of methods) {
      for (const difficulty of ['easy', 'intermediate'] as const) {
        for (const [rows, cols] of [
          [3, 4],
          [4, 4],
          [5, 3],
        ]) {
          const problem = generateTransportation(method, difficulty, rows, cols, 91 + rows * cols);
          expect(validateTransportationInstance(problem)).toEqual([]);
          expect(problem.costs.length).toBe(rows);
          expect(problem.costs[0].length).toBe(cols);
          expect(problem.supply.length).toBe(rows);
          expect(problem.demand.length).toBe(cols);
        }
      }
    }
  });

  it('favours degenerate instances at hard difficulty', () => {
    const problem = generateTransportation('vogel', 'hard', 4, 4, 24680);
    const reference = solveVogel(problem);
    expect(reference.degenerate).toBe(true);
  });

  it('reproduces the same problem from the same seed', () => {
    const first = generateTransportation('leastCost', 'intermediate', 3, 3, 2024);
    const second = generateTransportation('leastCost', 'intermediate', 3, 3, 2024);
    expect(first.costs).toEqual(second.costs);
    expect(first.supply).toEqual(second.supply);
    expect(first.demand).toEqual(second.demand);
    expect(first.id).not.toBe(second.id);
  });

  it('has deterministic reference solutions for a given instance', () => {
    const problem = generateTransportation('northwest', 'easy', 3, 3, 7);
    expect(solveNorthwest(problem)).toEqual(solveNorthwest(problem));
    const least = generateTransportation('leastCost', 'easy', 3, 3, 7);
    expect(solveLeastCost(least)).toEqual(solveLeastCost(least));
  });
});
