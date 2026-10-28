import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Compass,
  Grid3X3,
  Layers,
  LockKeyhole,
  Maximize2,
  Minimize2,
  Play,
  Split,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import { useStats } from '../hooks/useStats';
import { useExerciseSession } from '../state/ExerciseSession';
import {
  METHOD_DESCRIPTIONS,
  METHOD_LABELS,
} from '../constants/methods';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Card, ProgressBar, SectionTitle } from '../components/common/Card';
import type { ExerciseMethod } from '../types';
import { formatDuration } from '../utils';

const METHODS: Array<{ method: ExerciseMethod; icon: typeof Compass; category: string }> = [
  { method: 'northwest', icon: Compass, category: 'Transporte' },
  { method: 'leastCost', icon: Split, category: 'Transporte' },
  { method: 'vogel', icon: TrendingUp, category: 'Transporte' },
  { method: 'hungarianMin', icon: Minimize2, category: 'Asignación' },
  { method: 'hungarianMax', icon: Maximize2, category: 'Asignación' },
];

export function HomePage() {
  const { summary } = useStats();
  const { exercise } = useExerciseSession();

  return (
    <div className="space-y-10 animate-fade-up">
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,.85fr)] lg:items-center">
        <div>
          <Badge tone="aqua" className="mb-4">
            <Sparkles size={10} />
            Entrenador de Investigación de Operaciones
          </Badge>
          <h1 className="max-w-2xl text-4xl font-semibold leading-[1.08] tracking-[-0.03em] text-white sm:text-5xl">
            Practica el método.
            <span className="block bg-gradient-to-r from-azure via-aqua to-teal-300 bg-clip-text text-transparent">
              No solo la respuesta.
            </span>
          </h1>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-slate-400">
            RelicPractice genera problemas de transporte y asignación, valida cada decisión del
            procedimiento y compara tus tablas con una solución calculada y verificada de forma
            independiente.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link to="/practicar">
              <Button variant="primary" size="lg">
                <Play size={16} />
                Empezar a practicar
              </Button>
            </Link>
            <Link to="/estadisticas">
              <Button variant="secondary" size="lg">
                <BarChart3 size={16} />
                Ver mi progreso
              </Button>
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-aqua" /> 5 procedimientos completos
            </span>
            <span className="flex items-center gap-1.5">
              <LockKeyhole className="h-3.5 w-3.5 text-aqua" /> Solución oculta hasta comprobar
            </span>
            <span className="flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5 text-aqua" /> Evaluación paso a paso
            </span>
          </div>
        </div>

        <HeroPreview />
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Ejercicios completados"
          value={String(summary.completed)}
          hint={summary.completed ? 'Historial local activo' : 'Tu primer ejercicio te espera'}
        />
        <StatCard
          label="Puntuación media"
          value={`${summary.averageScore}%`}
          hint={`${summary.accuracy}% de aciertos por paso`}
          progress={summary.averageScore}
        />
        <StatCard
          label="Tiempo medio"
          value={formatDuration(summary.averageSeconds)}
          hint="Incluye entrenamiento y examen"
        />
      </section>

      {exercise && (
        <section className="panel flex flex-wrap items-center gap-4 p-5">
          <div className="grid h-11 w-11 place-items-center rounded-xl border border-aqua/25 bg-aqua/10 text-aqua">
            <Play size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="label">Sesión guardada</p>
            <p className="mt-1 truncate text-sm font-medium text-white">
              {METHOD_LABELS[exercise.method]} · semilla {exercise.seed}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Puedes continuar el ejercicio que quedó abierto en este navegador.
            </p>
          </div>
          <Link to="/ejercicio">
            <Button variant="secondary">
              Continuar
              <ChevronRight size={15} />
            </Button>
          </Link>
        </section>
      )}

      <section>
        <SectionTitle
          eyebrow="Métodos"
          title="Elige qué entrenar"
          description="Cada método tiene su propio flujo por etapas, reglas de desempate documentadas y verificación independiente."
          action={
            <Link to="/practicar" className="hidden items-center gap-1 text-xs text-aqua hover:underline sm:flex">
              Configurar dimensiones <ArrowRight size={12} />
            </Link>
          }
        />
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {METHODS.map(({ method, icon: Icon, category }, index) => (
            <Link
              key={method}
              to={`/practicar?method=${method}`}
              className={`group panel relative overflow-hidden p-5 transition hover:border-aqua/40 hover:shadow-glow ${
                index === 0 ? 'xl:col-span-2' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <span className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-ink/60 text-aqua transition group-hover:border-aqua/30">
                  <Icon size={18} />
                </span>
                <Badge>{category}</Badge>
              </div>
              <h3 className="mt-4 font-medium text-white">{METHOD_LABELS[method]}</h3>
              <p className="mt-1.5 max-w-md text-[12px] leading-relaxed text-slate-400">
                {METHOD_DESCRIPTIONS[method]}
              </p>
              <span className="mt-4 flex items-center gap-1 text-[11px] font-medium text-aqua/80 transition group-hover:text-aqua">
                Crear ejercicio <ArrowRight size={12} />
              </span>
              <div className="pointer-events-none absolute -bottom-20 -right-20 h-44 w-44 rounded-full bg-aqua/[0.04] blur-2xl transition group-hover:bg-aqua/[0.08]" />
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <HowStep
          number="01"
          icon={<Layers size={16} />}
          title="Genera un problema válido"
          text="Matriz aleatoria con semilla reproducible, oferta y demanda balanceadas, y validación previa."
        />
        <HowStep
          number="02"
          icon={<Grid3X3 size={16} />}
          title="Resuelve en la cuadrícula"
          text="Asigna, reduce, cubre ceros o elige líneas. El estado se actualiza y las celdas inválidas se bloquean."
        />
        <HowStep
          number="03"
          icon={<Target size={16} />}
          title="Comprueba y aprende"
          text="Entrenamiento con corrección inmediata o examen con calificación al final y solución explicada."
        />
      </section>

      <section className="panel relative overflow-hidden p-6 sm:p-8">
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-5">
          <div>
            <p className="label mb-1.5">Sin servicios externos</p>
            <h2 className="text-xl font-semibold tracking-tight text-white">
              Todo el cálculo ocurre en tu navegador
            </h2>
            <p className="mt-1.5 max-w-xl text-sm text-slate-400">
              Los algoritmos están separados de la interfaz. Tus ejercicios, resultados e historial se
              guardan localmente; la sincronización con Supabase queda como ampliación futura.
            </p>
          </div>
          <Link to="/practicar">
            <Button variant="primary">
              Nuevo ejercicio
              <ArrowRight size={15} />
            </Button>
          </Link>
        </div>
        <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-azure/[0.06] blur-3xl" />
      </section>
    </div>
  );
}

function HeroPreview() {
  const costs = [
    [8, 6, 10],
    [9, 12, 5],
    [7, 4, 11],
  ];
  const allocations = [
    [0, 1, 0],
    [0, 0, 1],
    [1, 0, 0],
  ];
  return (
    <div className="panel relative p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="label">Vista del entrenador</p>
          <p className="mt-1 text-sm font-medium text-white">Asignación · minimización</p>
        </div>
        <Badge tone="aqua">En curso</Badge>
      </div>
      <div className="mt-4 grid grid-cols-4 gap-1.5 text-center">
        <div />
        {['D1', 'D2', 'D3'].map((label) => (
          <div key={label} className="rounded-md border border-line/60 bg-panel2/50 py-1 font-mono text-[10px] text-slate-400">
            {label}
          </div>
        ))}
        {costs.map((row, r) => (
          <div key={r} className="contents">
            <div className="grid place-items-center rounded-md border border-line/60 bg-panel2/50 font-mono text-[10px] text-slate-400">
              O{r + 1}
            </div>
            {row.map((cost, c) => (
              <div
                key={c}
                className={`relative rounded-md border p-1.5 ${
                  allocations[r][c]
                    ? 'border-aqua/45 bg-aqua/10'
                    : 'border-line/50 bg-ink/40'
                }`}
              >
                <span className="block font-mono text-xs text-slate-300">{cost}</span>
                {allocations[r][c] ? (
                  <span className="mt-1 block rounded bg-aqua/15 py-0.5 font-mono text-[10px] font-semibold text-aqua">
                    ✓
                  </span>
                ) : (
                  <span className="mt-1 block font-mono text-[10px] text-slate-700">0</span>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-[10px] text-slate-500">
          <span>Progreso del procedimiento</span>
          <span className="font-mono">3 / 6 etapas</span>
        </div>
        <ProgressBar value={50} />
      </div>
      <div className="mt-4 rounded-lg border border-line/50 bg-ink/40 p-2.5">
        <p className="text-[10px] text-slate-500">Última validación</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-emerald-300">
          <CheckCircle2 size={12} /> Cobertura mínima correcta: 3 líneas
        </p>
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/[0.05] p-2.5 text-[10px] text-amber-200/80">
        <LockKeyhole size={12} />
        La solución de referencia permanece oculta.
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  progress,
}: {
  label: string;
  value: string;
  hint: string;
  progress?: number;
}) {
  return (
    <Card className="!p-4">
      <p className="label">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      {progress !== undefined && <ProgressBar value={progress} className="mt-2" />}
      <p className="mt-1.5 text-[10px] text-slate-500">{hint}</p>
    </Card>
  );
}

function HowStep({
  number,
  icon,
  title,
  text,
}: {
  number: string;
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between">
        <span className="grid h-9 w-9 place-items-center rounded-lg border border-line bg-ink/50 text-aqua">
          {icon}
        </span>
        <span className="font-mono text-[11px] text-slate-600">{number}</span>
      </div>
      <h3 className="mt-4 text-sm font-medium text-white">{title}</h3>
      <p className="mt-1.5 text-[12px] leading-relaxed text-slate-400">{text}</p>
    </div>
  );
}
