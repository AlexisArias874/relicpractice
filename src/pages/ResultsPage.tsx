import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  CircleSlash,
  Clock3,
  RefreshCw,
  RotateCcw,
  Trophy,
  XCircle,
} from 'lucide-react';
import { useExerciseSession } from '../state/ExerciseSession';
import { useStats } from '../hooks/useStats';
import { createExercise } from '../engine/exerciseFactory';
import type { TransportReference } from '../types/transportation';
import type { HungarianReference } from '../types/assignment';
import { DIFFICULTY_LABELS, METHOD_LABELS, MODE_LABELS } from '../constants/methods';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Card, SectionTitle } from '../components/common/Card';
import { formatDuration } from '../utils';

const ERROR_LABEL: Record<string, string> = {
  arithmetic: 'Error aritmético',
  method: 'Decisión metodológica',
  'invalid-assignment': 'Asignación inválida',
  incomplete: 'Procedimiento incompleto',
  alternative: 'Solución alternativa válida',
};

export function ResultsPage() {
  const { exercise, result, setExercise } = useExerciseSession();
  const { summary } = useStats();
  const navigate = useNavigate();
  const [showReference, setShowReference] = useState(true);

  if (!result) return <Navigate to="/practicar" replace />;

  const config = exercise
    ? {
        category: exercise.category,
        method: exercise.method,
        difficulty: exercise.difficulty,
        mode: exercise.mode,
        rows: exercise.transportation
          ? exercise.transportation.costs.length
          : exercise.assignment!.values.length,
        cols: exercise.transportation
          ? exercise.transportation.costs[0].length
          : exercise.assignment!.values.length,
      }
    : null;

  const repeat = () => {
    if (!config) return;
    const next = createExercise(config);
    setExercise(next);
    navigate('/ejercicio');
  };

  const correctSteps = result.steps.filter((step) => step.correct).length;

  return (
    <div className="mx-auto max-w-5xl space-y-5 animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="label mb-1">Resultados</p>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            {result.score >= 90
              ? 'Procedimiento dominado'
              : result.score >= 70
                ? 'Buen trabajo, con margen de mejora'
                : 'Revisa el procedimiento paso a paso'}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {METHOD_LABELS[result.method]} · {DIFFICULTY_LABELS[result.difficulty]} ·{' '}
            {MODE_LABELS[result.mode]}
          </p>
        </div>
        <Badge tone={result.passed ? 'emerald' : 'rose'}>
          {result.passed ? 'Aprobado' : 'A revisar'} · {result.score}/100
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="flex items-center gap-4 !p-4">
          <ScoreRing score={result.score} />
          <div>
            <p className="label">Puntuación</p>
            <p className="mt-1 text-2xl font-semibold text-white">{result.score}<span className="text-sm text-slate-500">/100</span></p>
          </div>
        </Card>
        <StatBox icon={<Clock3 size={16} />} label="Tiempo" value={formatDuration(result.timeSeconds)} />
        <StatBox icon={<CheckCircle2 size={16} />} label="Pasos correctos" value={`${correctSteps}/${result.steps.length}`} />
        <StatBox icon={<Trophy size={16} />} label={result.totalLabel} value={String(result.totalValue)} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <Card>
            <SectionTitle
              eyebrow="Evaluación"
              title="Comparación paso a paso"
              description="Cada paso conserva el motivo de la corrección. Las decisiones válidas por desempate se aceptan como correctas."
            />
            <ol className="mt-5 space-y-2.5">
              {result.steps.map((step, index) => (
                <li
                  key={`${step.label}-${index}`}
                  className={`rounded-xl border p-3.5 ${
                    step.correct
                      ? 'border-emerald-500/20 bg-emerald-500/[0.04]'
                      : 'border-rose-500/20 bg-rose-500/[0.04]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {step.correct ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    ) : (
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-slate-100">
                          {index + 1}. {step.label}
                        </p>
                        {!step.correct && step.errorType && (
                          <Badge tone={step.errorType === 'alternative' ? 'amber' : 'rose'}>
                            {ERROR_LABEL[step.errorType] ?? step.errorType}
                          </Badge>
                        )}
                        <span className="ml-auto font-mono text-[10px] text-slate-500">
                          peso {step.weight}
                        </span>
                      </div>
                      <p className="mt-1 text-[12px] leading-relaxed text-slate-400">{step.detail}</p>
                      {!step.correct && step.correctAnswer && (
                        <p className="mt-1.5 rounded-lg border border-line/60 bg-ink/40 px-2.5 py-1.5 text-[11px] text-slate-300">
                          Referencia: <span className="font-mono">{step.correctAnswer}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              ))}
              {result.steps.length === 0 && (
                <li className="rounded-xl border border-dashed border-line p-4 text-sm text-slate-500">
                  No se registraron pasos.
                </li>
              )}
            </ol>
          </Card>

          <Card>
            <SectionTitle
              eyebrow="Solución explicada"
              title="Referencia verificada"
              action={
                <Button size="sm" variant="ghost" onClick={() => setShowReference((v) => !v)}>
                  {showReference ? 'Ocultar' : 'Mostrar'}
                </Button>
              }
            />
            {showReference && (
              <div className="mt-4">
                {exercise?.transportation && (
                  <TransportReferenceView
                    reference={exercise.reference as TransportReference}
                  />
                )}
                {exercise?.assignment && (
                  <HungarianReferenceView
                    reference={exercise.reference as HungarianReference}
                    original={exercise.assignment.values}
                    maximize={exercise.method === 'hungarianMax'}
                  />
                )}
                <div className="mt-4 space-y-1.5 rounded-xl border border-line/60 bg-ink/30 p-3">
                  {result.referenceSummary.map((line, index) => (
                    <p key={index} className="text-[12px] leading-relaxed text-slate-400">
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <SectionTitle eyebrow="Siguiente paso" title="Sigue entrenando" />
            <div className="mt-4 flex flex-col gap-2">
              <Button variant="primary" onClick={repeat}>
                <RefreshCw size={15} />
                Repetir con otro ejercicio
              </Button>
              <Link to="/practicar">
                <Button className="w-full" variant="secondary">
                  <RotateCcw size={15} />
                  Cambiar método o dificultad
                </Button>
              </Link>
              <Link to="/estadisticas">
                <Button className="w-full" variant="ghost">
                  <BarChart3 size={15} />
                  Ver estadísticas
                </Button>
              </Link>
            </div>
          </Card>

          <Card>
            <SectionTitle eyebrow="Acumulado" title="Tu progreso" />
            <div className="mt-4 space-y-3 text-sm">
              <Row label="Ejercicios completados" value={String(summary.completed)} />
              <Row label="Puntuación media" value={`${summary.averageScore}%`} />
              <Row label="Acierto por paso" value={`${summary.accuracy}%`} />
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-line/60 bg-ink/40 p-2.5 text-[11px] text-slate-500">
              <CircleSlash size={13} />
              El historial se guarda solo en este navegador.
            </div>
          </Card>

          <Card>
            <SectionTitle eyebrow="Lectura del resultado" title="Cómo se puntúa" />
            <p className="mt-3 text-[12px] leading-relaxed text-slate-400">
              La nota es el porcentaje de peso conseguido entre los pasos registrados. Los cálculos,
              las decisiones y la asignación final tienen pesos distintos; el resultado final se evalúa
              con la matriz original. En modo entrenamiento solo se registran los pasos confirmados
              correctamente.
            </p>
          </Card>
        </div>
      </div>

      <div className="flex justify-center pb-4">
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-aqua">
          Volver al inicio <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  );
}

function StatBox({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="!p-4">
      <div className="flex items-center gap-2 text-slate-500">{icon}<span className="label">{label}</span></div>
      <p className="mt-2 text-xl font-semibold text-white">{value}</p>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-400">{label}</span>
      <span className="font-mono text-slate-200">{value}</span>
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.max(0, Math.min(100, score)) / 100);
  const color = score >= 70 ? '#2dd4bf' : '#fb7185';
  return (
    <svg width="68" height="68" viewBox="0 0 68 68" className="shrink-0">
      <circle cx="34" cy="34" r={radius} fill="none" stroke="#1b2c44" strokeWidth="6" />
      <circle
        cx="34"
        cy="34"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 34 34)"
      />
      <text x="34" y="38" textAnchor="middle" fill="#f8fafc" fontSize="13" fontFamily="JetBrains Mono, monospace">
        {score}
      </text>
    </svg>
  );
}

function TransportReferenceView({ reference }: { reference: TransportReference }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-line/60 bg-ink/30 p-3">
        <p className="label mb-2">Asignaciones de referencia</p>
        <div className="flex flex-wrap gap-2">
          {reference.allocations.map((allocation, index) => (
            <span
              key={index}
              className="rounded-md border border-aqua/20 bg-aqua/[0.06] px-2 py-1 font-mono text-[11px] text-aqua"
            >
              O{allocation.row + 1}–D{allocation.col + 1}: {allocation.amount}
            </span>
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <MiniStat label="Costo inicial" value={String(reference.totalCost)} />
        <MiniStat label="Costo óptimo verificado" value={String(reference.optimalCost)} />
        <MiniStat label="Degenerada" value={reference.degenerate ? 'Sí' : 'No'} />
      </div>
      <details className="rounded-xl border border-line/60 bg-ink/30 p-3">
        <summary className="cursor-pointer text-xs font-medium text-slate-300">
          Ver iteraciones ({reference.iterations.length})
        </summary>
        <ol className="mt-3 space-y-1.5">
          {reference.iterations.map((iteration) => (
            <li key={iteration.iteration} className="text-[11px] leading-relaxed text-slate-400">
              <span className="font-mono text-slate-300">#{iteration.iteration}</span> O
              {iteration.cell.row + 1}–D{iteration.cell.col + 1} ← {iteration.amount} · O=[
              {iteration.supplyAfter.join(', ')}] D=[{iteration.demandAfter.join(', ')}]
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}

function HungarianReferenceView({
  reference,
  original,
  maximize,
}: {
  reference: HungarianReference;
  original: number[][];
  maximize: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-line/60 bg-ink/30 p-3">
        <p className="label mb-2">Asignación de referencia</p>
        <div className="flex flex-wrap gap-2">
          {reference.assignment.map((col, row) => (
            <span
              key={row}
              className="rounded-md border border-aqua/20 bg-aqua/[0.06] px-2 py-1 font-mono text-[11px] text-aqua"
            >
              O{row + 1}→D{col + 1} ({original[row][col]})
            </span>
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <MiniStat label={maximize ? 'Beneficio' : 'Costo'} value={String(reference.total)} />
        <MiniStat label="Óptimo verificado" value={String(reference.optimalValue)} />
        <MiniStat label="Óptimos alternativos" value={String(reference.alternativeOptima)} />
      </div>
      <details className="rounded-xl border border-line/60 bg-ink/30 p-3">
        <summary className="cursor-pointer text-xs font-medium text-slate-300">
          Ver etapas ({reference.stages.length})
        </summary>
        <ol className="mt-3 space-y-2">
          {reference.stages.map((stage, index) => (
            <li key={index} className="text-[11px] leading-relaxed text-slate-400">
              <span className="font-mono text-slate-300">#{index + 1}</span> {stage.note}{' '}
              <span className="font-mono text-slate-500">
                {stage.matrix.map((row) => `[${row.join(', ')}]`).join(' ')}
              </span>
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line/60 bg-ink/30 px-3 py-2">
      <p className="label">{label}</p>
      <p className="mt-1 font-mono text-sm text-slate-200">{value}</p>
    </div>
  );
}
