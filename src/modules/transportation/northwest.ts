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
  isComplete,
  transportCost,
} from './common';
import { optimalTransportCost } from './optimal';

export interface NorthwestAction {
  cell: Cell;
  amount: number;
}

/** The corner rule is deterministic: first residual origin and destination. */
export function northwestExpected(
  instance: TransportationInstance,
  state: TransportState,
): NorthwestAction | null {
  const row = state.supply.findIndex((v) => v > 0);
  const col = state.demand.findIndex((v) => v > 0);
  if (row === -1 || col === -1) return null;
  return {
    cell: { row, col },
    amount: Math.min(state.supply[row], state.demand[col]),
  };
}

export function validateNorthwest(
  instance: TransportationInstance,
  state: TransportState,
  cell: Cell,
  amount: number,
): { correct: boolean; message: string; errorType?: 'method' | 'arithmetic' | 'invalid-assignment' } {
  const expected = northwestExpected(instance, state);
  if (!expected) {
    return {
      correct: false,
      message: 'El ejercicio ya está completo.',
      errorType: 'invalid-assignment',
    };
  }
  if (cell.row !== expected.cell.row || cell.col !== expected.cell.col) {
    return {
      correct: false,
      message: `La esquina noroeste actual es O${expected.cell.row + 1}–D${
        expected.cell.col + 1
      }. No puedes asignar todavía en O${cell.row + 1}–D${cell.col + 1}.`,
      errorType: 'method',
    };
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return {
      correct: false,
      message: 'La cantidad debe ser un entero positivo.',
      errorType: 'invalid-assignment',
    };
  }
  if (amount !== expected.amount) {
    return {
      correct: false,
      message: `Cantidad incorrecta: debes asignar min(oferta, demanda) = min(${
        state.supply[cell.row]
      }, ${state.demand[cell.col]}) = ${expected.amount}.`,
      errorType: 'arithmetic',
    };
  }
  return {
    correct: true,
    message: `Correcto: asignas ${amount} en O${cell.row + 1}–D${
      cell.col + 1
    } y actualizas los saldos.`,
  };
}

export function solveNorthwest(
  instance: TransportationInstance,
): TransportReference {
  let state = createTransportState(instance);
  const iterations: TransportIteration[] = [];
  let guard = 0;
  while (!isComplete(instance, state) && guard++ < 500) {
    const expected = northwestExpected(instance, state);
    if (!expected) break;
    const beforeSupply = [...state.supply];
    const beforeDemand = [...state.demand];
    state = applyAllocation(state, expected.cell, expected.amount);
    iterations.push({
      iteration: iterations.length + 1,
      cell: expected.cell,
      amount: expected.amount,
      supplyBefore: beforeSupply,
      demandBefore: beforeDemand,
      supplyAfter: [...state.supply],
      demandAfter: [...state.demand],
      note: `Se asigna min(${beforeSupply[expected.cell.row]}, ${
        beforeDemand[expected.cell.col]
      }) = ${expected.amount} en la celda noroeste disponible.`,
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
    'Se recorre la matriz desde la esquina superior izquierda.',
    ...iterations.map(
      (it) =>
        `Iteración ${it.iteration}: O${it.cell.row + 1}–D${it.cell.col + 1} ← ${
          it.amount
        }; saldos O=[${it.supplyAfter.join(', ')}], D=[${it.demandAfter.join(
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
