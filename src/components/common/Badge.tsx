import type { ReactNode } from 'react';

const tones = {
  neutral: 'border-line bg-panel2 text-slate-300',
  aqua: 'border-aqua/25 bg-aqua/10 text-aqua',
  azure: 'border-azure/25 bg-azure/10 text-azure',
  emerald: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
  amber: 'border-amber-500/25 bg-amber-500/10 text-amber-300',
  rose: 'border-rose-500/25 bg-rose-500/10 text-rose-300',
};

export function Badge({
  children,
  tone = 'neutral',
  className = '',
}: {
  children: ReactNode;
  tone?: keyof typeof tones;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
