import { cn } from '@/lib/utils'

/** A titled section of the dashboard. */
export function Panel({
  title,
  subtitle,
  children,
  className,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn('rounded-2xl border border-slate-800 bg-slate-900/60 p-5', className)}>
      <header className="mb-4">
        <h2 className="text-sm font-semibold tracking-wide text-slate-200 uppercase">{title}</h2>
        {subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}
      </header>
      {children}
    </section>
  )
}

/** Single headline number with a label, optional secondary line and trend sparkline. */
export function Stat({
  label,
  value,
  hint,
  accent,
  chart,
}: {
  label: string
  value: string | number
  hint?: string
  accent?: string
  chart?: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3.5">
      <p className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">{label}</p>
      <div className="mt-1 flex items-end justify-between gap-2">
        <p className="text-2xl font-bold tabular-nums" style={{ color: accent ?? '#E8ECF7' }}>
          {value}
        </p>
        {chart ? <div className="shrink-0 pb-0.5">{chart}</div> : null}
      </div>
      {hint ? <p className="mt-0.5 text-xs text-slate-500">{hint}</p> : null}
    </div>
  )
}

/**
 * Colour for a percentage where higher is better. Used to make accuracy columns readable
 * at a glance instead of forcing a comparison of similar-looking numbers.
 */
export function scoreColor(percent: number): string {
  if (percent >= 90) return '#3DD68C'
  if (percent >= 75) return '#A3D956'
  if (percent >= 60) return '#F5B544'
  return '#F26A6A'
}

/** Top-3 ranking with medals. */
export function Podium({
  entries,
}: {
  entries: { name: string; value: string; hint?: string }[]
}) {
  const MEDALS = ['🥇', '🥈', '🥉']

  return (
    <ol className="flex flex-col gap-2">
      {entries.slice(0, 3).map((e, i) => (
        <li
          key={e.name}
          className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2.5"
        >
          <span className="text-lg leading-none">{MEDALS[i]}</span>
          <span className="min-w-0 flex-1 truncate font-semibold text-slate-100">{e.name}</span>
          <span className="text-right">
            <span className="block text-sm font-bold tabular-nums text-slate-100">{e.value}</span>
            {e.hint ? <span className="block text-[11px] text-slate-500">{e.hint}</span> : null}
          </span>
        </li>
      ))}
    </ol>
  )
}

type Column<T> = {
  key: string
  header: string
  align?: 'left' | 'right'
  render: (row: T) => React.ReactNode
}

/** Compact data table. Scrolls horizontally rather than letting the page overflow. */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  empty = 'Sin datos.',
}: {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  empty?: string
}) {
  if (rows.length === 0) return <p className="text-sm text-slate-500">{empty}</p>

  return (
    <div className="-mx-5 overflow-x-auto px-5">
      <table className="w-full min-w-[560px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-800">
            {columns.map(col => (
              <th
                key={col.key}
                className={cn(
                  'pb-2 text-[11px] font-semibold tracking-wide text-slate-500 uppercase',
                  col.align === 'right' ? 'text-right' : 'text-left'
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={rowKey(row)} className="border-b border-slate-800/50 last:border-0">
              {columns.map(col => (
                <td
                  key={col.key}
                  className={cn(
                    'py-2.5 text-slate-300',
                    col.align === 'right' ? 'text-right tabular-nums' : 'text-left'
                  )}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
