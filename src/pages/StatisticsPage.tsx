import { BarChart3, Clock3, Percent, Target, Trash2, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStats } from '../hooks/useStats';
import { METHOD_LABELS, DIFFICULTY_LABELS, MODE_LABELS } from '../constants/methods';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Card, EmptyState, ProgressBar, SectionTitle } from '../components/common/Card';
import { formatDuration, percent } from '../utils';
import type { ExerciseMethod } from '../types';

const METHODS: ExerciseMethod[] = [
  'northwest',
  'leastCost',
  'vogel',
  'hungarianMin',
  'hungarianMax',
];

export function StatisticsPage() {
  const { history, summary, clearHistory } = useStats();

  if (!history.length) {
    return (
      <div className="mx-auto max-w-3xl animate-fade-up">
        <div className="mb-5">
          <p className="label mb-1.5">Estadísticas</p>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Tu rendimiento</h1>
        </div>
        <Card className="p-4">
          <EmptyState
            icon={<BarChart3 size={22} />}
            title="Todavía no hay resultados"
            description="Completa un ejercicio en modo entrenamiento o examen. El historial se guarda en este navegador y alimenta estas estadísticas."
            action={
              <Link to="/practicar">
                <Button variant="primary">Crear mi primer ejercicio</Button>
              </Link>
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 animate-fade-up">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label mb-1.5">Estadísticas</p>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Tu rendimiento</h1>
          <p className="mt-1 text-sm text-slate-400">
            {summary.completed} ejercicios completados · datos locales de este navegador
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (window.confirm('¿Borrar todo el historial y las estadísticas de este navegador?')) {
              clearHistory();
            }
          }}
        >
          <Trash2 size={13} />
          Borrar historial
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={<Trophy size={16} />}
          label="Puntuación media"
          value={`${summary.averageScore}%`}
          detail="Media ponderada de pasos"
        />
        <MetricCard
          icon={<Target size={16} />}
          label="Acierto por paso"
          value={`${summary.accuracy}%`}
          detail="Pasos correctos / registrados"
        />
        <MetricCard
          icon={<Clock3 size={16} />}
          label="Tiempo promedio"
          value={formatDuration(summary.averageSeconds)}
          detail="Por ejercicio"
        />
        <MetricCard
          icon={<Percent size={16} />}
          label="Completados"
          value={String(summary.completed)}
          detail={`${summary.commonErrors.reduce((t, e) => t + e.count, 0)} errores registrados`}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
        <div className="space-y-5">
          <Card>
            <SectionTitle
              eyebrow="Por método"
              title="Rendimiento comparado"
              description="La barra muestra la puntuación media de tus intentos en cada procedimiento."
            />
            <div className="mt-5 space-y-4">
              {METHODS.map((method) => {
                const stats = summary.byMethod[method];
                const average = stats?.attempts ? Math.round(stats.totalScore / stats.attempts) : 0;
                return (
                  <div key={method}>
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className={`h-1.5 w-1.5 rounded-full ${stats ? 'bg-aqua' : 'bg-line'}`} />
                        <span className={`text-sm ${stats ? 'text-slate-200' : 'text-slate-500'}`}>
                          {METHOD_LABELS[method]}
                        </span>
                        {stats && (
                          <Badge tone={average >= 70 ? 'emerald' : 'amber'}>
                            {stats.attempts} intento{stats.attempts > 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                      <span className="font-mono text-xs text-slate-400">{average}%</span>
                    </div>
                    <ProgressBar value={average} tone={average >= 70 ? 'aqua' : 'azure'} />
                    {stats && (
                      <p className="mt-1 text-[10px] text-slate-500">
                        Mejor: {stats.bestScore}% · tiempo medio{' '}
                        {formatDuration(Math.round(stats.totalSeconds / stats.attempts))}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <SectionTitle eyebrow="Historial" title="Últimos ejercicios" />
            <div className="scroll-thin mt-4 overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-xs">
                <thead>
                  <tr className="border-b border-line/60 text-[10px] uppercase tracking-wider text-slate-500">
                    <th className="pb-2 pr-3 font-medium">Método</th>
                    <th className="pb-2 pr-3 font-medium">Dificultad</th>
                    <th className="pb-2 pr-3 font-medium">Modo</th>
                    <th className="pb-2 pr-3 font-medium">Puntuación</th>
                    <th className="pb-2 pr-3 font-medium">Tiempo</th>
                    <th className="pb-2 font-medium">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {history.slice(0, 20).map((result) => (
                    <tr key={result.id} className="border-b border-line/30 last:border-0">
                      <td className="py-2.5 pr-3 text-slate-200">{METHOD_LABELS[result.method]}</td>
                      <td className="py-2.5 pr-3 text-slate-400">{DIFFICULTY_LABELS[result.difficulty]}</td>
                      <td className="py-2.5 pr-3">
                        <Badge tone={result.mode === 'exam' ? 'amber' : 'aqua'}>
                          {MODE_LABELS[result.mode]}
                        </Badge>
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className={result.score >= 70 ? 'text-aqua' : 'text-rose-300'}>
                          {result.score}/100
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 font-mono text-slate-400">
                        {formatDuration(result.timeSeconds)}
                      </td>
                      <td className="py-2.5 text-slate-500">
                        {new Date(result.completedAt).toLocaleDateString('es', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <SectionTitle eyebrow="Diagnóstico" title="Errores frecuentes" />
            {summary.commonErrors.length ? (
              <div className="mt-4 space-y-3">
                {summary.commonErrors.map((error) => {
                  const total = summary.commonErrors.reduce((sum, item) => sum + item.count, 0);
                  return (
                    <div key={error.label}>
                      <div className="mb-1 flex items-center justify-between text-[12px]">
                        <span className="text-slate-300">{error.label}</span>
                        <span className="font-mono text-slate-500">{error.count}</span>
                      </div>
                      <ProgressBar value={percent(error.count, total)} tone="azure" />
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-4 rounded-lg border border-dashed border-line/70 p-3 text-xs text-slate-500">
                Sin errores registrados todavía. Los errores se contabilizan en los exámenes entregados.
              </p>
            )}
          </Card>

          <Card>
            <SectionTitle eyebrow="Recomendación" title="Dónde insistir" />
            <p className="mt-3 text-[12px] leading-relaxed text-slate-400">
              {summary.commonErrors[0]
                ? `Tu patrón más frecuente es «${summary.commonErrors[0].label.toLowerCase()}». Repite un ejercicio del método con menor puntuación y revisa la etapa concreta en la solución de referencia.`
                : 'Sigue alternando transporte y asignación. Los ejercicios difíciles aceptan varios desempates y soluciones óptimas alternativas.'}
            </p>
            <Link to="/practicar">
              <Button className="mt-4 w-full" variant="primary">
                Practicar ahora
              </Button>
            </Link>
          </Card>

          <Card>
            <SectionTitle eyebrow="Privacidad" title="Datos locales" />
            <p className="mt-3 text-[12px] leading-relaxed text-slate-400">
              El historial se guarda en LocalStorage. No se envía información a ningún servidor. La
              integración con Supabase queda como ampliación futura para cuentas y sincronización.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Card className="!p-4">
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <span className="label">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-0.5 text-[10px] text-slate-500">{detail}</p>
    </Card>
  );
}
