import type { AssignmentInstance } from '../../types/assignment';
import { matricesEqual } from '../../utils';
import {
  adjustedMatrix,
  adjustedMatrixWithLines,
  colReduced,
  coversAllZeros,
  enumerateOptimalAssignments,
  isValidAssignment,
  minimumLineCount,
  rowReduced,
  totalForAssignment,
  type Line,
} from './hungarian';

export interface HungarianValidation {
  ok: boolean;
  message: string;
  errorType?: 'arithmetic' | 'method' | 'invalid-assignment' | 'alternative';
  reference?: number[][];
}

export function validateTransform(
  instance: AssignmentInstance,
  userMatrix: number[][],
): HungarianValidation {
  const max = Math.max(...instance.values.flat());
  const expected = instance.values.map((row) => row.map((v) => max - v));
  if (matricesEqual(expected, userMatrix)) {
    return {
      ok: true,
      message: `Transformación correcta: se restó cada beneficio del máximo global ${max}.`,
    };
  }
  return {
    ok: false,
    message:
      'Transformación incorrecta. Para maximizar debes calcular (máximo global − beneficio) en cada celda.',
    errorType: 'method',
  };
}

export function validateRowReduction(
  instance: AssignmentInstance,
  startMatrix: number[][],
  userMatrix: number[][],
): HungarianValidation {
  const expected = rowReduced(startMatrix);
  if (matricesEqual(expected, userMatrix)) {
    return {
      ok: true,
      message: 'Reducción por filas correcta: cada fila tiene al menos un cero.',
    };
  }
  const bad = userMatrix.some((row, r) =>
    row.some((v, c) => v !== expected[r][c]),
  );
  return {
    ok: false,
    message: bad
      ? 'Hay errores aritméticos: a cada fila se le resta su propio mínimo.'
      : 'Matriz incompleta.',
    errorType: 'arithmetic',
    reference: expected,
  };
}

export function validateColReduction(
  startMatrix: number[][],
  userMatrix: number[][],
): HungarianValidation {
  const expected = colReduced(startMatrix);
  if (matricesEqual(expected, userMatrix)) {
    return {
      ok: true,
      message: 'Reducción por columnas correcta: cada columna tiene al menos un cero.',
    };
  }
  return {
    ok: false,
    message:
      'Reducción por columnas incorrecta. Resta a cada columna su mínimo actual.',
    errorType: 'arithmetic',
    reference: expected,
  };
}

export function validateCover(
  matrix: number[][],
  lines: Line[],
): HungarianValidation {
  if (!coversAllZeros(matrix, lines)) {
    return {
      ok: false,
      message: 'Quedan ceros sin cubrir. Revisa las líneas seleccionadas.',
      errorType: 'method',
    };
  }
  const min = minimumLineCount(matrix);
  if (lines.length !== min) {
    return {
      ok: false,
      message: `La cobertura cubre todos los ceros, pero no es mínima: usaste ${lines.length} líneas y el mínimo es ${min}.`,
      errorType: 'method',
    };
  }
  return {
    ok: true,
    message: `Cobertura mínima correcta: ${lines.length} línea(s).${
      lines.length < matrix.length
        ? ' Como es menor que n, hay que ajustar la matriz.'
        : ' Como es igual a n, ya existe una asignación completa.'
    }`,
  };
}

export function validateAdjustment(
  matrix: number[][],
  userMatrix: number[][],
  lines?: Line[],
): HungarianValidation {
  const expected = lines
    ? adjustedMatrixWithLines(matrix, lines)
    : adjustedMatrix(matrix);
  if (matricesEqual(expected, userMatrix)) {
    return {
      ok: true,
      message:
        'Ajuste correcto: se restó el mínimo no cubierto y se sumó en las intersecciones.',
    };
  }
  return {
    ok: false,
    message:
      'Ajuste incorrecto. Identifica el menor valor no cubierto, réstalo de las celdas no cubiertas y súmalo en las intersecciones de dos líneas.',
    errorType: 'arithmetic',
    reference: expected,
  };
}

export function validateAssignment(
  instance: AssignmentInstance,
  matrix: number[][],
  assignment: number[],
): HungarianValidation {
  if (!isValidAssignment(assignment)) {
    return {
      ok: false,
      message:
        'La asignación no es independiente: cada fila y cada columna deben tener exactamente una celda.',
      errorType: 'invalid-assignment',
    };
  }
  const nonZero = assignment.some((col, row) => matrix[row][col] !== 0);
  if (nonZero) {
    return {
      ok: false,
      message:
        'Solo puedes asignar sobre ceros de la matriz de trabajo en la etapa actual.',
      errorType: 'method',
    };
  }
  const total = totalForAssignment(instance.values, assignment);
  const maximize = instance.method === 'hungarianMax';
  const oracle = enumerateOptimalAssignments(instance.values, maximize);
  if (total !== oracle.value) {
    return {
      ok: false,
      message: `La asignación es factible pero no óptima: ${maximize ? 'beneficio' : 'costo'} ${total}, frente al valor óptimo ${oracle.value}. Debes seguir ajustando la matriz.`,
      errorType: 'method',
    };
  }
  return {
    ok: true,
    message: `Asignación óptima verificada. ${maximize ? 'Beneficio' : 'Costo'} total con la matriz original: ${total}.`,
  };
}

export function checkIndependence(assignment: number[]): boolean {
  return isValidAssignment(assignment);
}
