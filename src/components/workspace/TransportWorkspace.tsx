import { useEffect, useMemo, useRef, useState } from 'react';
import { Lightbulb, Send, Sparkles, Target } from 'lucide-react';
import type { Exercise, StepResult } from '../../types';
import type {
  Cell,
  TransportReference,
  TransportState,
} from '../../types';
import {
  applyAllocation,
  computingPenalties,
  createTransportState,
  isComplete,
  transportCost,
} from '../../modules/transportation/common';
import {
  northwestExpected,
  validateNorthwest,
} from '../../modules/transportation/northwest';
import { validateLeastCost } from '../../modules/transportation/leastCost';
import {
  validateVogelAmount,
  validateVogelCell,
  validateVogelLine,
  validateVogelPenalties,
  type Line,
} from '../../modules/transportation/vogel';
import { TransportGrid } from '../grid/TransportGrid';
import { Button } from '../common/Button';
import { Card, Feedback, ProgressBar, SectionTitle } from '../common/Card';
import { ExerciseHeader } from './ExerciseHeader';
import { useElapsed } from '../../hooks/useElapsed';
import { clearDraft, readDraft, transportDraftKey, writeDraft } from '../../hooks/useDraft';
import { formatDuration } from '../../utils';

type Phase = 'penalties' | 'line' | 'cell' | 'amount' | 'allocate' | 'final' | 'done';

interface FeedbackState {
  correct?: boolean;
  tone?: 'info' | 'warn';
  title: string;
  body: string;
}

interface TransportDraft {
  state: TransportState;
  phase: Phase;
  pending: { cell: Cell; amount: string } | null;
  penaltyRows: string[];
  penaltyCols: string[];
  selectedLine: Line | null;
  feedback: FeedbackState | null;
  badCell: Cell | null;
  lastCell: Cell | null;
  steps: StepResult[];
  hint: boolean;
  totalInput: string;
}

interface Props {
  exercise: Exercise;
  startedAt: number;
  onFinish: (steps: StepResult[], totalValue: number, totalLabel: string) => void;
  onRestart: () => void;
}

export function TransportWorkspace({ exercise, startedAt, onFinish, onRestart }: Props) {
  const instance = exercise.transportation!;
  const reference = exercise.reference as TransportReference;
  const training = exercise.mode === 'training';
  const seconds = useElapsed(startedAt);
  const draftKey = transportDraftKey(exercise.id);
  const initialDraft = useMemo(
    () => readDraft<TransportDraft>(draftKey, 1),
    [draftKey],
  );
  const discardedRef = useRef(false);
  const [state, setState] = useState<TransportState>(
    () => initialDraft?.state ?? createTransportState(instance),
  );
  const [phase, setPhase] = useState<Phase>(
    () =>
      initialDraft?.phase && initialDraft.phase !== 'done'
        ? initialDraft.phase
        : instance.method === 'vogel'
          ? 'penalties'
          : 'allocate',
  );
  const [pending, setPending] = useState<{ cell: Cell; amount: string } | null>(
    () => initialDraft?.pending ?? null,
  );
  const [penaltyRows, setPenaltyRows] = useState<string[]>(
    () => initialDraft?.penaltyRows ?? instance.supply.map(() => ''),
  );
  const [penaltyCols, setPenaltyCols] = useState<string[]>(
    () => initialDraft?.penaltyCols ?? instance.demand.map(() => ''),
  );
  const [selectedLine, setSelectedLine] = useState<Line | null>(
    () => initialDraft?.selectedLine ?? null,
  );
  const [feedback, setFeedback] = useState<FeedbackState | null>(
    () => initialDraft?.feedback ?? null,
  );
  const [badCell, setBadCell] = useState<Cell | null>(
    () => initialDraft?.badCell ?? null,
  );
  const [lastCell, setLastCell] = useState<Cell | null>(
    () => initialDraft?.lastCell ?? null,
  );
  const [steps, setSteps] = useState<StepResult[]>(() => initialDraft?.steps ?? []);
  const [hint, setHint] = useState(() => initialDraft?.hint ?? false);
  const [totalInput, setTotalInput] = useState(() => initialDraft?.totalInput ?? '');

  useEffect(() => {
    if (discardedRef.current || phase === 'done') return;
    writeDraft<TransportDraft>(draftKey, 1, {
      state,
      phase,
      pending,
      penaltyRows,
      penaltyCols,
      selectedLine,
      feedback,
      badCell,
      lastCell,
      steps,
      hint,
      totalInput,
    });
  }, [
    draftKey,
    state,
    phase,
    pending,
    penaltyRows,
    penaltyCols,
    selectedLine,
    feedback,
    badCell,
    lastCell,
    steps,
    hint,
    totalInput,
  ]);

  const totalAssigned = useMemo(
    () => state.allocations.reduce((total, a) => total + a.amount, 0),
    [state.allocations],
  );
  const totalQuantity = useMemo(
    () => instance.supply.reduce((a, b) => a + b, 0),
    [instance.supply],
  );
  const progress = totalQuantity ? (totalAssigned / totalQuantity) * 100 : 0;
  const complete = isComplete(instance, state);
  const totalCost = transportCost(instance.costs, state.allocations);
  const computedPenalties = useMemo(
    () => computingPenalties(instance, state),
    [instance, state],
  );

  const stepLabel =
    phase === 'final'
      ? 'Cierre · costo total'
      : instance.method === 'vogel'
        ? phase === 'penalties'
          ? `Iteración ${state.iteration + 1} · penalizaciones`
          : phase === 'line'
            ? `Iteración ${state.iteration + 1} · línea`
            : phase === 'cell'
              ? `Iteración ${state.iteration + 1} · celda`
              : phase === 'amount'
                ? `Iteración ${state.iteration + 1} · cantidad`
                : 'Iteración'
        : `Asignación ${state.iteration + 1}`;

  const record = (step: StepResult) => setSteps((previous) => [...previous, step]);

  const finish = (finalSteps: StepResult[], value: number, label: string) => {
    discardedRef.current = true;
    clearDraft(draftKey);
    setPhase('done');
    onFinish(finalSteps, value, label);
  };

  const advanceAfterAllocation = (nextState: TransportState) => {
    setState(nextState);
    setPending(null);
    setBadCell(null);
    setSelectedLine(null);
    setPenaltyRows(instance.supply.map(() => ''));
    setPenaltyCols(instance.demand.map(() => ''));
    setLastCell(null);
    if (isComplete(instance, nextState)) {
      setPhase('final');
      setFeedback(
        training
          ? {
              correct: true,
              title: 'Asignaciones completas',
              body: 'Todas las ofertas y demandas están cubiertas. Introduce el costo total de transporte para cerrar.',
            }
          : {
              tone: 'info',
              title: 'Asignaciones completas',
              body: 'Introduce el costo total. La validación del procedimiento se mostrará al entregar.',
            },
      );
    } else {
      setPhase(instance.method === 'vogel' ? 'penalties' : 'allocate');
      setFeedback(
        training
          ? {
              correct: true,
              title: 'Paso correcto',
              body:
                instance.method === 'vogel'
                  ? 'Vuelve a calcular las penalizaciones con los saldos actualizados.'
                  : 'Continúa con la siguiente asignación disponible.',
            }
          : {
              tone: 'info',
              title: 'Paso registrado',
              body: 'Puedes continuar. La corrección se mostrará al finalizar el examen.',
            },
      );
    }
  };

  const handleSelectCell = (cell: Cell) => {
    if (phase !== 'allocate' && phase !== 'cell' && phase !== 'amount') return;
    setPending({ cell, amount: '' });
    setBadCell(null);
  };

  const handleAmountChange = (amount: string) => {
    if (!pending) return;
    if (!/^\d*$/.test(amount)) return;
    const max = Math.min(
      state.supply[pending.cell.row],
      state.demand[pending.cell.col],
    );
    const numeric = Number(amount);
    const safe = amount === '' ? '' : String(Math.min(numeric, max));
    setPending({ ...pending, amount: safe });
    setBadCell(null);
  };

  const applyAndRecord = (
    cell: Cell,
    amount: number,
    check: { correct: boolean; message: string; errorType?: string },
    label: string,
  ) => {
    record({
      label,
      detail: check.message,
      correct: check.correct,
      weight: 10,
      errorType: check.correct ? undefined : (check.errorType as StepResult['errorType']),
      correctAnswer: check.correct ? undefined : check.message,
    });
    const nextState = applyAllocation(state, cell, amount);
    setLastCell(cell);
    advanceAfterAllocation(nextState);
  };

  const submitAllocation = () => {
    if (!pending) {
      setFeedback({ tone: 'warn', title: 'Selecciona una celda', body: 'Haz clic en una celda disponible antes de comprobar.' });
      return;
    }
    const amount = Number(pending.amount);
    if (!pending.amount || !Number.isInteger(amount) || amount <= 0) {
      setFeedback({ tone: 'warn', title: 'Cantidad no válida', body: 'Introduce un entero positivo.' });
      setBadCell(pending.cell);
      return;
    }
    if (state.supply[pending.cell.row] <= 0 || state.demand[pending.cell.col] <= 0) {
      setFeedback({
        tone: 'warn',
        title: 'Celda bloqueada',
        body: 'La fila o la columna ya está satisfecha.',
      });
      setBadCell(pending.cell);
      return;
    }
    const max = Math.min(state.supply[pending.cell.row], state.demand[pending.cell.col]);
    if (amount > max) {
      setFeedback({
        tone: 'warn',
        title: 'Cantidad fuera de rango',
        body: `No puedes asignar más de ${max} con los saldos actuales.`,
      });
      setBadCell(pending.cell);
      return;
    }

    const check =
      instance.method === 'northwest'
        ? validateNorthwest(instance, state, pending.cell, amount)
        : instance.method === 'leastCost'
          ? validateLeastCost(instance, state, pending.cell, amount)
          : {
              correct: false,
              message: 'Fase de asignación no válida para Vogel.',
            };

    if (training) {
      if (!check.correct) {
        setFeedback({
          correct: false,
          title: check.errorType === 'method' ? 'Decisión metodológica incorrecta' : 'Error en el paso',
          body: check.message,
        });
        setBadCell(pending.cell);
        return;
      }
      applyAndRecord(
        pending.cell,
        amount,
        check,
        `Asignación O${pending.cell.row + 1}–D${pending.cell.col + 1}`,
      );
    } else {
      applyAndRecord(
        pending.cell,
        amount,
        check,
        `Asignación O${pending.cell.row + 1}–D${pending.cell.col + 1}`,
      );
      setFeedback({
        tone: 'info',
        title: 'Paso registrado',
        body: 'La corrección de este paso se mostrará al entregar el examen.',
      });
    }
  };

  const submitPenalties = () => {
    const numeric = {
      rows: instance.supply.map((_, r) =>
        state.supply[r] > 0 && penaltyRows[r] !== '' ? Number(penaltyRows[r]) : null,
      ),
      cols: instance.demand.map((_, c) =>
        state.demand[c] > 0 && penaltyCols[c] !== '' ? Number(penaltyCols[c]) : null,
      ),
    };
    const missing =
      numeric.rows.some(
        (v, r) => state.supply[r] > 0 && (v === null || !Number.isFinite(v)),
      ) ||
      numeric.cols.some(
        (v, c) => state.demand[c] > 0 && (v === null || !Number.isFinite(v)),
      );
    if (missing) {
      setFeedback({
        tone: 'warn',
        title: 'Penalizaciones incompletas',
        body: 'Completa un valor para cada fila y columna activa. Las líneas satisfechas se muestran con —.',
      });
      return;
    }
    const result = validateVogelPenalties(instance, state, numeric);
    if (training && !result.correct) {
      setFeedback({
        correct: false,
        title: 'Penalizaciones incorrectas',
        body: 'Recuerda: diferencia entre los dos menores costos elegibles. Si solo hay un costo elegible, la penalización es ese costo.',
      });
      return;
    }
    record({
      label: `Penalizaciones · iteración ${state.iteration + 1}`,
      detail: result.correct
        ? 'Penalizaciones correctas.'
        : result.mismatches
            .map(
              (m) =>
                `${m.type === 'row' ? 'O' : 'D'}${m.index + 1}: esperado ${
                  m.expected ?? '—'
                }, introducido ${m.given ?? '—'}`,
            )
            .join('; '),
      correct: result.correct,
      weight: 4,
      errorType: result.correct ? undefined : 'arithmetic',
    });
    setPhase('line');
    setFeedback(
      training
        ? {
            correct: true,
            title: 'Penalizaciones correctas',
            body: 'Selecciona ahora la fila o columna con la mayor penalización.',
          }
        : {
            tone: 'info',
            title: 'Paso registrado',
            body: 'Selecciona la fila o columna con mayor penalización.',
          },
    );
  };

  const submitLine = () => {
    if (!selectedLine) {
      setFeedback({ tone: 'warn', title: 'Selecciona una línea', body: 'Haz clic en el encabezado de una fila o columna activa.' });
      return;
    }
    const result = validateVogelLine(instance, state, selectedLine);
    if (training && !result.correct) {
      setFeedback({ correct: false, title: 'Línea incorrecta', body: result.message });
      return;
    }
    record({
      label: `Línea · iteración ${state.iteration + 1}`,
      detail: result.message,
      correct: result.correct,
      weight: 6,
      errorType: result.correct ? undefined : 'method',
    });
    setPhase('cell');
    setFeedback({
      correct: training ? true : undefined,
      tone: training ? undefined : 'info',
      title: training ? 'Línea correcta' : 'Paso registrado',
      body: 'Selecciona la celda de menor costo disponible dentro de la línea.',
    });
  };

  const submitCell = () => {
    if (!selectedLine || !pending) {
      setFeedback({ tone: 'warn', title: 'Selecciona una celda', body: 'Haz clic en una celda disponible de la línea elegida.' });
      return;
    }
    const result = validateVogelCell(instance, state, selectedLine, pending.cell);
    if (training && !result.correct) {
      setFeedback({ correct: false, title: 'Celda incorrecta', body: result.message });
      setBadCell(pending.cell);
      return;
    }
    record({
      label: `Celda · iteración ${state.iteration + 1}`,
      detail: result.message,
      correct: result.correct,
      weight: 6,
      errorType: result.correct ? undefined : (result.errorType ?? 'method'),
    });
    setPhase('amount');
    setFeedback({
      tone: undefined,
      correct: training ? true : undefined,
      title: training ? 'Celda correcta' : 'Paso registrado',
      body: 'Introduce la cantidad máxima posible y confirma la asignación.',
    });
  };

  const submitVogelAmount = () => {
    if (!pending) return;
    const amount = Number(pending.amount);
    if (!pending.amount || !Number.isInteger(amount) || amount <= 0) {
      setFeedback({ tone: 'warn', title: 'Cantidad no válida', body: 'Introduce un entero positivo.' });
      return;
    }
    const max = Math.min(state.supply[pending.cell.row], state.demand[pending.cell.col]);
    if (amount > max) {
      setFeedback({ tone: 'warn', title: 'Cantidad fuera de rango', body: `Máximo posible: ${max}.` });
      return;
    }
    const result = validateVogelAmount(state, pending.cell, amount);
    if (training && !result.correct) {
      setFeedback({ correct: false, title: 'Cantidad incorrecta', body: result.message });
      setBadCell(pending.cell);
      return;
    }
    applyAndRecord(
      pending.cell,
      amount,
      result,
      `Asignación O${pending.cell.row + 1}–D${pending.cell.col + 1}`,
    );
    if (!training) {
      setFeedback({
        tone: 'info',
        title: 'Paso registrado',
        body: 'La corrección se mostrará al entregar el examen.',
      });
    }
  };

  const submitTotal = () => {
    const value = Number(totalInput);
    const correct = totalInput !== '' && Number.isFinite(value) && value === totalCost;
    const step: StepResult = {
      label: 'Costo total de transporte',
      detail: correct
        ? `Costo correcto: ${totalCost}.`
        : `El costo correcto es ${totalCost}. Revisa Σ costo × cantidad con la matriz original.`,
      correct,
      weight: 20,
      errorType: correct ? undefined : 'arithmetic',
      correctAnswer: String(totalCost),
    };
    if (training && !correct) {
      setFeedback({ correct: false, title: 'Costo total incorrecto', body: 'Suma costo × cantidad para todas las asignaciones.' });
      return;
    }
    record(step);
    finish([...steps, step], totalCost, 'Costo total de transporte');
  };

  const handleExamFinish = () => {
    const extra: StepResult[] = [];
    if (!complete) {
      extra.push({
        label: 'Procedimiento incompleto',
        detail: `Quedaron ${state.supply.join(',')} de oferta y ${state.demand.join(',')} de demanda sin cubrir.`,
        correct: false,
        weight: 20,
        errorType: 'incomplete',
      });
    } else {
      extra.push({
        label: 'Costo total',
        detail: 'No se registró el costo total antes de entregar.',
        correct: false,
        weight: 20,
        errorType: 'incomplete',
        correctAnswer: String(totalCost),
      });
    }
    finish([...steps, ...extra], totalCost, 'Costo total de transporte');
  };

  const handleReveal = () => {
    if (!window.confirm('Se mostrará la solución de referencia y finalizará la práctica. ¿Continuar?')) {
      return;
    }
    const step: StepResult = {
      label: 'Solución de referencia solicitada',
      detail: 'La práctica se cerró mostrando la solución explicada.',
      correct: false,
      weight: 10,
      errorType: 'incomplete',
    };
    finish([...steps, step], reference.totalCost, 'Costo de la solución de referencia');
  };

  const restart = () => {
    if (!window.confirm('Se generará un ejercicio nuevo con la misma configuración y se perderán las asignaciones actuales. ¿Continuar?')) return;
    discardedRef.current = true;
    clearDraft(draftKey);
    onRestart();
  };

  const hintText =
    instance.method === 'northwest'
      ? 'La siguiente celda es la primera fila y columna con saldo positivo. Asigna min(oferta restante, demanda restante).'
      : instance.method === 'leastCost'
        ? 'Ignora las filas y columnas satisfechas. Elige la celda de menor costo entre las que aún tienen oferta y demanda.'
        : phase === 'penalties'
          ? 'Para cada línea activa, ordena sus costos elegibles y resta los dos menores. Si solo hay uno, usa ese costo.'
          : phase === 'line'
            ? 'Compara todas las penalizaciones calculadas y elige un máximo. Los empates son válidos.'
            : phase === 'cell'
              ? 'Dentro de la línea elegida, busca el costo más bajo entre las celdas disponibles.'
              : 'Asigna la mayor cantidad posible: min(oferta restante, demanda restante).';

  const badCellCheck = badCell;

  return (
    <div className="space-y-5 animate-fade-up">
      <ExerciseHeader
        exercise={exercise}
        seconds={seconds}
        onRestart={restart}
        onFinish={handleExamFinish}
        onReveal={handleReveal}
        canFinish={!training}
        progress={complete ? 100 : progress}
        stepLabel={stepLabel}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <SectionTitle
            eyebrow="Cuadrícula interactiva"
            title={
              phase === 'final'
                ? 'Cierre del ejercicio'
                : instance.method === 'vogel'
                  ? 'Selección de línea y celda'
                  : 'Asignación de cantidades'
            }
            description={
              instance.method === 'vogel'
                ? 'Las celdas bloqueadas ya no tienen oferta o demanda. Los encabezados activos permiten elegir una línea en la etapa correspondiente.'
                : 'Haz clic en una celda disponible, introduce la cantidad y comprueba el paso. Las asignaciones confirmadas quedan bloqueadas.'
            }
            action={
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <span className="h-2 w-2 rounded-full bg-aqua" /> confirmada
                <span className="h-2 w-2 rounded-full bg-rose-400" /> revisar
              </div>
            }
          />

          <div className="mt-5">
            <TransportGrid
              instance={instance}
              state={state}
              pending={pending}
              onSelectCell={handleSelectCell}
              onAmountChange={handleAmountChange}
              disabled={phase === 'final' || phase === 'done' || phase === 'line' || phase === 'penalties'}
              badCell={badCellCheck}
              lastCell={lastCell}
              vogel={{
                penalties:
                  training && phase !== 'penalties' && phase !== 'final'
                    ? computedPenalties
                    : null,
                selectedLine,
                onSelectLine: (line) => {
                  if (phase === 'line') {
                    setSelectedLine(line);
                    setFeedback(null);
                  }
                },
                lineSelectionEnabled: phase === 'line',
              }}
            />
          </div>

          <div className="mt-5 space-y-3">
            {instance.method === 'vogel' && phase === 'penalties' && (
              <PenaltyEditor
                rows={instance.supply.map((_, r) => ({
                  label: `O${r + 1}`,
                  active: state.supply[r] > 0,
                  value: penaltyRows[r],
                }))}
                cols={instance.demand.map((_, c) => ({
                  label: `D${c + 1}`,
                  active: state.demand[c] > 0,
                  value: penaltyCols[c],
                }))}
                onChangeRow={(index, value) => {
                  setPenaltyRows((previous) => {
                    const copy = [...previous];
                    copy[index] = value.replace(/\D/g, '');
                    return copy;
                  });
                  setFeedback(null);
                }}
                onChangeCol={(index, value) => {
                  setPenaltyCols((previous) => {
                    const copy = [...previous];
                    copy[index] = value.replace(/\D/g, '');
                    return copy;
                  });
                  setFeedback(null);
                }}
                onSubmit={submitPenalties}
              />
            )}

            {phase === 'line' && (
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line/60 bg-panel2/40 p-3.5">
                <p className="text-sm text-slate-300">
                  {selectedLine
                    ? `Línea elegida: ${selectedLine.type === 'row' ? 'Origen' : 'Destino'} ${
                        selectedLine.index + 1
                      }`
                    : 'Haz clic en un encabezado para elegir la línea con mayor penalización.'}
                </p>
                <Button className="ml-auto" variant="primary" size="sm" onClick={submitLine}>
                  Confirmar línea
                </Button>
              </div>
            )}

            {phase === 'cell' && (
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line/60 bg-panel2/40 p-3.5">
                <p className="text-sm text-slate-300">
                  {pending
                    ? `Celda elegida: O${pending.cell.row + 1}–D${pending.cell.col + 1}`
                    : 'Haz clic en una celda disponible dentro de la línea resaltada.'}
                </p>
                <Button className="ml-auto" variant="primary" size="sm" onClick={submitCell} disabled={!pending}>
                  Confirmar celda
                </Button>
              </div>
            )}

            {((phase === 'allocate') || (phase === 'amount')) && (
              <div className="flex flex-wrap items-end gap-3 rounded-xl border border-line/60 bg-panel2/40 p-3.5">
                <div>
                  <p className="label">Celda seleccionada</p>
                  <p className="mt-1 font-mono text-sm text-slate-200">
                    {pending
                      ? `O${pending.cell.row + 1}–D${pending.cell.col + 1} · costo ${
                          instance.costs[pending.cell.row][pending.cell.col]
                        }`
                      : 'ninguna'}
                  </p>
                </div>
                <div className="min-w-[130px]">
                  <label className="label" htmlFor="amount">
                    Cantidad
                  </label>
                  <input
                    id="amount"
                    type="number"
                    min={1}
                    value={pending?.amount ?? ''}
                    onChange={(event) => handleAmountChange(event.target.value)}
                    disabled={!pending}
                    className="cell-input mt-1 !text-left"
                    placeholder="0"
                  />
                </div>
                <Button
                  variant="primary"
                  onClick={phase === 'amount' ? submitVogelAmount : submitAllocation}
                  disabled={!pending || pending.amount === ''}
                  className="ml-auto"
                >
                  <Send size={15} />
                  Comprobar paso
                </Button>
              </div>
            )}

            {phase === 'final' && (
              <div className="rounded-xl border border-aqua/25 bg-aqua/[0.04] p-4">
                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <p className="label">Costo total de transporte</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Σ (costo original × cantidad asignada) = ?
                    </p>
                  </div>
                  <input
                    type="number"
                    value={totalInput}
                    onChange={(event) => setTotalInput(event.target.value.replace(/[^\d]/g, ''))}
                    className="cell-input ml-auto !w-36 !text-left"
                    placeholder="Costo"
                    aria-label="Costo total de transporte"
                  />
                  <Button variant="primary" onClick={submitTotal} disabled={!totalInput}>
                    <Target size={15} />
                    Enviar resultado
                  </Button>
                </div>
              </div>
            )}

            {feedback && (
              <Feedback
                correct={feedback.correct}
                tone={feedback.tone}
                title={feedback.title}
              >
                {feedback.body}
              </Feedback>
            )}

            {!training && (
              <Feedback tone="info" title="Modo examen">
                No se muestran correcciones ni pistas. Puedes entregar en cualquier momento; las respuestas se
                evalúan al final.
              </Feedback>
            )}

            <div className="flex flex-wrap items-center gap-2">
              {training && (
                <Button size="sm" variant="ghost" onClick={() => setHint((v) => !v)}>
                  <Lightbulb size={14} />
                  {hint ? 'Ocultar pista' : 'Mostrar pista'}
                </Button>
              )}
              <span className="ml-auto text-[11px] text-slate-500">
                {formatDuration(seconds)} · iteración {state.iteration}
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
            <SectionTitle eyebrow="Estado" title="Saldos y control" />
            <div className="mt-4 space-y-2.5">
              <StatusRow label="Oferta total" value={totalQuantity} />
              <StatusRow label="Asignado" value={totalAssigned} accent />
              <StatusRow label="Pendiente" value={totalQuantity - totalAssigned} />
              <div className="pt-1">
                <ProgressBar value={progress} />
              </div>
            </div>
            <div className="mt-4 rounded-lg border border-line/60 bg-ink/40 p-3 text-[11px] leading-relaxed text-slate-400">
              {instance.method === 'northwest' &&
                'Regla: empieza en la esquina superior izquierda y asigna el máximo posible.'}
              {instance.method === 'leastCost' &&
                'Regla: elige siempre el menor costo disponible y satura la asignación.'}
              {instance.method === 'vogel' &&
                'Regla: calcula penalizaciones, elige la mayor y dentro de esa línea el menor costo.'}
            </div>
          </Card>

          <Card>
            <SectionTitle eyebrow="Trazabilidad" title="Pasos registrados" />
            <ol className="mt-4 space-y-2">
              {steps.length === 0 && (
                <li className="rounded-lg border border-dashed border-line/70 p-3 text-xs text-slate-500">
                  Aún no hay pasos confirmados.
                </li>
              )}
              {steps.map((step, index) => (
                <li
                  key={`${step.label}-${index}`}
                  className="flex items-start gap-2 rounded-lg border border-line/50 bg-panel2/30 px-3 py-2"
                >
                  <span
                    className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
                      step.correct ? 'bg-aqua' : 'bg-rose-400'
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-medium text-slate-200">{step.label}</p>
                    <p className="truncate text-[10px] text-slate-500">{step.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>

          {instance.method === 'vogel' && (
            <Card>
              <SectionTitle eyebrow="Penalizaciones actuales" title="Vista de control" />
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="label mb-1">Orígenes</p>
                  {computedPenalties.rows.map((value, index) => (
                    <p key={index} className="flex justify-between py-0.5 font-mono text-slate-400">
                      <span>O{index + 1}</span>
                      <span className={value === null ? 'text-slate-600' : 'text-slate-200'}>
                        {value === null || !(training && phase !== 'penalties') ? '—' : value}
                      </span>
                    </p>
                  ))}
                </div>
                <div>
                  <p className="label mb-1">Destinos</p>
                  {computedPenalties.cols.map((value, index) => (
                    <p key={index} className="flex justify-between py-0.5 font-mono text-slate-400">
                      <span>D{index + 1}</span>
                      <span className={value === null ? 'text-slate-600' : 'text-slate-200'}>
                        {value === null || !(training && phase !== 'penalties') ? '—' : value}
                      </span>
                    </p>
                  ))}
                </div>
              </div>
              <p className="mt-3 text-[10px] leading-relaxed text-slate-500">
                Panel de control: las penalizaciones se revelan aquí solo después de confirmar la etapa.
                {phase === 'penalties' && ' Aún debes introducirlas en el editor.'}
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function PenaltyEditor({
  rows,
  cols,
  onChangeRow,
  onChangeCol,
  onSubmit,
}: {
  rows: Array<{ label: string; active: boolean; value: string }>;
  cols: Array<{ label: string; active: boolean; value: string }>;
  onChangeRow: (index: number, value: string) => void;
  onChangeCol: (index: number, value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="rounded-xl border border-azure/25 bg-azure/[0.04] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-white">Calcula las penalizaciones</p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            Diferencia entre los dos menores costos elegibles. Si solo hay un costo elegible, usa ese valor.
          </p>
        </div>
        <Button size="sm" variant="primary" onClick={onSubmit}>
          Comprobar penalizaciones
        </Button>
      </div>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="label mb-2">Filas (orígenes)</p>
          <div className="flex flex-wrap gap-2">
            {rows.map((row, index) => (
              <label key={row.label} className="w-[68px]">
                <span className="mb-1 block text-center font-mono text-[10px] text-slate-400">
                  {row.label}
                </span>
                <input
                  type="number"
                  min={0}
                  disabled={!row.active}
                  value={row.active ? row.value : ''}
                  onChange={(event) => onChangeRow(index, event.target.value)}
                  placeholder={row.active ? '0' : '—'}
                  className="cell-input !h-9 !text-sm"
                />
              </label>
            ))}
          </div>
        </div>
        <div>
          <p className="label mb-2">Columnas (destinos)</p>
          <div className="flex flex-wrap gap-2">
            {cols.map((col, index) => (
              <label key={col.label} className="w-[68px]">
                <span className="mb-1 block text-center font-mono text-[10px] text-slate-400">
                  {col.label}
                </span>
                <input
                  type="number"
                  min={0}
                  disabled={!col.active}
                  value={col.active ? col.value : ''}
                  onChange={(event) => onChangeCol(index, event.target.value)}
                  placeholder={col.active ? '0' : '—'}
                  className="cell-input !h-9 !text-sm"
                />
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-400">{label}</span>
      <span className={`font-mono ${accent ? 'text-aqua' : 'text-slate-200'}`}>{value}</span>
    </div>
  );
}
