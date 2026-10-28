import type {
  Allocation,
  Cell,
  TransportState,
  TransportationInstance,
} from '../../types/transportation';

export interface PenaltyResult {
  rows: Array<number | null>;
  cols: Array<number | null>;
}

export function createTransportState(
  instance: TransportationInstance,
): TransportState {
  return {
    supply: [...instance.supply],
    demand: [...instance.demand],
    allocations: [],
    iteration: 0,
  };
}

export function remainingSupply(state: TransportState): number {
  return state.supply.reduce((a, b) => a + b, 0);
}

export function isAvailable(
  state: TransportState,
  row: number,
  col: number,
): boolean {
  return state.supply[row] > 0 && state.demand[col] > 0;
}

export function availableCells(
  instance: TransportationInstance,
  state: TransportState,
): Cell[] {
  const cells: Cell[] = [];
  for (let r = 0; r < instance.costs.length; r++) {
    for (let c = 0; c < instance.costs[r].length; c++) {
      if (isAvailable(state, r, c)) cells.push({ row: r, col: c });
    }
  }
  return cells;
}

export function minimumCostCells(
  instance: TransportationInstance,
  state: TransportState,
): Cell[] {
  const cells = availableCells(instance, state);
  if (!cells.length) return [];
  const min = Math.min(...cells.map(({ row, col }) => instance.costs[row][col]));
  return cells.filter(({ row, col }) => instance.costs[row][col] === min);
}

/**
 * Vogel penalties use the two lowest eligible costs. If a line only has one
 * eligible cell, its penalty is that single cost (documented policy).
 * Null means the line is inactive.
 */
export function computingPenalties(
  instance: TransportationInstance,
  state: TransportState,
): PenaltyResult {
  const rows = instance.costs.map((row, r) => {
    if (state.supply[r] <= 0) return null;
    const costs = row.filter((_, c) => state.demand[c] > 0).sort((a, b) => a - b);
    if (!costs.length) return null;
    return costs.length === 1 ? costs[0] : costs[1] - costs[0];
  });
  const cols = instance.costs[0].map((_, c) => {
    if (state.demand[c] <= 0) return null;
    const costs = instance.costs
      .map((row) => row[c])
      .filter((_, r) => state.supply[r] > 0)
      .sort((a, b) => a - b);
    if (!costs.length) return null;
    return costs.length === 1 ? costs[0] : costs[1] - costs[0];
  });
  return { rows, cols };
}

export function maximumPenalty(result: PenaltyResult): number {
  const values = [...result.rows, ...result.cols].filter(
    (v): v is number => v !== null,
  );
  return values.length ? Math.max(...values) : 0;
}

export function applyAllocation(
  state: TransportState,
  cell: Cell,
  amount: number,
): TransportState {
  const supply = [...state.supply];
  const demand = [...state.demand];
  supply[cell.row] -= amount;
  demand[cell.col] -= amount;
  // Guard against floating point drift (inputs are integers anyway).
  supply[cell.row] = Math.max(0, supply[cell.row]);
  demand[cell.col] = Math.max(0, demand[cell.col]);
  const allocations: Allocation[] = [
    ...state.allocations,
    { row: cell.row, col: cell.col, amount },
  ];
  return {
    supply,
    demand,
    allocations,
    iteration: state.iteration + 1,
  };
}

export function transportCost(
  costs: number[][],
  allocations: Allocation[],
): number {
  return allocations.reduce(
    (total, a) => total + costs[a.row][a.col] * a.amount,
    0,
  );
}

export function isComplete(
  instance: TransportationInstance,
  state: TransportState,
): boolean {
  return (
    state.supply.every((v) => v === 0) &&
    state.demand.every((v) => v === 0) &&
    state.allocations.length > 0
  );
}

export function detectDegenerate(
  allocations: Allocation[],
  rows: number,
  cols: number,
): boolean {
  const positive = allocations.filter((a) => a.amount > 0).length;
  return positive < rows + cols - 1;
}

export function describePenalties(result: PenaltyResult): string {
  const rows = result.rows
    .map((v, i) => (v === null ? `O${i + 1}: —` : `O${i + 1}: ${v}`))
    .join(', ');
  const cols = result.cols
    .map((v, i) => (v === null ? `D${i + 1}: —` : `D${i + 1}: ${v}`))
    .join(', ');
  return `${rows} | ${cols}`;
}
