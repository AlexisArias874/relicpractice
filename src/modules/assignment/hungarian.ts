import type { AssignmentInstance, HungarianReference, HungarianStage } from '../../types/assignment';
import { cloneMatrix, sum } from '../../utils';

export interface Line {
  type: 'row' | 'col';
  index: number;
}

export function rowReduced(matrix: number[][]): number[][] {
  return matrix.map((row) => {
    const min = Math.min(...row);
    return row.map((v) => v - min);
  });
}

export function colReduced(matrix: number[][]): number[][] {
  const n = matrix[0].length;
  const mins = Array.from({ length: n }, (_, c) =>
    Math.min(...matrix.map((row) => row[c])),
  );
  return matrix.map((row) => row.map((v, c) => v - mins[c]));
}

/** Maximum bipartite matching on zero cells (Kuhn's augmenting paths). */
export function matchingOnZeros(matrix: number[][]): number[] {
  const n = matrix.length;
  const matchCol = Array<number>(n).fill(-1);
  const tryAssign = (row: number, seen: boolean[]): boolean => {
    for (let col = 0; col < n; col++) {
      if (matrix[row][col] !== 0 || seen[col]) continue;
      seen[col] = true;
      if (matchCol[col] === -1 || tryAssign(matchCol[col], seen)) {
        matchCol[col] = row;
        return true;
      }
    }
    return false;
  };
  for (let row = 0; row < n; row++) tryAssign(row, Array<boolean>(n).fill(false));
  const rowToCol = Array<number>(n).fill(-1);
  matchCol.forEach((row, col) => {
    if (row !== -1) rowToCol[row] = col;
  });
  return rowToCol;
}

export function maximumMatchingSize(matrix: number[][]): number {
  return matchingOnZeros(matrix).filter((v) => v >= 0).length;
}

/**
 * Minimum line cover of all zeros via König's theorem. The returned cover is a
 * valid minimum cover; the UI accepts any other cover of the same size.
 */
export function minimumLineCover(matrix: number[][]): Line[] {
  const n = matrix.length;
  const matchCol = Array<number>(n).fill(-1);
  const matchRow = Array<number>(n).fill(-1);
  const tryAssign = (row: number, seen: boolean[]): boolean => {
    for (let col = 0; col < n; col++) {
      if (matrix[row][col] !== 0 || seen[col]) continue;
      seen[col] = true;
      if (matchCol[col] === -1 || tryAssign(matchCol[col], seen)) {
        matchCol[col] = row;
        matchRow[row] = col;
        return true;
      }
    }
    return false;
  };
  for (let row = 0; row < n; row++) tryAssign(row, Array<boolean>(n).fill(false));

  // Alternating reachability from unmatched rows.
  const reachRow = Array<boolean>(n).fill(false);
  const reachCol = Array<boolean>(n).fill(false);
  const queue: number[] = [];
  for (let r = 0; r < n; r++) {
    if (matchRow[r] === -1) {
      reachRow[r] = true;
      queue.push(r);
    }
  }
  while (queue.length) {
    const r = queue.shift()!;
    for (let c = 0; c < n; c++) {
      if (matrix[r][c] !== 0 || reachCol[c]) continue;
      reachCol[c] = true;
      const matchedRow = matchCol[c];
      if (matchedRow !== -1 && !reachRow[matchedRow]) {
        reachRow[matchedRow] = true;
        queue.push(matchedRow);
      }
    }
  }
  const lines: Line[] = [];
  for (let r = 0; r < n; r++) if (!reachRow[r]) lines.push({ type: 'row', index: r });
  for (let c = 0; c < n; c++) if (reachCol[c]) lines.push({ type: 'col', index: c });
  return lines;
}

export function minimumLineCount(matrix: number[][]): number {
  return maximumMatchingSize(matrix);
}

export function coversAllZeros(matrix: number[][], lines: Line[]): boolean {
  const rowCovered = new Set(lines.filter((l) => l.type === 'row').map((l) => l.index));
  const colCovered = new Set(lines.filter((l) => l.type === 'col').map((l) => l.index));
  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < matrix.length; c++) {
      if (matrix[r][c] === 0 && !rowCovered.has(r) && !colCovered.has(c)) {
        return false;
      }
    }
  }
  return true;
}

export function adjustedMatrix(matrix: number[][]): number[][] {
  return adjustedMatrixWithLines(matrix, minimumLineCover(matrix));
}

/** Adjustment using the student's chosen minimum cover (valid alternatives differ). */
export function adjustedMatrixWithLines(matrix: number[][], lines: Line[]): number[][] {
  const rowCovered = new Set(lines.filter((l) => l.type === 'row').map((l) => l.index));
  const colCovered = new Set(lines.filter((l) => l.type === 'col').map((l) => l.index));
  let minUncovered = Infinity;
  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < matrix.length; c++) {
      if (!rowCovered.has(r) && !colCovered.has(c)) {
        minUncovered = Math.min(minUncovered, matrix[r][c]);
      }
    }
  }
  if (!Number.isFinite(minUncovered)) return cloneMatrix(matrix);
  return matrix.map((row, r) =>
    row.map((v, c) => {
      const covered = rowCovered.has(r) || colCovered.has(c);
      const double = rowCovered.has(r) && colCovered.has(c);
      if (!covered) return v - minUncovered;
      if (double) return v + minUncovered;
      return v;
    }),
  );
}

export function totalForAssignment(
  values: number[][],
  assignment: number[],
): number {
  return assignment.reduce((total, col, row) => total + values[row][col], 0);
}

export function isValidAssignment(assignment: number[]): boolean {
  const n = assignment.length;
  if (!n || assignment.some((c) => !Number.isInteger(c) || c < 0 || c >= n)) {
    return false;
  }
  return new Set(assignment).size === n;
}

function permutations(n: number): number[][] {
  const result: number[][] = [];
  const current: number[] = [];
  const used = Array<boolean>(n).fill(false);
  const walk = () => {
    if (current.length === n) {
      result.push([...current]);
      return;
    }
    for (let i = 0; i < n; i++) {
      if (used[i]) continue;
      used[i] = true;
      current.push(i);
      walk();
      current.pop();
      used[i] = false;
    }
  };
  walk();
  return result;
}

/** Independent exhaustive oracle for n <= 6 (720 permutations). */
export function enumerateOptimalAssignments(
  values: number[][],
  maximize: boolean,
): { value: number; assignments: number[][] } {
  const n = values.length;
  let best = maximize ? -Infinity : Infinity;
  const assignments: number[][] = [];
  for (const p of permutations(n)) {
    const value = totalForAssignment(values, p);
    const better = maximize ? value > best : value < best;
    if (better) {
      best = value;
      assignments.length = 0;
      assignments.push(p);
    } else if (value === best) {
      assignments.push(p);
    }
  }
  return { value: best, assignments };
}

export function optimalAssignmentValue(
  values: number[][],
  maximize: boolean,
): number {
  return enumerateOptimalAssignments(values, maximize).value;
}

export function buildHungarianReference(
  instance: AssignmentInstance,
): HungarianReference {
  const maximize = instance.method === 'hungarianMax';
  const stages: HungarianStage[] = [];
  const n = instance.values.length;
  let matrix = cloneMatrix(instance.values);

  if (maximize) {
    const maxValue = Math.max(...matrix.flat());
    matrix = matrix.map((row) => row.map((v) => maxValue - v));
    stages.push({
      kind: 'transform',
      matrix: cloneMatrix(matrix),
      note: `Transformación para maximizar: se resta cada beneficio del máximo global (${maxValue}).`,
    });
  }

  matrix = rowReduced(matrix);
  stages.push({
    kind: 'rowReduction',
    matrix: cloneMatrix(matrix),
    note: 'Reducción por filas: a cada fila se le resta su menor elemento.',
  });
  matrix = colReduced(matrix);
  stages.push({
    kind: 'colReduction',
    matrix: cloneMatrix(matrix),
    note: 'Reducción por columnas: a cada columna se le resta su menor elemento.',
  });

  let guard = 0;
  while (guard++ < 20) {
    const lines = minimumLineCover(matrix);
    stages.push({
      kind: 'cover',
      matrix: cloneMatrix(matrix),
      lines,
      note: `Cobertura mínima de ceros: ${lines.length} línea(s).`,
    });
    if (lines.length >= n) break;
    matrix = adjustedMatrix(matrix);
    stages.push({
      kind: 'adjust',
      matrix: cloneMatrix(matrix),
      note: 'Ajuste: se resta el menor valor no cubierto y se suma en las intersecciones doblemente cubiertas.',
    });
  }

  const assignment = matchingOnZeros(matrix);
  const total = totalForAssignment(instance.values, assignment);
  const oracle = enumerateOptimalAssignments(instance.values, maximize);
  stages.push({
    kind: 'assignment',
    matrix: cloneMatrix(matrix),
    assignment,
    note: `Asignación independiente sobre ceros. ${
      maximize ? 'Beneficio' : 'Costo'
    } total con la matriz original: ${total}.`,
  });

  return {
    transformed: maximize
      ? instance.values.map((row) =>
          row.map((v) => Math.max(...instance.values.flat()) - v),
        )
      : cloneMatrix(instance.values),
    assignment,
    optimalValue: oracle.value,
    total,
    stages,
    optimalVerified: total === oracle.value,
    alternativeOptima: oracle.assignments.length,
    summary: [
      ...stages.map(
        (stage, index) =>
          `Etapa ${index + 1} (${stage.note}): ${stage.matrix
            .map((row) => `[${row.join(', ')}]`)
            .join(' ')}`,
      ),
      `Asignación de referencia: ${assignment
        .map((col, row) => `O${row + 1}→D${col + 1}`)
        .join(', ')}.`,
      `${maximize ? 'Beneficio' : 'Costo'} total con la matriz original: ${total}.`,
      `Óptimo verificado por enumeración independiente: ${oracle.value}. Soluciones óptimas: ${oracle.assignments.length}.`,
    ],
  };
}

export function sumOf(values: number[]): number {
  return sum(values);
}
