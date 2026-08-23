/**
 * Chart primitives for the admin dashboard.
 *
 * Plain inline SVG rather than a chart library: the CSP in next.config.mjs restricts
 * script-src to 'self', the dataset is small enough that server-rendered paths are
 * simpler than a client-side renderer, and these stay Server Components (no 'use client',
 * no hydration cost) since nothing here is interactive.
 */

/** Shared palette — one hue per series, readable against the dark panels. */
export const CHART_COLORS = {
  blue:   '#5B8DEF',
  green:  '#3DD68C',
  amber:  '#F5B544',
  red:    '#F26A6A',
  violet: '#A78BFA',
  teal:   '#2DD4BF',
} as const

const GRID = '#2A3350'
const AXIS_TEXT = '#7C89AE'

function niceMax(value: number): number {
  if (value <= 0) return 1
  const magnitude = 10 ** Math.floor(Math.log10(value))
  const scaled = value / magnitude
  const step = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10
  return step * magnitude
}

type LineSeries = { label: string; color: string; values: number[] }

/** Multi-series line chart over a shared category axis. */
export function LineChart({
  labels,
  series,
  height = 220,
  valueSuffix = '',
}: {
  labels: string[]
  series: LineSeries[]
  height?: number
  valueSuffix?: string
}) {
  const W = 720
  const H = height
  const PAD = { top: 16, right: 16, bottom: 28, left: 44 }
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom

  const allValues = series.flatMap(s => s.values)
  const max = niceMax(Math.max(1, ...allValues))
  const n = labels.length

  const x = (i: number) => (n <= 1 ? PAD.left + plotW / 2 : PAD.left + (i / (n - 1)) * plotW)
  const y = (v: number) => PAD.top + plotH - (v / max) * plotH

  const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(max * f))

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[520px]" role="img">
        {ticks.map(t => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth="1" />
            <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill={AXIS_TEXT}>
              {t}
            </text>
          </g>
        ))}

        {labels.map((label, i) => (
          <text key={label} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill={AXIS_TEXT}>
            {label}
          </text>
        ))}

        {series.map(s => (
          <g key={s.label}>
            <polyline
              fill="none"
              stroke={s.color}
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ')}
            />
            {s.values.map((v, i) => (
              <circle key={i} cx={x(i)} cy={y(v)} r="3.5" fill={s.color}>
                <title>{`${labels[i]} · ${s.label}: ${v}${valueSuffix}`}</title>
              </circle>
            ))}
          </g>
        ))}
      </svg>

      <div className="flex flex-wrap gap-4 pt-2 pl-11">
        {series.map(s => (
          <span key={s.label} className="flex items-center gap-2 text-xs text-slate-400">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  )
}

/** Horizontal bars — used where labels are long (modes, achievements). */
export function BarList({
  rows,
  valueSuffix = '',
  color = CHART_COLORS.blue,
  max: explicitMax,
}: {
  rows: { label: string; value: number; hint?: string }[]
  valueSuffix?: string
  color?: string
  max?: number
}) {
  const max = explicitMax ?? Math.max(1, ...rows.map(r => r.value))

  return (
    <ul className="flex flex-col gap-3">
      {rows.map(row => (
        <li key={row.label} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1">
          <span className="truncate text-sm text-slate-300" title={row.label}>
            {row.label}
          </span>
          <span className="text-sm font-semibold tabular-nums text-slate-100">
            {row.value}{valueSuffix}
            {row.hint ? <span className="ml-2 font-normal text-slate-500">{row.hint}</span> : null}
          </span>
          <div className="col-span-2 h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full"
              style={{ width: `${(row.value / max) * 100}%`, backgroundColor: color }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

/** Vertical bars for dense category axes (hour of day, level buckets). */
export function ColumnChart({
  rows,
  height = 160,
  color = CHART_COLORS.violet,
  valueSuffix = '',
}: {
  rows: { label: string; value: number }[]
  height?: number
  color?: string
  valueSuffix?: string
}) {
  const max = Math.max(1, ...rows.map(r => r.value))

  return (
    <div className="flex items-end gap-1.5 overflow-x-auto" style={{ height }}>
      {rows.map(row => (
        <div key={row.label} className="flex min-w-[18px] flex-1 flex-col items-center gap-1.5">
          <div className="flex w-full flex-1 items-end">
            <div
              className="w-full rounded-t"
              style={{
                height: `${Math.max(row.value > 0 ? 3 : 0, (row.value / max) * 100)}%`,
                backgroundColor: row.value > 0 ? color : '#232A42',
              }}
              title={`${row.label}: ${row.value}${valueSuffix}`}
            />
          </div>
          <span className="text-[10px] tabular-nums text-slate-500">{row.label}</span>
        </div>
      ))}
    </div>
  )
}

/** Segmented bar showing how a whole splits across categories. */
export function StackedBar({
  segments,
}: {
  segments: { label: string; value: number; color: string }[]
}) {
  const total = segments.reduce((n, s) => n + s.value, 0)
  if (total === 0) return <p className="text-sm text-slate-500">Sin datos.</p>

  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-3 overflow-hidden rounded-full bg-slate-800">
        {segments.map(s => (
          <div
            key={s.label}
            style={{ width: `${(s.value / total) * 100}%`, backgroundColor: s.color }}
            title={`${s.label}: ${s.value}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {segments.map(s => (
          <span key={s.label} className="flex items-center gap-2 text-xs text-slate-400">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
            {s.label}
            <span className="font-semibold text-slate-200">{s.value}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
