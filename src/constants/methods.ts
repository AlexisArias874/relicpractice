import type {
  AssignmentMethod,
  Difficulty,
  ExerciseMethod,
  PracticeMode,
} from '../types';

export const METHOD_LABELS: Record<ExerciseMethod, string> = {
  northwest: 'Esquina noroeste',
  leastCost: 'Costo mínimo',
  vogel: 'Aproximación de Vogel',
  hungarianMin: 'Húngaro · minimización',
  hungarianMax: 'Húngaro · maximización',
};

export const METHOD_SHORT: Record<ExerciseMethod, string> = {
  northwest: 'NOROESTE',
  leastCost: 'COSTO MÍNIMO',
  vogel: 'VOGEL',
  hungarianMin: 'HÚNGARO MIN',
  hungarianMax: 'HÚNGARO MAX',
};

export const METHOD_DESCRIPTIONS: Record<ExerciseMethod, string> = {
  northwest: 'Construye una solución inicial factible recorriendo la matriz desde la esquina superior izquierda.',
  leastCost: 'Asigna primero a las celdas más económicas, saturando oferta y demanda.',
  vogel: 'Usa penalizaciones para decidir qué línea atender primero y obtener una mejor solución inicial.',
  hungarianMin: 'Reduce la matriz, cubre ceros y ajusta hasta obtener una asignación de costo mínimo.',
  hungarianMax: 'Transforma beneficios en costos y aplica el procedimiento húngaro completo.',
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Fácil',
  intermediate: 'Intermedio',
  hard: 'Difícil',
};

export const MODE_LABELS: Record<PracticeMode, string> = {
  training: 'Entrenamiento',
  exam: 'Examen',
};

export const DIFFICULTY_DESCRIPTIONS: Record<Difficulty, string> = {
  easy: 'Matriz pequeña, valores holgados y pocos empates.',
  intermediate: 'Más tamaño, empates y decisiones menos evidentes.',
  hard: 'Matriz mayor, muchos empates y casos degenerados u óptimos alternativos.',
};

export const METHOD_CATEGORY: Record<ExerciseMethod, 'transportation' | 'assignment'> = {
  northwest: 'transportation',
  leastCost: 'transportation',
  vogel: 'transportation',
  hungarianMin: 'assignment',
  hungarianMax: 'assignment',
};

export const ASSIGNMENT_METHODS: AssignmentMethod[] = ['hungarianMin', 'hungarianMax'];

export const TRANSPORT_METHODS = ['northwest', 'leastCost', 'vogel'] as const;
