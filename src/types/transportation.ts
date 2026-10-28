export type TransportationMethod = 'northwest' | 'leastCost' | 'vogel';
export type Difficulty = 'easy' | 'intermediate' | 'hard';
export type PracticeMode = 'training' | 'exam';

export interface Cell {
  row: number;
  col: number;
}

export interface TransportationInstance {
  id: string;
  method: TransportationMethod;
  costs: number[][];
  supply: number[];
  demand: number[];
  seed: number;
  difficulty: Difficulty;
  createdAt: string;
}

export interface Allocation {
  row: number;
  col: number;
  amount: number;
}

export interface TransportState {
  supply: number[];
  demand: number[];
  allocations: Allocation[];
  /** Iteration index, useful for UI and history. */
  iteration: number;
}

export type TransportCheckKind =
  | 'cell'
  | 'amount'
  | 'penalties'
  | 'line'
  | 'allocation'
  | 'total'
  | 'complete';

export interface TransportCheck {
  kind: TransportCheckKind;
  correct: boolean;
  message: string;
  weight: number;
}

export interface TransportIteration {
  iteration: number;
  cell: Cell;
  amount: number;
  supplyBefore: number[];
  demandBefore: number[];
  supplyAfter: number[];
  demandAfter: number[];
  penalties?: {
    rows: Array<number | null>;
    cols: Array<number | null>;
  };
  selectedLine?: { type: 'row' | 'col'; index: number };
  note: string;
}

export interface TransportReference {
  allocations: Allocation[];
  totalCost: number;
  iterations: TransportIteration[];
  degenerate: boolean;
  /** True only when the initial solution equals the independently verified optimum. */
  optimalVerified: boolean;
  optimalCost: number;
  /** Human-readable explanation, computed eagerly and only exposed on demand. */
  summary: string[];
}
