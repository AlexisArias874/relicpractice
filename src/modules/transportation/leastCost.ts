import type {
  Cell,
  TransportationInstance,
  TransportIteration,
  TransportReference,
  TransportState,
} from '../../types/transportation';
import {
  applyAllocation,
  createTransportState,
  detectDegenerate,
  isAvailable,
  isComplete,
  minimumCostCells,
  transportCost,
} from './common';
import { optimalTransportCost } from './optimal';

/**
 * Tie policy for the reference path: among the minimum-cost eligible cells,
 * choose the smallest row index, then the smallest column index. The evaluator
 * does not enforce that tie-break (any eligible minimum-cost cell is valid), it
 * only uses the policy to produce a reproducible reference.
 */
export function validateLeastCost(
  instance: TransportationInstance,
  state: TransportState,
  cell: Cell,
  amount: number,
): { correct: boolean; message: string; errorType?: 'method' | 'arithmetic' | 'invalid-assignment' } {
  if (isComplete(instance, state)) {
    return {
      correct: false,
      message: 'El ejercicio ya está completo.',
      errorType: 'invalid-assignment',
    };
  }
  if (!isAvailable(state, cell.row, cell.col)) {
    return {
      correct: false,
      message:
        'Esa celda ya está bloqueada: su origen o destino quedó satisfecho. Elige una celda con oferta y demanda restantes.',
      errorType: 'invalid-assignment',
    };
  }
  const minCells = minimumCostCells(instance, state);
  const minCost = minCells.length
    ? instance.costs[minCells[0].row][minCells[0].col]
    : 0;
  if (instance.costs[cell.row][cell.col] !== minCost) {
    return {
      correct: false,
      message: `Decisión metodológica incorrecta: el menor costo disponible es ${minCost}, no ${
        instance.costs[cell.row][cell.col]
      }.`,
      errorType: 'method',
    };
  }
  const expected = Math.min(
    state.supply[cell.row],
    state.demand[cell.col],
  );
  if (!Number.isFinite(amount) || amount <= 0) {
    return {
      correct: false,
      message: 'La cantidad debe ser un entero positivo.',
      errorType: 'invalid-assignment',
    };
  }
  if (amount !== expected) {
    return {
      correct: false,
      message: `Con la política de asignación máxima debes colocar min(${
        state.supply[cell.row]
      }, ${state.demand[cell.col]}) = ${expected}.`,
      errorType: 'arithmetic',
    };
  }
  return {
    correct: true,
    message: `Correcto: O${cell.row + 1}–D${cell.col + 1} tiene el menor costo disponible (${minCost}) y asignas ${amount}.`,
  };
}

export function solveLeastCost(
  instance: TransportationInstance,
): TransportReference {
  let state = createTransportState(instance);
  const iterations: TransportIteration[] = [];
  let guard = 0;
  while (!isComplete(instance, state) && guard++ < 500) {
    const minCells = minimumCostCells(instance, state);
    if (!minCells.length) break;
    const cell = minCells[0];
    const amount = Math.min(state.supply[cell.row], state.demand[cell.col]);
    const beforeSupply = [...state.supply];
    const beforeDemand = [...state.demand];
    state = applyAllocation(state, cell, amount);
    const ties = minCells.length - 1;
    iterations.push({
      iteration: iterations.length + 1,
      cell,
      amount,
      supplyBefore: beforeSupply,
      demandBefore: beforeDemand,
      supplyAfter: [...state.supply],
      demandAfter: [...state.demand],
      note: `Menor costo disponible: ${instance.costs[cell.row][cell.col]}${
        ties > 0
          ? ` (${ties} celda${ties > 1 ? 's' : ''} empatada${ties > 1 ? 's' : ''}; se eligió la de menor índice)`
          : ''
      }. Se asignan ${amount}.`,
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
    'En cada iteración se elige la celda disponible de menor costo y se satura con la mayor cantidad posible.',
    ...iterations.map(
      (it) =>
        `Iteración ${it.iteration}: O${it.cell.row + 1}–D${it.cell.col + 1} (costo ${
          instance.costs[it.cell.row][it.cell.col]
        }) ← ${it.amount}; saldos O=[${it.supplyAfter.join(', ')}], D=[${it.demandAfter.join(
          ', ',
        )}].`,
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
