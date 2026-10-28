import type { Line } from '../../modules/assignment/hungarian';

export type CellTone = 'good' | 'bad' | 'zero' | 'selected' | 'warn';

interface Props {
  matrix: number[][];
  original: number[][];
  editable: boolean;
  onChange?: (row: number, col: number, value: string) => void;
  lines?: Line[];
  onToggleLine?: (line: Line) => void;
  lineSelectionEnabled?: boolean;
  assignment?: number[];
  onToggleAssignment?: (row: number, col: number) => void;
  assignmentEnabled?: boolean;
  tones?: Record<string, CellTone>;
  disabled?: boolean;
  showOriginal?: boolean;
}

export function MatrixGrid({
  matrix,
  original,
  editable,
  onChange,
  lines = [],
  onToggleLine,
  lineSelectionEnabled,
  assignment = [],
  onToggleAssignment,
  assignmentEnabled,
  tones = {},
  disabled,
  showOriginal = true,
}: Props) {
  const rowLines = new Set(lines.filter((l) => l.type === 'row').map((l) => l.index));
  const colLines = new Set(lines.filter((l) => l.type === 'col').map((l) => l.index));
  const n = matrix.length;

  return (
    <div className="scroll-thin overflow-x-auto pb-1">
      <table className="w-full min-w-[520px] border-separate border-spacing-0">
        <thead>
          <tr>
            <th className="w-20 px-2" />
            {Array.from({ length: n }, (_, c) => {
              const covered = colLines.has(c);
              return (
                <th key={c} className="px-1 py-1.5">
                  <button
                    type="button"
                    disabled={!lineSelectionEnabled || disabled}
                    onClick={() => onToggleLine?.({ type: 'col', index: c })}
                    className={`w-full rounded-lg border px-2 py-2 font-mono text-[11px] font-semibold transition ${
                      covered
                        ? 'border-aqua bg-aqua/15 text-aqua'
                        : 'border-line/60 bg-panel2/50 text-slate-300 hover:border-aqua/40'
                    } ${lineSelectionEnabled ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    D{c + 1}
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, r) => {
            const rowCovered = rowLines.has(r);
            return (
              <tr key={r}>
                <th className="px-1 py-1">
                  <button
                    type="button"
                    disabled={!lineSelectionEnabled || disabled}
                    onClick={() => onToggleLine?.({ type: 'row', index: r })}
                    className={`w-full rounded-lg border px-2 py-2 font-mono text-[11px] font-semibold transition ${
                      rowCovered
                        ? 'border-azure bg-azure/15 text-azure'
                        : 'border-line/60 bg-panel2/50 text-slate-300 hover:border-azure/40'
                    } ${lineSelectionEnabled ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    O{r + 1}
                  </button>
                </th>
                {row.map((value, c) => {
                  const key = `${r}-${c}`;
                  const tone = tones[key];
                  const isSelected = assignment[r] === c;
                  const covered = rowCovered || colLines.has(c);
                  const double = rowCovered && colLines.has(c);
                  const zero = value === 0;
                  return (
                    <td key={c} className="px-1 py-1">
                      <div
                        onClick={() => {
                          if (assignmentEnabled && !disabled && zero) onToggleAssignment?.(r, c);
                        }}
                        className={`relative min-h-[58px] rounded-lg border p-1.5 transition ${
                          tone === 'bad'
                            ? 'border-rose-500/60 bg-rose-500/10 ring-1 ring-rose-500/30'
                            : tone === 'good'
                              ? 'border-emerald-500/50 bg-emerald-500/10'
                              : isSelected
                                ? 'border-aqua bg-aqua/15 ring-1 ring-aqua/40'
                                : double
                                  ? 'border-amber-400/40 bg-amber-400/[0.07]'
                                  : covered
                                    ? 'border-azure/25 bg-azure/[0.04]'
                                    : zero
                                      ? 'border-aqua/20 bg-aqua/[0.04]'
                                      : 'border-line/60 bg-panel2/40'
                        } ${assignmentEnabled && zero && !disabled ? 'cursor-pointer hover:border-aqua/50' : ''}`}
                      >
                        {editable && !disabled ? (
                          <input
                            type="number"
                            step={1}
                            value={Number.isFinite(value) ? value : ''}
                            onChange={(event) => onChange?.(r, c, event.target.value)}
                            className="cell-input !h-9 !border-transparent !bg-transparent !px-0 !text-base focus:!border-aqua/50"
                            aria-label={`Celda O${r + 1} D${c + 1}`}
                          />
                        ) : (
                          <div className="flex h-9 items-center justify-center">
                            <span
                              className={`font-mono text-base font-semibold ${
                                zero ? 'text-aqua' : 'text-slate-200'
                              }`}
                            >
                              {value}
                            </span>
                          </div>
                        )}
                        {showOriginal && (
                          <p className="text-center font-mono text-[9px] text-slate-600">
                            orig {original[r][c]}
                          </p>
                        )}
                        {isSelected && (
                          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-aqua shadow-[0_0_8px_rgba(45,212,191,.8)]" />
                        )}
                        {zero && !editable && <span className="absolute left-1.5 top-1 text-[8px] font-bold text-aqua/60">0</span>}
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
