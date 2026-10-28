import { Check, Lock } from 'lucide-react';
import type { Cell, TransportationInstance, TransportState } from '../../types/transportation';
import type { Line } from '../../modules/transportation/vogel';

interface Props {
  instance: TransportationInstance;
  state: TransportState;
  pending: { cell: Cell; amount: string } | null;
  onSelectCell: (cell: Cell) => void;
  onAmountChange: (amount: string) => void;
  disabled?: boolean;
  badCell?: Cell | null;
  lastCell?: Cell | null;
  vogel?: {
    penalties: { rows: Array<number | null>; cols: Array<number | null> } | null;
    selectedLine: Line | null;
    onSelectLine?: (line: Line) => void;
    lineSelectionEnabled: boolean;
  };
}

export function TransportGrid({
  instance,
  state,
  pending,
  onSelectCell,
  onAmountChange,
  disabled,
  badCell,
  lastCell,
  vogel,
}: Props) {
  const isBad = (r: number, c: number) => badCell?.row === r && badCell?.col === c;
  const isLast = (r: number, c: number) => lastCell?.row === r && lastCell?.col === c;
  const allocationAt = (r: number, c: number) =>
    state.allocations.find((a) => a.row === r && a.col === c);
  const rowSatisfied = (r: number) => state.supply[r] === 0;
  const colSatisfied = (c: number) => state.demand[c] === 0;
  const rowLine = (r: number) =>
    vogel?.selectedLine?.type === 'row' && vogel.selectedLine.index === r;
  const colLine = (c: number) =>
    vogel?.selectedLine?.type === 'col' && vogel.selectedLine.index === c;

  return (
    <div className="scroll-thin overflow-x-auto pb-1">
      <table className="w-full min-w-[560px] border-separate border-spacing-0">
        <thead>
          <tr>
            <th className="w-24 px-2 py-2" />
            {instance.costs[0].map((_, c) => {
              const active = state.demand[c] > 0;
              const lineCol = colLine(c);
              return (
                <th key={c} className="px-1.5 py-2 align-bottom">
                  <button
                    type="button"
                    disabled={!vogel?.lineSelectionEnabled || !active}
                    onClick={() => vogel?.onSelectLine?.({ type: 'col', index: c })}
                    className={`group w-full rounded-lg border px-2 py-2 text-center transition ${
                      lineCol
                        ? 'border-aqua bg-aqua/10 text-aqua'
                        : colSatisfied(c)
                          ? 'border-line/40 bg-ink/40 text-slate-600'
                          : 'border-line/60 bg-panel2/50 text-slate-300 hover:border-aqua/40'
                    } ${vogel?.lineSelectionEnabled && active ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <span className="block font-mono text-[11px] font-semibold">D{c + 1}</span>
                    <span className="mt-0.5 block text-[10px] text-slate-500">
                      {state.demand[c]}
                      {state.demand[c] !== instance.demand[c] && (
                        <span className="text-slate-600"> / {instance.demand[c]}</span>
                      )}
                    </span>
                    {vogel?.penalties && (
                      <span
                        className={`mt-1 inline-flex min-w-5 items-center justify-center rounded px-1 py-0.5 font-mono text-[10px] ${
                          vogel.penalties.cols[c] === null
                            ? 'text-slate-600'
                            : 'bg-azure/10 text-azure'
                        }`}
                      >
                        {vogel.penalties.cols[c] === null ? '—' : vogel.penalties.cols[c]}
                      </span>
                    )}
                    {colSatisfied(c) && (
                      <span className="mt-1 flex items-center justify-center gap-0.5 text-[9px] uppercase tracking-wide text-slate-500">
                        <Check size={9} /> cubierta
                      </span>
                    )}
                  </button>
                </th>
              );
            })}
            <th className="px-2 py-2 text-left">
              <span className="label">Oferta</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {instance.costs.map((row, r) => {
            const active = state.supply[r] > 0;
            const lineRow = rowLine(r);
            return (
              <tr key={r}>
                <th className="px-1.5 py-1.5 text-left align-middle">
                  <button
                    type="button"
                    disabled={!vogel?.lineSelectionEnabled || !active}
                    onClick={() => vogel?.onSelectLine?.({ type: 'row', index: r })}
                    className={`w-full rounded-lg border px-2 py-2 text-left transition ${
                      lineRow
                        ? 'border-azure bg-azure/10 text-azure'
                        : rowSatisfied(r)
                          ? 'border-line/40 bg-ink/40 text-slate-600'
                          : 'border-line/60 bg-panel2/50 text-slate-300 hover:border-azure/40'
                    } ${vogel?.lineSelectionEnabled && active ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <span className="flex items-center justify-between gap-1">
                      <span className="font-mono text-[11px] font-semibold">O{r + 1}</span>
                      {vogel?.penalties && (
                        <span
                          className={`rounded px-1 py-0.5 font-mono text-[10px] ${
                            vogel.penalties.rows[r] === null
                              ? 'text-slate-600'
                              : 'bg-aqua/10 text-aqua'
                          }`}
                        >
                          {vogel.penalties.rows[r] === null ? '—' : vogel.penalties.rows[r]}
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-slate-500">
                      {state.supply[r]}
                      {state.supply[r] !== instance.supply[r] && (
                        <span className="text-slate-600"> / {instance.supply[r]}</span>
                      )}
                    </span>
                    {rowSatisfied(r) && (
                      <span className="mt-1 flex items-center gap-0.5 text-[9px] uppercase tracking-wide text-slate-500">
                        <Check size={9} /> cubierta
                      </span>
                    )}
                  </button>
                </th>
                {row.map((cost, c) => {
                  const allocation = allocationAt(r, c);
                  const available = state.supply[r] > 0 && state.demand[c] > 0;
                  const selected = pending?.cell.row === r && pending?.cell.col === c;
                  const bad = isBad(r, c);
                  const last = isLast(r, c);
                  const maxAmount = Math.min(state.supply[r], state.demand[c]);
                  const activeRowOrCol =
                    !!pending && (pending.cell.row === r || pending.cell.col === c);
                  return (
                    <td key={c} className="px-1 py-1.5">
                      <div
                        onClick={() => {
                          if (!disabled && available && !allocation) onSelectCell({ row: r, col: c });
                        }}
                        className={`relative min-h-[68px] rounded-lg border p-1.5 transition ${
                          bad
                            ? 'border-rose-500/60 bg-rose-500/10 ring-1 ring-rose-500/30'
                            : last
                              ? 'border-aqua/60 bg-aqua/[0.06]'
                              : selected
                                ? 'border-azure/70 bg-azure/[0.08] ring-1 ring-azure/30'
                                : rowLine(r) || colLine(c)
                                  ? 'border-aqua/30 bg-aqua/[0.04]'
                                  : activeRowOrCol
                                    ? 'border-azure/30 bg-azure/[0.05]'
                                    : available
                                      ? 'border-line/70 bg-panel2/40 hover:border-slate-500/60'
                                      : 'border-line/30 bg-ink/50'
                        } ${available && !disabled && !allocation ? 'cursor-pointer' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span
                            className={`font-mono text-[10px] ${
                              available ? 'text-slate-500' : 'text-slate-700'
                            }`}
                          >
                            c={cost}
                          </span>
                          {!available && !allocation && <Lock size={10} className="text-slate-700" />}
                        </div>
                        {allocation ? (
                          <div className="mt-2 flex items-center justify-center">
                            <span className="rounded-md bg-aqua/15 px-2 py-1 font-mono text-sm font-semibold text-aqua">
                              {allocation.amount}
                            </span>
                          </div>
                        ) : selected ? (
                          <input
                            autoFocus
                            type="number"
                            min={1}
                            max={maxAmount}
                            step={1}
                            value={pending.amount}
                            disabled={disabled}
                            onChange={(event) => onAmountChange(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                (event.currentTarget as HTMLInputElement).blur();
                              }
                            }}
                            className="cell-input mt-1.5 !h-8 !border-azure/60 !text-sm"
                            placeholder="0"
                            aria-label={`Cantidad en O${r + 1} D${c + 1}`}
                          />
                        ) : (
                          <div className="mt-3 text-center text-[10px] text-slate-600">
                            {available ? 'clic para asignar' : 'bloqueada'}
                          </div>
                        )}
                        {selected && (
                          <div className="mt-1 text-center text-[9px] text-azure/80">
                            máx. {maxAmount}
                          </div>
                        )}
                      </div>
                    </td>
                  );
                })}
                <td className="px-2 py-1.5">
                  <div className="rounded-lg border border-line/50 bg-ink/30 px-2 py-2 text-center">
                    <p className="font-mono text-sm font-semibold text-slate-200">
                      {state.supply[r]}
                    </p>
                    <p className="text-[9px] uppercase tracking-wide text-slate-600">restante</p>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <th className="px-2 py-2 text-left">
              <span className="label">Demanda</span>
            </th>
            {state.demand.map((value, c) => (
              <td key={c} className="px-1 py-2">
                <div className="rounded-lg border border-line/50 bg-ink/30 px-2 py-1.5 text-center">
                  <p className="font-mono text-xs font-semibold text-slate-200">{value}</p>
                  <p className="text-[9px] text-slate-600">restante</p>
                </div>
              </td>
            ))}
            <td className="px-2 py-2">
              <div className="text-center text-[10px] text-slate-500">
                Total
                <div className="font-mono text-xs text-slate-300">
                  {state.allocations.reduce((t, a) => t + a.amount, 0)}
                </div>
              </div>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
