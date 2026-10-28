import type { Difficulty } from './transportation';

export type AssignmentMethod = 'hungarianMin' | 'hungarianMax';

export interface AssignmentInstance {
  id: string;
  method: AssignmentMethod;
  values: number[][];
  seed: number;
  difficulty: Difficulty;
  createdAt: string;
}

export interface AssignmentSelection {
  /** row -> column */
  assignment: number[];
}

export interface HungarianReference {
  transformed: number[][];
  assignment: number[];
  optimalValue: number;
  /** Cost for minimization, benefit for maximization. */
  total: number;
  stages: HungarianStage[];
  optimalVerified: boolean;
  alternativeOptima: number;
  summary: string[];
}

export interface HungarianStage {
  kind:
    | 'transform'
    | 'rowReduction'
    | 'colReduction'
    | 'cover'
    | 'adjust'
    | 'assignment';
  matrix: number[][];
  lines?: Array<{ type: 'row' | 'col'; index: number }>;
  assignment?: number[];
  note: string;
}

export interface HungarianCheck {
  ok: boolean;
  message: string;
  weight?: number;
}
