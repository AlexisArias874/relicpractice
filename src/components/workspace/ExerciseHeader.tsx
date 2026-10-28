import { ArrowLeft, Clock3, Eye, Flag, RotateCcw, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import {
  DIFFICULTY_LABELS,
  METHOD_LABELS,
  MODE_LABELS,
} from '../../constants/methods';
import type { Exercise } from '../../types';
import { formatDuration } from '../../utils';

export function ExerciseHeader({
  exercise,
  seconds,
  onRestart,
  onFinish,
  onReveal,
  canFinish,
  progress,
  stepLabel,
}: {
  exercise: Exercise;
  seconds: number;
  onRestart: () => void;
  onFinish: () => void;
  onReveal: () => void;
  canFinish: boolean;
  progress: number;
  stepLabel: string;
}) {
  const training = exercise.mode === 'training';
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Link
            to="/practicar"
            className="grid h-9 w-9 place-items-center rounded-lg border border-line text-slate-400 transition hover:border-aqua/40 hover:text-white"
            title="Volver a la selección"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base font-semibold tracking-tight text-white">
                {METHOD_LABELS[exercise.method]}
              </h1>
              <Badge tone={training ? 'aqua' : 'amber'}>
                {training ? <ShieldCheck size={10} /> : <Flag size={10} />}
                {MODE_LABELS[exercise.mode]}
              </Badge>
              <Badge>{DIFFICULTY_LABELS[exercise.difficulty]}</Badge>
            </div>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {stepLabel} · semilla {exercise.seed}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-panel2 px-2.5 font-mono text-xs text-slate-300">
            <Clock3 size={13} className="text-slate-500" />
            {formatDuration(seconds)}
          </span>
          <Button size="sm" variant="ghost" onClick={onRestart} title="Nuevo ejercicio con la misma configuración">
            <RotateCcw size={13} />
            Reiniciar
          </Button>
          {training ? (
            <Button size="sm" variant="secondary" onClick={onReveal}>
              <Eye size={13} />
              Ver solución
            </Button>
          ) : (
            <Button size="sm" variant="danger" disabled={!canFinish} onClick={onFinish}>
              <Flag size={13} />
              Entregar examen
            </Button>
          )}
        </div>
      </div>
      <div className="panel flex flex-wrap items-center gap-4 px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-center justify-between text-[11px] text-slate-500">
            <span>Progreso del procedimiento</span>
            <span className="font-mono text-slate-300">{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-line/70">
            <div
              className="h-full rounded-full bg-gradient-to-r from-azure to-aqua transition-all duration-500"
              style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
            />
          </div>
        </div>
        <div className="hidden text-right sm:block">
          <p className="label">Modo</p>
          <p className="text-xs text-slate-300">
            {training ? 'Validación paso a paso' : 'Sin pistas · evaluación al final'}
          </p>
        </div>
      </div>
    </div>
  );
}
