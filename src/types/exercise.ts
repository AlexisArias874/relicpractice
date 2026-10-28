import type {
  Difficulty,
  PracticeMode,
  TransportationInstance,
  TransportationMethod,
  TransportReference,
} from './transportation';
import type {
  AssignmentInstance,
  AssignmentMethod,
  HungarianReference,
} from './assignment';

export type ExerciseMethod = TransportationMethod | AssignmentMethod;
export type ExerciseCategory = 'transportation' | 'assignment';

export interface ExerciseConfig {
  category: ExerciseCategory;
  method: ExerciseMethod;
  difficulty: Difficulty;
  rows: number;
  cols: number;
  mode: PracticeMode;
}

export interface Exercise {
  id: string;
  method: ExerciseMethod;
  category: ExerciseCategory;
  difficulty: Difficulty;
  mode: PracticeMode;
  seed: number;
  createdAt: string;
  transportation?: TransportationInstance;
  assignment?: AssignmentInstance;
  /** Reference data is kept out of the exercise statement rendering path. */
  reference: TransportReference | HungarianReference;
}

export interface StepResult {
  label: string;
  detail: string;
  correct: boolean;
  weight: number;
  errorType?: ErrorType;
  correctAnswer?: string;
}

export type ErrorType =
  | 'arithmetic'
  | 'method'
  | 'invalid-assignment'
  | 'incomplete'
  | 'alternative';

export interface ExerciseResult {
  id: string;
  exerciseId: string;
  method: ExerciseMethod;
  category: ExerciseCategory;
  difficulty: Difficulty;
  mode: PracticeMode;
  score: number;
  steps: StepResult[];
  totalValue: number;
  totalLabel: string;
  timeSeconds: number;
  completedAt: string;
  passed: boolean;
  referenceSummary: string[];
}

export interface MethodStats {
  attempts: number;
  totalScore: number;
  totalSeconds: number;
  bestScore: number;
}
