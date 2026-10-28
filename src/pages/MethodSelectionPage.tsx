import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  Binary,
  Compass,
  Crown,
  Grid3X3,
  Info,
  Layers,
  Maximize2,
  Minimize2,
  Play,
  Shuffle,
  Split,
  TrendingUp,
  Wand2,
} from 'lucide-react';
import type { Difficulty, ExerciseCategory, ExerciseMethod, PracticeMode } from '../types';
import type { ExerciseConfig } from '../types';
import {
  DIFFICULTY_DESCRIPTIONS,
  DIFFICULTY_LABELS,
  METHOD_DESCRIPTIONS,
  METHOD_LABELS,
} from '../constants/methods';
import { createExercise } from '../engine/exerciseFactory';
import { useExerciseSession } from '../state/ExerciseSession';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Button } from '../components/common/Button';
import { Card, SectionTitle } from '../components/common/Card';
import { Badge } from '../components/common/Badge';

const TRANSPORT_METHODS: Array<{ id: ExerciseMethod; icon: typeof Compass; tag: string }> = [
  { id: 'northwest', icon: Compass, tag: 'Solución inicial' },
  { id: 'leastCost', icon: Split, tag: 'Solución inicial' },
  { id: 'vogel', icon: TrendingUp, tag: 'Penalizaciones' },
];
const ASSIGNMENT_METHODS: Array<{ id: ExerciseMethod; icon: typeof Compass; tag: string }> = [
  { id: 'hungarianMin', icon: Minimize2, tag: 'Minimización' },
  { id: 'hungarianMax', icon: Maximize2, tag: 'Maximización' },
];

interface Prefs {
  category: ExerciseCategory;
  method: ExerciseMethod;
  difficulty: Difficulty;
  mode: PracticeMode;
  rows: number;
  cols: number;
}

const DEFAULT_PREFS: Prefs = {
  category: 'transportation',
  method: 'northwest',
  difficulty: 'easy',
  mode: 'training',
  rows: 3,
  cols: 3,
};

function suggestedSize(difficulty: Difficulty): number {
  return difficulty === 'easy' ? 3 : difficulty === 'intermediate' ? 4 : 5;
}

export function MethodSelectionPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setExercise } = useExerciseSession();
  const [saved, setSaved] = useLocalStorage<Prefs>('relicpractice.prefs.v1', DEFAULT_PREFS);
  const initialMethod = searchParams.get('method') as ExerciseMethod | null;
  const [category, setCategory] = useState<ExerciseCategory>(
    initialMethod
      ? initialMethod.startsWith('hungarian')
        ? 'assignment'
        : 'transportation'
      : saved.category,
  );
  const [method, setMethod] = useState<ExerciseMethod>(
    initialMethod ??
      (saved.method.startsWith('hungarian') && category === 'assignment'
        ? saved.method
        : 'northwest'),
  );
  const [difficulty, setDifficulty] = useState<Difficulty>(saved.difficulty);
  const [mode, setMode] = useState<PracticeMode>(saved.mode);
  const [rows, setRows] = useState(saved.rows);
  const [cols, setCols] = useState(saved.cols);
  const [seedInput, setSeedInput] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const methods = category === 'transportation' ? TRANSPORT_METHODS : ASSIGNMENT_METHODS;
  const isTransport = category === 'transportation';

  const selectCategory = (next: ExerciseCategory) => {
    setCategory(next);
    setMethod(next === 'transportation' ? 'northwest' : 'hungarianMin');
    const size = suggestedSize(difficulty);
    setRows(size);
    setCols(size);
    setError(null);
  };

  const selectDifficulty = (next: Difficulty) => {
    setDifficulty(next);
    const size = suggestedSize(next);
    setRows(size);
    setCols(size);
  };

  const generate = () => {
    setError(null);
    const config: ExerciseConfig = {
      category,
      method,
      difficulty,
      mode,
      rows: isTransport ? rows : cols,
      cols,
    };
    const seed = seedInput.trim() ? Number(seedInput.trim()) : undefined;
    if (seed !== undefined && (!Number.isInteger(seed) || seed < 0)) {
      setError('La semilla debe ser un entero no negativo.');
      return;
    }
    try {
      const exercise = createExercise(config, seed);
      setSaved({ category, method, difficulty, mode, rows, cols });
      setExercise(exercise);
      navigate('/ejercicio');
    } catch (cause) {
      setError(
        cause instanceof Error
          ? `No se pudo generar el ejercicio: ${cause.message}`
          : 'No se pudo generar el ejercicio. Prueba otras dimensiones.',
      );
    }
  };

  const methodInfo = useMemo(() => {
    const list = [...TRANSPORT_METHODS, ...ASSIGNMENT_METHODS];
    return list.find((item) => item.id === method);
  }, [method]);

  return (
    <div className="mx-auto max-w-6xl space-y-5 animate-fade-up">
      <div>
        <p className="label mb-1.5">Nuevo ejercicio</p>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Configura tu práctica</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">
          El ejercicio se genera con datos aleatorios validados. La solución de referencia se calcula antes
          de empezar y permanece oculta hasta que la solicites o entregues.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <Card>
            <div className="flex items-center gap-3">
              <StepNumber value="01" />
              <SectionTitle title="Categoría" description="Elige el tipo de problema." />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <CategoryCard
                active={category === 'transportation'}
                title="Transporte"
                description="Orígenes, destinos, oferta y demanda."
                icon={<Layers size={18} />}
                onClick={() => selectCategory('transportation')}
              />
              <CategoryCard
                active={category === 'assignment'}
                title="Asignación"
                description="Matrices cuadradas de costo o beneficio."
                icon={<Grid3X3 size={18} />}
                onClick={() => selectCategory('assignment')}
              />
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-3">
              <StepNumber value="02" />
              <SectionTitle title="Método" description="Cinco procedimientos completos, paso a paso." />
            </div>
            <div className="mt-4 grid gap-3">
              {methods.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setMethod(item.id);
                    setError(null);
                  }}
                  className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition ${
                    method === item.id
                      ? 'border-aqua/50 bg-aqua/[0.06] shadow-glow'
                      : 'border-line/70 bg-panel2/30 hover:border-slate-500/50'
                  }`}
                >
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border ${
                      method === item.id
                        ? 'border-aqua/30 bg-aqua/10 text-aqua'
                        : 'border-line bg-ink/40 text-slate-400'
                    }`}
                  >
                    <item.icon size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-white">{METHOD_LABELS[item.id]}</span>
                      <Badge>{item.tag}</Badge>
                    </span>
                    <span className="mt-1 block text-[12px] leading-relaxed text-slate-400">
                      {METHOD_DESCRIPTIONS[item.id]}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-3">
              <StepNumber value="03" />
              <SectionTitle title="Dificultad" description="Ajusta tamaño, empates y casos especiales." />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {(['easy', 'intermediate', 'hard'] as Difficulty[]).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => selectDifficulty(level)}
                  className={`rounded-xl border p-3.5 text-left transition ${
                    difficulty === level
                      ? 'border-aqua/50 bg-aqua/[0.06]'
                      : 'border-line/70 bg-panel2/30 hover:border-slate-500/50'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        level === 'easy' ? 'bg-emerald-400' : level === 'intermediate' ? 'bg-amber-400' : 'bg-rose-400'
                      }`}
                    />
                    <span className="text-sm font-medium text-white">{DIFFICULTY_LABELS[level]}</span>
                  </span>
                  <span className="mt-1.5 block text-[11px] leading-relaxed text-slate-400">
                    {DIFFICULTY_DESCRIPTIONS[level]}
                  </span>
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-3">
              <StepNumber value="04" />
              <SectionTitle
                title="Dimensiones"
                description={
                  isTransport
                    ? 'De 3×3 a 6×6. La oferta total siempre iguala la demanda total.'
                    : 'Matriz cuadrada de 3×3 a 6×6.'
                }
              />
            </div>
            <div className="mt-4 flex flex-wrap items-end gap-4">
              <label className="min-w-[120px]">
                <span className="label">{isTransport ? 'Orígenes' : 'Tamaño n'}</span>
                <select
                  value={isTransport ? rows : cols}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    if (isTransport) setRows(value);
                    else {
                      setRows(value);
                      setCols(value);
                    }
                  }}
                  className="mt-1.5 h-10 w-full rounded-lg border border-line bg-ink/60 px-3 text-sm text-slate-200 outline-none focus:border-aqua"
                >
                  {[3, 4, 5, 6].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
              {isTransport && (
                <>
                  <span className="pb-2.5 font-mono text-slate-600">×</span>
                  <label className="min-w-[120px]">
                    <span className="label">Destinos</span>
                    <select
                      value={cols}
                      onChange={(event) => setCols(Number(event.target.value))}
                      className="mt-1.5 h-10 w-full rounded-lg border border-line bg-ink/60 px-3 text-sm text-slate-200 outline-none focus:border-aqua"
                    >
                      {[3, 4, 5, 6].map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}
              <div className="pb-1 text-[11px] text-slate-500">
                {isTransport ? `${rows * cols} celdas de costo` : `${cols * cols} celdas`} · valores enteros
                positivos
              </div>
            </div>
            {isTransport && (
              <p className="mt-3 rounded-lg border border-line/60 bg-ink/30 px-3 py-2 text-[11px] text-slate-500">
                Dificultad difícil favorece instancias degeneradas (menos de m+n−1 asignaciones positivas).
              </p>
            )}
            {!isTransport && (
              <p className="mt-3 rounded-lg border border-line/60 bg-ink/30 px-3 py-2 text-[11px] text-slate-500">
                Dificultad difícil busca matrices con múltiples soluciones óptimas alternativas.
              </p>
            )}
          </Card>

          <Card>
            <div className="flex items-center gap-3">
              <StepNumber value="05" />
              <SectionTitle title="Modo" description="Elige cómo quieres practicar." />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <ModeCard
                active={mode === 'training'}
                title="Entrenamiento"
                description="Validación inmediata, pistas opcionales y corrección de errores en cada etapa."
                icon={<Wand2 size={17} />}
                onClick={() => setMode('training')}
              />
              <ModeCard
                active={mode === 'exam'}
                title="Examen"
                description="Sin respuestas ni pistas. Temporizador y calificación al entregar."
                icon={<Binary size={17} />}
                onClick={() => setMode('exam')}
              />
            </div>
            <button
              type="button"
              onClick={() => setShowAdvanced((value) => !value)}
              className="mt-4 text-[11px] text-slate-500 underline-offset-2 hover:text-aqua hover:underline"
            >
              {showAdvanced ? 'Ocultar opciones avanzadas' : 'Opciones avanzadas · semilla reproducible'}
            </button>
            {showAdvanced && (
              <div className="mt-3 flex flex-wrap items-end gap-3 rounded-xl border border-line/60 bg-ink/30 p-3">
                <label className="min-w-[180px]">
                  <span className="label">Semilla (opcional)</span>
                  <input
                    type="number"
                    min={0}
                    value={seedInput}
                    onChange={(event) => setSeedInput(event.target.value)}
                    placeholder="Aleatoria"
                    className="cell-input mt-1.5 !text-left"
                  />
                </label>
                <p className="pb-2 text-[11px] text-slate-500">
                  La misma semilla, método y dimensiones reproducen el mismo enunciado.
                </p>
              </div>
            )}
          </Card>

          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
              {error}
            </div>
          )}
        </div>

        <div className="space-y-5 lg:sticky lg:top-6 lg:self-start">
          <Card>
            <SectionTitle eyebrow="Resumen" title={METHOD_LABELS[method]} />
            <div className="mt-4 space-y-3 text-sm">
              <SummaryRow label="Categoría" value={isTransport ? 'Transporte' : 'Asignación'} />
              <SummaryRow label="Dificultad" value={DIFFICULTY_LABELS[difficulty]} />
              <SummaryRow label="Dimensiones" value={isTransport ? `${rows} × ${cols}` : `${cols} × ${cols}`} />
              <SummaryRow label="Modo" value={mode === 'training' ? 'Entrenamiento' : 'Examen'} />
              <SummaryRow
                label="Elementos"
                value={
                  isTransport
                    ? `${rows} orígenes · ${cols} destinos`
                    : `${cols} filas · ${cols} columnas`
                }
              />
            </div>
            <div className="mt-4 rounded-xl border border-line/60 bg-ink/40 p-3 text-[11px] leading-relaxed text-slate-400">
              <Info className="mr-1 inline h-3 w-3 text-azure" />
              {methodInfo
                ? METHOD_DESCRIPTIONS[methodInfo.id]
                : 'Procedimiento guiado con validación matemática.'}
            </div>
            <Button className="mt-4 w-full" variant="primary" size="lg" onClick={generate}>
              <Play size={16} />
              Generar ejercicio
              <ArrowRight size={15} />
            </Button>
            <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-slate-500">
              <Shuffle size={11} />
              Instancia validada · solución calculada al instante
            </div>
          </Card>

          <Card>
            <SectionTitle eyebrow="Garantías" title="Qué incluye" />
            <ul className="mt-3 space-y-2 text-[12px] text-slate-400">
              <Guarantee icon={<Crown size={13} />} text="Datos balanceados y factibles" />
              <Guarantee icon={<TrendingUp size={13} />} text="Costo o beneficio con la matriz original" />
              <Guarantee icon={<Grid3X3 size={13} />} text="Empates y soluciones alternativas aceptadas" />
              <Guarantee icon={<Binary size={13} />} text="Evaluación del procedimiento, no solo del resultado" />
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StepNumber({ value }: { value: string }) {
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-line bg-ink/50 font-mono text-[11px] text-aqua">
      {value}
    </span>
  );
}

function CategoryCard({
  active,
  title,
  description,
  icon,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition ${
        active ? 'border-aqua/50 bg-aqua/[0.06]' : 'border-line/70 bg-panel2/30 hover:border-slate-500/50'
      }`}
    >
      <span className={`mt-0.5 ${active ? 'text-aqua' : 'text-slate-500'}`}>{icon}</span>
      <span>
        <span className="block text-sm font-medium text-white">{title}</span>
        <span className="mt-0.5 block text-[11px] text-slate-400">{description}</span>
      </span>
    </button>
  );
}

function ModeCard({
  active,
  title,
  description,
  icon,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-3.5 text-left transition ${
        active ? 'border-aqua/50 bg-aqua/[0.06]' : 'border-line/70 bg-panel2/30 hover:border-slate-500/50'
      }`}
    >
      <span className={`flex items-center gap-2 text-sm font-medium ${active ? 'text-aqua' : 'text-slate-200'}`}>
        {icon}
        {title}
      </span>
      <span className="mt-1.5 block text-[11px] leading-relaxed text-slate-400">{description}</span>
    </button>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <span className="text-right text-slate-200">{value}</span>
    </div>
  );
}

function Guarantee({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <li className="flex items-center gap-2">
      <span className="text-aqua">{icon}</span>
      {text}
    </li>
  );
}
