import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Eye,
  Grid2X2,
  Lightbulb,
  Send,
  Sparkles,
  Target,
} from 'lucide-react';
import type { Exercise, StepResult } from '../../types';
import type { HungarianReference } from '../../types/assignment';
import {
  adjustedMatrixWithLines,
  minimumLineCover,
  minimumLineCount,
} from '../../modules/assignment/hungarian';
import { cloneMatrix } from '../../utils';
import {
  validateAdjustment,
  validateAssignment,
  validateColReduction,
  validateCover,
  validateRowReduction,
  validateTransform,
} from '../../modules/assignment/validator';
import { MatrixGrid, type CellTone } from '../grid/MatrixGrid';
import { Button } from '../common/Button';
import { Card, Feedback, SectionTitle } from '../common/Card';
import { Badge } from '../common/Badge';
import { ExerciseHeader } from './ExerciseHeader';
import { useElapsed } from '../../hooks/useElapsed';
import { assignmentDraftKey, clearDraft, readDraft, writeDraft } from '../../hooks/useDraft';
import { formatDuration } from '../../utils';
import type { Line } from '../../modules/assignment/hungarian';

type Stage =
  | 'transform'
  | 'rowReduction'
  | 'colReduction'
  | 'cover'
  | 'adjust'
  | 'assignment'
  | 'done';

interface FeedbackState {
  correct?: boolean;
  tone?: 'info' | 'warn';
  title: string;
  body: string;
}

interface HungarianDraft {
  stage: Stage;
  working: number[][];
  userMatrix: number[][];
  lines: Line[];
  activeCover: Line[];
  assignment: number[];
  tones: Record<string, CellTone>;
  feedback: FeedbackState | null;
  steps: StepResult[];
  log: Array<{ title: string; detail: string }>;
  hint: boolean;
}

interface Props {
  exercise: Exercise;
  startedAt: number;
  onFinish: (steps: StepResult[], totalValue: number, totalLabel: string) => void;
  onRestart: () => void;
}

const STAGE_LABEL: Record<Stage, string> = {
  transform: 'Transformación',
  rowReduction: 'Reducción por filas',
  colReduction: 'Reducción por columnas',
  cover: 'Cobertura de ceros',
  adjust: 'Ajuste de la matriz',
  assignment: 'Asignación final',
  done: 'Completado',
};

const STAGE_PROGRESS: Record<Stage, number> = {
  transform: 8,
  rowReduction: 22,
  colReduction: 38,
  cover: 55,
  adjust: 68,
  assignment: 88,
  done: 100,
};

export function HungarianWorkspace({ exercise, startedAt, onFinish, onRestart }: Props) {
  const instance = exercise.assignment!;
  const reference = exercise.reference as HungarianReference;
  const training = exercise.mode === 'training';
  const maximize = instance.method === 'hungarianMax';
  const n = instance.values.length;
  const seconds = useElapsed(startedAt);
  const draftKey = assignmentDraftKey(exercise.id);
  const initialDraft = useMemo(
    () => readDraft<HungarianDraft>(draftKey, 1),
    [draftKey],
  );
  const discardedRef = useRef(false);

  const [stage, setStage] = useState<Stage>(() =>
    initialDraft?.stage && initialDraft.stage !== 'done'
      ? initialDraft.stage
      : maximize
        ? 'transform'
        : 'rowReduction',
  );
  const [working, setWorking] = useState<number[][]>(
    () => initialDraft?.working ?? cloneMatrix(instance.values),
  );
  const [userMatrix, setUserMatrix] = useState<number[][]>(
    () => initialDraft?.userMatrix ?? cloneMatrix(instance.values),
  );
  const [lines, setLines] = useState<Line[]>(() => initialDraft?.lines ?? []);
  const [activeCover, setActiveCover] = useState<Line[]>(
    () => initialDraft?.activeCover ?? [],
  );
  const [assignment, setAssignment] = useState<number[]>(
    () => initialDraft?.assignment ?? Array(n).fill(-1),
  );
  const [tones, setTones] = useState<Record<string, CellTone>>(
    () => initialDraft?.tones ?? {},
  );
  const [feedback, setFeedback] = useState<FeedbackState | null>(
    () => initialDraft?.feedback ?? null,
  );
  const [steps, setSteps] = useState<StepResult[]>(() => initialDraft?.steps ?? []);
  const [log, setLog] = useState<Array<{ title: string; detail: string }>>(
    () => initialDraft?.log ?? [],
  );
  const [hint, setHint] = useState(() => initialDraft?.hint ?? false);

  useEffect(() => {
    if (discardedRef.current || stage === 'done') return;
    writeDraft<HungarianDraft>(draftKey, 1, {
      stage,
      working,
      userMatrix,
      lines,
      activeCover,
      assignment,
      tones,
      feedback,
      steps,
      log,
      hint,
    });
  }, [
    draftKey,
    stage,
    working,
    userMatrix,
    lines,
    activeCover,
    assignment,
    tones,
    feedback,
    steps,
    log,
    hint,
  ]);

  const zeroCount = useMemo(
    () => working.flat().filter((v) => v === 0).length,
    [working],
  );
  const minLines = useMemo(() => minimumLineCount(working), [working]);
  const lineCount = lines.length;

  const record = (step: StepResult) => setSteps((previous) => [...previous, step]);

  const addLog = (title: string, detail: string) =>
    setLog((previous) => [...previous, { title, detail }]);

  const resetEditing = (matrix: number[][]) => {
    setWorking(cloneMatrix(matrix));
    setUserMatrix(cloneMatrix(matrix));
    setLines([]);
    setActiveCover([]);
    setTones({});
    setAssignment(Array(n).fill(-1));
    setFeedback(null);
  };

  const finish = (finalSteps: StepResult[], value: number, label: string) => {
    discardedRef.current = true;
    clearDraft(draftKey);
    setStage('done');
    onFinish(finalSteps, value, label);
  };

  const badTones = (expected: number[][]) => {
    const marks: Record<string, CellTone> = {};
    expected.forEach((row, r) =>
      row.forEach((value, c) => {
        if (value !== userMatrix[r][c]) marks[`${r}-${c}`] = 'bad';
      }),
    );
    setTones(marks);
  };

  const advanceMatrixStage = (
    expected: number[][],
    next: Stage,
    note: string,
    weight: number,
    check: { ok: boolean; message: string; errorType?: string },
    label: string,
  ) => {
    record({
      label,
      detail: check.message,
      correct: check.ok,
      weight,
      errorType: check.ok ? undefined : (check.errorType as StepResult['errorType']),
      correctAnswer: check.ok ? undefined : check.message,
    });
    setLog((previous) => [...previous, { title: label, detail: note }]);
    resetEditing(expected);
    setStage(next);
    setFeedback(
      training
        ? {
            correct: true,
            title: `${label} correcta`,
            body: 'La matriz de trabajo se actualizó. Continúa con la siguiente etapa.',
          }
        : {
            tone: 'info',
            title: 'Etapa registrada',
            body: 'La corrección se mostrará al entregar el examen.',
          },
    );
  };

  const submitMatrixStage = () => {
    if (stage === 'transform') {
      const check = validateTransform(instance, userMatrix);
      if (training && !check.ok) {
        const expected = instance.values.map((row) => {
          const max = Math.max(...instance.values.flat());
          return row.map((v) => max - v);
        });
        badTones(expected);
        setFeedback({ correct: false, title: 'Transformación incorrecta', body: check.message });
        return;
      }
      const expected = instance.values.map((row) => {
        const max = Math.max(...instance.values.flat());
        return row.map((v) => max - v);
      });
      advanceMatrixStage(
        expected,
        'rowReduction',
        'Se transformó la matriz de beneficios restando el máximo global.',
        10,
        check,
        'Transformación',
      );
      return;
    }
    if (stage === 'rowReduction') {
      const check = validateRowReduction(instance, working, userMatrix);
      if (training && !check.ok) {
        if (check.reference) badTones(check.reference);
        setFeedback({ correct: false, title: 'Reducción por filas incorrecta', body: check.message });
        return;
      }
      const expected = check.reference ?? userMatrix;
      advanceMatrixStage(
        expected,
        'colReduction',
        'Cada fila se redujo restándole su mínimo.',
        15,
        check,
        'Reducción por filas',
      );
      return;
    }
    if (stage === 'colReduction') {
      const check = validateColReduction(working, userMatrix);
      if (training && !check.ok) {
        if (check.reference) badTones(check.reference);
        setFeedback({ correct: false, title: 'Reducción por columnas incorrecta', body: check.message });
        return;
      }
      const expected = check.reference ?? userMatrix;
      advanceMatrixStage(
        expected,
        'cover',
        'Cada columna se redujo restándole su mínimo.',
        15,
        check,
        'Reducción por columnas',
      );
      return;
    }
    if (stage === 'adjust') {
      const expected = adjustedMatrixWithLines(working, activeCover);
      const check = validateAdjustment(working, userMatrix, activeCover);
      if (training && !check.ok) {
        badTones(expected);
        setFeedback({ correct: false, title: 'Ajuste incorrecto', body: check.message });
        return;
      }
      record({
        label: `Ajuste con ${activeCover.length} línea(s)`,
        detail: check.message,
        correct: check.ok,
        weight: 10,
        errorType: check.ok ? undefined : (check.errorType as StepResult['errorType']),
        correctAnswer: check.ok ? undefined : check.message,
      });
      addLog(
        `Ajuste con ${activeCover.length} línea(s)`,
        'Se restó el mínimo no cubierto y se sumó en las intersecciones doblemente cubiertas.',
      );
      setWorking(cloneMatrix(expected));
      setUserMatrix(cloneMatrix(expected));
      setLines([]);
      setActiveCover([]);
      setTones({});
      setStage('cover');
      setFeedback(
        training
          ? {
              correct: true,
              title: 'Ajuste correcto',
              body: 'Vuelve a cubrir los ceros de la nueva matriz.',
            }
          : { tone: 'info', title: 'Etapa registrada', body: 'Continúa con la cobertura de ceros.' },
      );
      return;
    }
  };

  const submitCover = () => {
    if (!lines.length) {
      setFeedback({ tone: 'warn', title: 'Sin líneas', body: 'Selecciona al menos una fila o columna.' });
      return;
    }
    const check = validateCover(working, lines);
    if (training && !check.ok) {
      setFeedback({ correct: false, title: 'Cobertura incorrecta', body: check.message });
      return;
    }
    record({
      label: `Cobertura con ${lines.length} línea(s)`,
      detail: check.message,
      correct: check.ok,
      weight: 10,
      errorType: check.ok ? undefined : (check.errorType as StepResult['errorType']),
    });
    const effectiveLines = check.ok ? lines : minimumLineCover(working);
    setActiveCover(effectiveLines);
    addLog(
      `Cobertura con ${effectiveLines.length} línea(s)`,
      check.ok
        ? 'Cobertura mínima válida de todos los ceros.'
        : 'Se usó la cobertura mínima de referencia para continuar.',
    );
    if (minimumLineCount(working) >= n) {
      setStage('assignment');
      setLines([]);
      setTones({});
      setAssignment(Array(n).fill(-1));
      setFeedback(
        training
          ? {
              correct: true,
              title: 'Cobertura suficiente',
              body: `Con ${effectiveLines.length} líneas (n = ${n}) ya existe una asignación completa. Selecciona ceros independientes.`,
            }
          : {
              tone: 'info',
              title: 'Etapa registrada',
              body: 'Selecciona ahora la asignación final sobre ceros.',
            },
      );
    } else {
      setStage('adjust');
      setUserMatrix(cloneMatrix(working));
      setTones({});
      setFeedback(
        training
          ? {
              correct: true,
              title: 'Cobertura insuficiente',
              body: `Usaste el mínimo de ${effectiveLines.length} línea(s), pero necesitas ${n}. Ajusta la matriz.`,
            }
          : {
              tone: 'info',
              title: 'Etapa registrada',
              body: 'Ajusta la matriz para continuar.',
            },
      );
    }
  };

  const toggleLine = (line: Line) => {
    setLines((previous) => {
      const exists = previous.some((l) => l.type === line.type && l.index === line.index);
      return exists
        ? previous.filter((l) => !(l.type === line.type && l.index === line.index))
        : [...previous, line];
    });
    setFeedback(null);
  };

  const toggleAssignment = (row: number, col: number) => {
    setAssignment((previous) => {
      const next = [...previous];
      if (next[row] === col) {
        next[row] = -1;
        return next;
      }
      for (let r = 0; r < next.length; r++) {
        if (next[r] === col) next[r] = -1;
      }
      next[row] = col;
      return next;
    });
    setFeedback(null);
  };

  const submitAssignment = () => {
    const incomplete = assignment.some((v) => v < 0);
    const check = incomplete
      ? {
          ok: false,
          message: 'Debes seleccionar una celda para cada fila y columna.',
          errorType: 'invalid-assignment' as const,
        }
      : validateAssignment(instance, working, assignment);
    const value = incomplete
      ? reference.total
      : assignment.reduce((total, col, row) => total + instance.values[row][col], 0);
    const step: StepResult = {
      label: 'Asignación final',
      detail: check.message,
      correct: check.ok,
      weight: 25,
      errorType: check.ok ? undefined : (check.errorType as StepResult['errorType']),
      correctAnswer: check.ok ? undefined : `${value}`,
    };
    if (training && !check.ok) {
      setFeedback({
        correct: false,
        title: incomplete ? 'Asignación incompleta' : 'Asignación no óptima',
        body: check.message,
      });
      return;
    }
    record(step);
    finish(
      [...steps, step],
      value,
      maximize ? 'Beneficio total (matriz original)' : 'Costo total (matriz original)',
    );
  };

  const handleExamFinish = () => {
    const extra: StepResult[] = [
      {
        label: 'Examen entregado antes de completar la asignación',
        detail:
          stage === 'assignment'
            ? 'La asignación final no se confirmó.'
            : `El procedimiento se interrumpió en la etapa: ${STAGE_LABEL[stage]}.`,
        correct: false,
        weight: 20,
        errorType: 'incomplete',
      },
    ];
    finish([...steps, ...extra], reference.total, maximize ? 'Beneficio óptimo de referencia' : 'Costo óptimo de referencia');
  };

  const handleReveal = () => {
    if (!window.confirm('Se mostrará la solución de referencia y finalizará la práctica. ¿Continuar?')) return;
    const step: StepResult = {
      label: 'Solución de referencia solicitada',
      detail: 'La práctica se cerró mostrando la solución explicada.',
      correct: false,
      weight: 10,
      errorType: 'incomplete',
    };
    finish([...steps, step], reference.total, maximize ? 'Beneficio de la solución de referencia' : 'Costo de la solución de referencia');
  };

  const restart = () => {
    if (!window.confirm('Se generará un ejercicio nuevo con la misma configuración y se perderán los avances. ¿Continuar?')) return;
    discardedRef.current = true;
    clearDraft(draftKey);
    onRestart();
  };

  const matrixEditable = ['transform', 'rowReduction', 'colReduction', 'adjust'].includes(stage);
  const hintText =
    stage === 'transform'
      ? 'Resta cada beneficio del máximo global de la matriz de beneficios.'
      : stage === 'rowReduction'
        ? 'En cada fila, identifica el menor valor y réstalo de todos sus elementos.'
        : stage === 'colReduction'
          ? 'Ahora trabaja por columnas: resta el mínimo de cada columna a todos sus elementos.'
          : stage === 'cover'
            ? 'Selecciona filas y columnas hasta cubrir todos los ceros. El número de líneas debe ser el mínimo posible.'
            : stage === 'adjust'
              ? 'Encuentra el menor valor no cubierto. Réstalo de las celdas no cubiertas y súmalo donde se cruzan dos líneas.'
              : 'Elige ceros que no compartan fila ni columna. Comprueba que el valor con la matriz original sea óptimo.';

  return (
    <div className="space-y-5 animate-fade-up">
      <ExerciseHeader
        exercise={exercise}
        seconds={seconds}
        onRestart={restart}
        onFinish={handleExamFinish}
        onReveal={handleReveal}
        canFinish={!training}
        progress={STAGE_PROGRESS[stage]}
        stepLabel={STAGE_LABEL[stage]}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <SectionTitle
            eyebrow={`Etapa ${STAGE_LABEL[stage]}`}
            title={
              stage === 'cover'
                ? 'Cubre todos los ceros con el mínimo de líneas'
                : stage === 'assignment'
                  ? 'Selecciona la asignación independiente'
                  : stage === 'adjust'
                    ? 'Ajusta la matriz de trabajo'
                    : 'Completa la matriz de trabajo'
            }
            description={
              stage === 'cover'
                ? 'Haz clic en los encabezados de filas y columnas para activar o desactivar líneas. Se acepta cualquier cobertura mínima válida.'
                : stage === 'assignment'
                  ? 'Haz clic en celdas con valor cero. Solo se permite una celda por fila y por columna; el costo se calcula con la matriz original.'
                  : 'Edita las celdas de la matriz de trabajo. El valor original se muestra en gris debajo de cada celda.'
            }
            action={
              <Badge tone={stage === 'cover' ? 'azure' : 'aqua'}>
                <Grid2X2 size={10} />
                {n}×{n}
              </Badge>
            }
          />

          <div className="mt-5">
            <MatrixGrid
              matrix={matrixEditable ? userMatrix : working}
              original={instance.values}
              editable={matrixEditable}
              disabled={stage === 'done'}
              onChange={(row, col, value) => {
                const numeric = Number(value.replace(/\D/g, ''));
                setUserMatrix((previous) => {
                  const next = previous.map((r) => [...r]);
                  next[row][col] = Number.isFinite(numeric) ? numeric : 0;
                  return next;
                });
                setTones((previous) => {
                  const next = { ...previous };
                  delete next[`${row}-${col}`];
                  return next;
                });
              }}
              lines={lines}
              onToggleLine={toggleLine}
              lineSelectionEnabled={stage === 'cover'}
              assignment={assignment}
              onToggleAssignment={toggleAssignment}
              assignmentEnabled={stage === 'assignment'}
              tones={tones}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
            {stage === 'cover' && (
              <>
                <span className="rounded-md border border-line/60 bg-panel2 px-2 py-1">
                  Líneas: <span className="font-mono text-slate-200">{lineCount}</span>
                </span>
                <span className="rounded-md border border-line/60 bg-panel2 px-2 py-1">
                  Ceros: <span className="font-mono text-slate-200">{zeroCount}</span>
                </span>
                <span>El mínimo no se muestra hasta comprobar.</span>
              </>
            )}
            {stage === 'assignment' && (
              <>
                <span className="rounded-md border border-line/60 bg-panel2 px-2 py-1">
                  Asignadas: <span className="font-mono text-slate-200">{assignment.filter((v) => v >= 0).length}/{n}</span>
                </span>
                <span>Los ceros son la única base válida para asignar.</span>
              </>
            )}
            <span className="ml-auto font-mono">
              máx. global: {Math.max(...instance.values.flat())}
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {matrixEditable && (
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line/60 bg-panel2/40 p-3.5">
                <p className="text-sm text-slate-300">
                  {stage === 'transform'
                    ? 'Introduce la matriz transformada: máximo global − beneficio.'
                    : stage === 'adjust'
                      ? 'Aplica el ajuste sobre la matriz actual y comprueba la etapa.'
                      : 'Introduce la matriz reducida y comprueba la etapa.'}
                </p>
                <Button className="ml-auto" variant="primary" onClick={submitMatrixStage}>
                  <Send size={15} />
                  Comprobar etapa
                </Button>
              </div>
            )}

            {stage === 'cover' && (
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line/60 bg-panel2/40 p-3.5">
                <p className="text-sm text-slate-300">
                  {lines.length
                    ? `${lines.length} línea(s) seleccionada(s).`
                    : 'Selecciona filas y columnas en los encabezados.'}
                </p>
                <Button
                  className="ml-auto"
                  variant="primary"
                  onClick={submitCover}
                  disabled={!lines.length}
                >
                  <CheckCircle2 size={15} />
                  Comprobar cobertura
                </Button>
              </div>
            )}

            {stage === 'assignment' && (
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line/60 bg-panel2/40 p-3.5">
                <p className="text-sm text-slate-300">
                  {assignment.filter((v) => v >= 0).length === n
                    ? 'Asignación completa. El valor se calcula con la matriz original.'
                    : 'Selecciona un cero en cada fila y columna.'}
                </p>
                <Button
                  className="ml-auto"
                  variant="primary"
                  onClick={submitAssignment}
                  disabled={assignment.every((v) => v < 0)}
                >
                  <Target size={15} />
                  Comprobar asignación
                </Button>
              </div>
            )}

            {feedback && (
              <Feedback correct={feedback.correct} tone={feedback.tone} title={feedback.title}>
                {feedback.body}
              </Feedback>
            )}

            {!training && (
              <Feedback tone="info" title="Modo examen">
                Sin pistas ni correcciones hasta entregar. Puedes entregar en cualquier momento desde la cabecera.
              </Feedback>
            )}

            <div className="flex flex-wrap items-center gap-2">
              {training && (
                <Button size="sm" variant="ghost" onClick={() => setHint((value) => !value)}>
                  <Lightbulb size={14} />
                  {hint ? 'Ocultar pista' : 'Mostrar pista'}
                </Button>
              )}
              <span className="ml-auto text-[11px] text-slate-500">
                {formatDuration(seconds)} · etapa {STAGE_LABEL[stage]}
              </span>
            </div>
            {hint && training && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-3 text-[13px] text-amber-200/90">
                <Sparkles className="mr-1.5 inline h-3.5 w-3.5" />
                {hintText}
              </div>
            )}
          </div>
        </Card>

        <div className="space-y-5">
          <Card>
            <SectionTitle eyebrow="Matriz original" title={maximize ? 'Beneficios' : 'Costos'} />
            <OriginalMatrix values={instance.values} />
            <div className="mt-4 rounded-lg border border-line/60 bg-ink/40 p-3 text-[11px] leading-relaxed text-slate-400">
              {maximize
                ? 'La transformación válida es (máximo global − beneficio). El beneficio final se calcula exclusivamente con esta matriz original.'
                : 'La reducción y los ajustes se hacen en la matriz de trabajo. El costo final se calcula exclusivamente con esta matriz original.'}
            </div>
          </Card>

          <Card>
            <SectionTitle eyebrow="Bitácora" title="Operaciones realizadas" />
            {log.length === 0 ? (
              <p className="mt-4 rounded-lg border border-dashed border-line/70 p-3 text-xs text-slate-500">
                Las etapas confirmadas aparecerán aquí.
              </p>
            ) : (
              <ol className="mt-4 space-y-2">
                {log.map((item, index) => (
                  <li key={index} className="rounded-lg border border-line/50 bg-panel2/30 px-3 py-2">
                    <p className="text-[12px] font-medium text-slate-200">{item.title}</p>
                    <p className="text-[10px] leading-relaxed text-slate-500">{item.detail}</p>
                  </li>
                ))}
              </ol>
            )}
          </Card>

          <Card>
            <SectionTitle eyebrow="Regla de optimalidad" title="Verificación independiente" />
            <p className="mt-3 text-[12px] leading-relaxed text-slate-400">
              La asignación no se acepta solo por ser factible: se compara con el óptimo calculado por
              enumeración exhaustiva (n ≤ 6). Cualquier asignación que alcance ese valor es válida, aunque
              use otro camino o desempate.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function OriginalMatrix({ values }: { values: number[][] }) {
  return (
    <div className="scroll-thin mt-3 overflow-x-auto">
      <table className="w-full border-separate border-spacing-0 text-center font-mono text-xs">
        <tbody>
          {values.map((row, r) => (
            <tr key={r}>
              <td className="px-2 py-1 text-[10px] text-slate-500">O{r + 1}</td>
              {row.map((value, c) => (
                <td key={c} className="border border-line/50 bg-ink/30 px-2 py-1.5 text-slate-300">
                  {value}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
