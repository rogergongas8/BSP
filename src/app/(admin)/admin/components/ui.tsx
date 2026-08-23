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

/** Single headline number with a label and optional secondary line. */
export function Stat({
  label,
  value,
  hint,
  accent,
}: {
  label: string
  value: string | number
  hint?: string
  accent?: string
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3.5">
      <p className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums" style={{ color: accent ?? '#E8ECF7' }}>
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-xs text-slate-500">{hint}</p> : null}
    </div>
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
