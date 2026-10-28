import type { ReactNode } from 'react';
import { CheckCircle2, Info, XCircle, TriangleAlert } from 'lucide-react';

export function Card({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`panel p-5 sm:p-6 ${className}`}>{children}</section>;
}

export function SectionTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        {eyebrow && <p className="label mb-1.5">{eyebrow}</p>}
        <h2 className="text-lg font-semibold tracking-tight text-white">{title}</h2>
        {description && <p className="mt-1 max-w-2xl text-sm text-slate-400">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function ProgressBar({
  value,
  className = '',
  tone = 'aqua',
}: {
  value: number;
  className?: string;
  tone?: 'aqua' | 'azure';
}) {
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-line/70 ${className}`}>
      <div
        className={`h-full rounded-full transition-all duration-500 ${
          tone === 'aqua' ? 'bg-aqua' : 'bg-azure'
        }`}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

export function Feedback({
  correct,
  title,
  children,
  tone,
}: {
  correct?: boolean;
  title: string;
  children?: ReactNode;
  tone?: 'info' | 'warn';
}) {
  const palette =
    tone === 'info'
      ? 'border-azure/30 bg-azure/10 text-azure'
      : tone === 'warn'
        ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
        : correct
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
          : 'border-rose-500/30 bg-rose-500/10 text-rose-300';
  const Icon =
    tone === 'info' ? Info : tone === 'warn' ? TriangleAlert : correct ? CheckCircle2 : XCircle;
  return (
    <div className={`rounded-xl border p-3.5 text-sm ${palette}`}>
      <div className="flex items-start gap-2.5">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-semibold">{title}</p>
          {children && <div className="mt-0.5 text-[13px] opacity-90">{children}</div>}
        </div>
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line px-6 py-14 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-xl border border-line bg-panel2 text-aqua">
        {icon}
      </div>
      <div>
        <p className="font-semibold text-white">{title}</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-slate-400">{description}</p>
      </div>
      {action}
    </div>
  );
}
