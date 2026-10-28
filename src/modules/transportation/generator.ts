import type {
  Difficulty,
  TransportationInstance,
  TransportationMethod,
} from '../../types/transportation';
import { createRng, randomSeed, sum, uid } from '../../utils';
import { solveLeastCost } from './leastCost';
import { solveNorthwest } from './northwest';
import { solveVogel } from './vogel';

function composition(total: number, parts: number, rng: ReturnType<typeof createRng>, min = 3): number[] {
  const usable = total - parts * min;
  if (usable < 0) throw new Error('Total insuficiente para la composición.');
  const weights = Array.from({ length: parts }, () => rng.int(1, 10));
  const weightSum = sum(weights);
  const values = weights.map((w) => min + Math.floor((usable * w) / weightSum));
  let leftover = total - sum(values);
  let guard = 0;
  while (leftover > 0 && guard++ < 10000) {
    values[rng.int(0, parts - 1)] += 1;
    leftover--;
  }
  return values;
}

const RANGES: Record<Difficulty, [number, number]> = {
  easy: [6, 30],
  intermediate: [2, 16],
  hard: [1, 9],
};

function costsFor(
  rows: number,
  cols: number,
  difficulty: Difficulty,
  rng: ReturnType<typeof createRng>,
): number[][] {
  const [lo, hi] = RANGES[difficulty];
  let matrix = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => rng.int(lo, hi)),
  );
  let guard = 0;
  while (guard++ < 50) {
    const flat = matrix.flat();
    const unique = new Set(flat).size;
    const minUnique = Math.min(4, Math.ceil(flat.length / 2));
    if (unique >= minUnique) break;
    matrix = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => rng.int(lo, hi)),
    );
  }
  return matrix;
}

export function validateTransportationInstance(
  instance: TransportationInstance,
): string[] {
  const errors: string[] = [];
  const { costs, supply, demand } = instance;
  if (!costs.length || !costs[0].length) errors.push('La matriz está vacía.');
  if (costs.some((row) => row.length !== costs[0].length)) {
    errors.push('La matriz de costos no es rectangular.');
  }
  if (supply.length !== costs.length) errors.push('Faltan ofertas.');
  if (demand.length !== costs[0].length) errors.push('Faltan demandas.');
  if (supply.some((v) => !Number.isInteger(v) || v <= 0)) {
    errors.push('Toda oferta debe ser un entero positivo.');
  }
  if (demand.some((v) => !Number.isInteger(v) || v <= 0)) {
    errors.push('Toda demanda debe ser un entero positivo.');
  }
  if (costs.flat().some((v) => !Number.isInteger(v) || v <= 0)) {
    errors.push('Todo costo debe ser un entero positivo.');
  }
  if (sum(supply) !== sum(demand)) {
    errors.push('El problema no está balanceado.');
  }
  const uniqueCosts = new Set(costs.flat()).size;
  if (uniqueCosts < 2) errors.push('La matriz es trivial (todos los costos iguales).');
  return errors;
}

export function pickDegenerate(
  factory: (seed: number) => TransportationInstance,
  method: TransportationMethod,
  initialSeed: number,
  attempts = 120,
): TransportationInstance {
  const solver =
    method === 'northwest'
      ? solveNorthwest
      : method === 'leastCost'
        ? solveLeastCost
        : solveVogel;
  for (let i = 0; i < attempts; i++) {
    const candidate = factory(initialSeed + i * 7919);
    if (solver(candidate).degenerate) return candidate;
  }
  return factory(initialSeed);
}

export function generateTransportation(
  method: TransportationMethod,
  difficulty: Difficulty,
  rows: number,
  cols: number,
  seed = randomSeed(),
): TransportationInstance {
  const build = (currentSeed: number): TransportationInstance => {
    const rng = createRng(currentSeed);
    const costs = costsFor(rows, cols, difficulty, rng);
    // Keep supplies/demands varied; base total scales with problem size.
    const total = rng.int((rows + cols) * 7, (rows + cols) * 16);
    const supply = composition(total, rows, rng);
    const demand = composition(total, cols, rng);
    const instance: TransportationInstance = {
      id: uid('tr'),
      method,
      costs,
      supply,
      demand,
      seed: currentSeed,
      difficulty,
      createdAt: new Date().toISOString(),
    };
    const errors = validateTransportationInstance(instance);
    if (errors.length) {
      throw new Error(`Instancia inválida: ${errors.join(' ')}`);
    }
    return instance;
  };

  if (difficulty === 'hard') {
    // Difficulty requirement: hard instances should exercise degeneracy.
    return pickDegenerate(build, method, seed);
  }
  return build(seed);
}
