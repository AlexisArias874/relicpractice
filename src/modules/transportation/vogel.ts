import type {
  Cell,
  TransportationInstance,
  TransportIteration,
  TransportReference,
  TransportState,
} from '../../types/transportation';
import {
  applyAllocation,
  availableCells,
  computingPenalties,
  createTransportState,
  detectDegenerate,
  isAvailable,
  isComplete,
  maximumPenalty,
  transportCost,
  type PenaltyResult,
} from './common';
import { optimalTransportCost } from './optimal';

export interface Line {
  type: 'row' | 'col';
  index: number;
}

export interface PenaltyMismatch {
  type: 'row' | 'col';
  index: number;
  expected: number | null;
  given: number | null;
}

export function validateVogelPenalties(
  instance: TransportationInstance,
  state: TransportState,
  given: PenaltyResult,
): { correct: boolean; mismatches: PenaltyMismatch[] } {
  const expected = computingPenalties(instance, state);
  const mismatches: PenaltyMismatch[] = [];
  expected.rows.forEach((value, index) => {
    const userValue = given.rows[index] ?? null;
    if (value === null) {
      if (userValue !== null && userValue !== 0) {
        mismatches.push({ type: 'row', index, expected: value, given: userValue });
      }
    } else if (userValue !== value) {
      mismatches.push({ type: 'row', index, expected: value, given: userValue });
    }
  });
  expected.cols.forEach((value, index) => {
    const userValue = given.cols[index] ?? null;
    if (value === null) {
      if (userValue !== null && userValue !== 0) {
        mismatches.push({ type: 'col', index, expected: value, given: userValue });
      }
    } else if (userValue !== value) {
      mismatches.push({ type: 'col', index, expected: value, given: userValue });
    }
  });
  return { correct: mismatches.length === 0, mismatches };
}

export function validateVogelLine(
  instance: TransportationInstance,
  state: TransportState,
  line: Line,
): { correct: boolean; message: string } {
  const penalties = computingPenalties(instance, state);
  const value =
    line.type === 'row' ? penalties.rows[line.index] : penalties.cols[line.index];
  const max = maximumPenalty(penalties);
  if (value === null || value === undefined) {
    return {
      correct: false,
      message: 'La fila o columna elegida está satisfecha y ya no participa.',
    };
  }
  if (value !== max) {
    return {
      correct: false,
      message: `La mayor penalización es ${max}; la línea elegida tiene ${value}.`,
    };
  }
  return {
    correct: true,
    message: `Correcto: la penalización ${value} es la mayor (puede haber empates válidos).`,
  };
}

export function validateVogelCell(
  instance: TransportationInstance,
  state: TransportState,
  line: Line,
  cell: Cell,
): { correct: boolean; message: string; errorType?: 'method' | 'invalid-assignment' } {
  if (!isAvailable(state, cell.row, cell.col)) {
    return {
      correct: false,
      message: 'La celda ya está bloqueada: no tiene oferta o demanda disponible.',
      errorType: 'invalid-assignment',
    };
  }
  const inLine =
    line.type === 'row' ? cell.row === line.index : cell.col === line.index;
  if (!inLine) {
    return {
      correct: false,
      message: 'Debes elegir una celda dentro de la fila o columna seleccionada.',
      errorType: 'method',
    };
  }
  const candidates = availableCells(instance, state).filter((c) =>
    line.type === 'row' ? c.row === line.index : c.col === line.index,
  );
  const minCost = Math.min(
    ...candidates.map((c) => instance.costs[c.row][c.col]),
  );
  if (instance.costs[cell.row][cell.col] !== minCost) {
    return {
      correct: false,
      message: `Dentro de la línea elegida, el menor costo disponible es ${minCost}.`,
      errorType: 'method',
    };
  }
  return {
    correct: true,
    message: `Correcto: la celda O${cell.row + 1}–D${cell.col + 1} tiene el menor costo (${minCost}) de la línea.`,
  };
}

export function validateVogelAmount(
  state: TransportState,
  cell: Cell,
  amount: number,
): { correct: boolean; message: string; errorType?: 'arithmetic' | 'invalid-assignment' } {
  if (!Number.isFinite(amount) || amount <= 0) {
    return {
      correct: false,
      message: 'La cantidad debe ser un entero positivo.',
      errorType: 'invalid-assignment',
    };
  }
  const expected = Math.min(state.supply[cell.row], state.demand[cell.col]);
  if (amount !== expected) {
    return {
      correct: false,
      message: `Asignación máxima: min(${state.supply[cell.row]}, ${state.demand[cell.col]}) = ${expected}.`,
      errorType: 'arithmetic',
    };
  }
  return { correct: true, message: `Correcto: se asignan ${amount}.` };
}

export function solveVogel(
  instance: TransportationInstance,
): TransportReference {
  let state = createTransportState(instance);
  const iterations: TransportIteration[] = [];
  let guard = 0;
  while (!isComplete(instance, state) && guard++ < 500) {
    const penalties = computingPenalties(instance, state);
    const max = maximumPenalty(penalties);
    // Reference tie policy: rows before columns, then lowest index.
    const rowIndex = penalties.rows.findIndex((value) => value === max);
    const colIndex = penalties.cols.findIndex((value) => value === max);
    const line: Line | null =
      rowIndex >= 0
        ? { type: 'row', index: rowIndex }
        : colIndex >= 0
          ? { type: 'col', index: colIndex }
          : null;
    if (line === null) break;
    const candidates = availableCells(instance, state).filter((c) =>
      line.type === 'row' ? c.row === line.index : c.col === line.index,
    );
    const minCost = Math.min(...candidates.map((c) => instance.costs[c.row][c.col]));
    const cell = candidates.find(
      (c) => instance.costs[c.row][c.col] === minCost,
    )!;
    const amount = Math.min(state.supply[cell.row], state.demand[cell.col]);
    const beforeSupply = [...state.supply];
    const beforeDemand = [...state.demand];
    state = applyAllocation(state, cell, amount);
    iterations.push({
      iteration: iterations.length + 1,
      cell,
      amount,
      supplyBefore: beforeSupply,
      demandBefore: beforeDemand,
      supplyAfter: [...state.supply],
      demandAfter: [...state.demand],
      penalties,
      selectedLine: line,
      note: `Mayor penalización = ${max} en ${
        line.type === 'row' ? 'O' : 'D'
      }${line.index + 1}. Menor costo de la línea = ${minCost}; se asignan ${amount}.`,
    });
  }
  const totalCost = transportCost(instance.costs, state.allocations);
  const optimalCost = optimalTransportCost(
    instance.costs,
    instance.supply,
    instance.demand,
  );
  const degenerate = detectDegenerate(
    state.allocations,
    instance.supply.length,
    instance.demand.length,
  );
  const summary = [
    'Penalización = diferencia entre los dos menores costos elegibles de la línea; si solo hay un costo elegible, la penalización es ese costo.',
    'En cada iteración se elige la línea con mayor penalización y, dentro de ella, la celda de menor costo.',
    ...iterations.map(
      (it) =>
        `Iteración ${it.iteration}: penalizaciones O=[${it.penalties?.rows
          .map((v) => (v === null ? '—' : v))
          .join(', ')}], D=[${it.penalties?.cols
          .map((v) => (v === null ? '—' : v))
          .join(', ')}]; línea ${
          it.selectedLine?.type === 'row' ? 'O' : 'D'
        }${(it.selectedLine?.index ?? 0) + 1}; celda O${it.cell.row + 1}–D${
          it.cell.col + 1
        } ← ${it.amount}.`,
    ),
    `Costo de la solución inicial: ${totalCost}.`,
    degenerate
      ? 'La solución es degenerada: hay menos de m+n−1 asignaciones positivas.'
      : 'La solución no es degenerada.',
    `Costo óptimo verificado de forma independiente: ${optimalCost}. ${
      optimalCost === totalCost
        ? 'La solución inicial coincide con el óptimo.'
        : 'La solución inicial no es óptima; se necesita un método de mejora (MODI) para alcanzar el óptimo.'
    }`,
  ];
  return {
    allocations: state.allocations,
    totalCost,
    iterations,
    degenerate,
    optimalVerified: optimalCost === totalCost,
    optimalCost,
    summary,
  };
}
