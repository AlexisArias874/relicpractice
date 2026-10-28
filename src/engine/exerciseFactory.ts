import type { Exercise, ExerciseConfig, ExerciseResult, StepResult } from '../types/exercise';
import { percent, uid } from '../utils';
import { buildHungarianReference } from '../modules/assignment/hungarian';
import { generateAssignment } from '../modules/assignment/generator';
import { generateTransportation } from '../modules/transportation/generator';
import { solveLeastCost } from '../modules/transportation/leastCost';
import { solveNorthwest } from '../modules/transportation/northwest';
import { solveVogel } from '../modules/transportation/vogel';

export function createExercise(config: ExerciseConfig, seed?: number): Exercise {
  if (config.category === 'transportation') {
    const instance = generateTransportation(
      config.method as 'northwest' | 'leastCost' | 'vogel',
      config.difficulty,
      config.rows,
      config.cols,
      seed,
    );
    const reference =
      instance.method === 'northwest'
        ? solveNorthwest(instance)
        : instance.method === 'leastCost'
          ? solveLeastCost(instance)
          : solveVogel(instance);
    return {
      id: uid('exercise'),
      method: config.method,
      category: 'transportation',
      difficulty: config.difficulty,
      mode: config.mode,
      seed: instance.seed,
      createdAt: instance.createdAt,
      transportation: instance,
      reference,
    };
  }
  const instance = generateAssignment(
    config.method as 'hungarianMin' | 'hungarianMax',
    config.difficulty,
    config.rows,
    seed,
  );
  return {
    id: uid('exercise'),
    method: config.method,
    category: 'assignment',
    difficulty: config.difficulty,
    mode: config.mode,
    seed: instance.seed,
    createdAt: instance.createdAt,
    assignment: instance,
    reference: buildHungarianReference(instance),
  };
}

export { percent };

export interface ResultDraft {
  exercise: Exercise;
  steps: StepResult[];
  totalValue: number;
  totalLabel: string;
  timeSeconds: number;
}

export function buildExerciseResult(draft: ResultDraft): ExerciseResult {
  const { exercise, steps } = draft;
  const totalWeight = steps.reduce((total, step) => total + step.weight, 0);
  const earned = steps.reduce(
    (total, step) => total + (step.correct ? step.weight : 0),
    0,
  );
  const score = totalWeight ? Math.round((earned / totalWeight) * 100) : 0;
  const reference = exercise.reference as { summary?: string[] };
  return {
    id: uid('result'),
    exerciseId: exercise.id,
    method: exercise.method,
    category: exercise.category,
    difficulty: exercise.difficulty,
    mode: exercise.mode,
    score,
    steps,
    totalValue: draft.totalValue,
    totalLabel: draft.totalLabel,
    timeSeconds: draft.timeSeconds,
    completedAt: new Date().toISOString(),
    passed: score >= 70,
    referenceSummary:
      reference.summary ??
      [
        `Solución de referencia: ${draft.totalLabel} = ${draft.totalValue}.`,
      ],
  };
}
