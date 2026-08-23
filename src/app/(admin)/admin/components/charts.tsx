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

/** Compact trend line for stat cards — no axes, just the shape of the series. */
export function Sparkline({
  values,
  color = CHART_COLORS.blue,
  width = 96,
  height = 28,
}: {
  values: number[]
  color?: string
  width?: number
  height?: number
}) {
  if (values.length < 2) return null

  const max = Math.max(...values, 1)
  const stepX = width / (values.length - 1)
  const y = (v: number) => height - 2 - (v / max) * (height - 4)
  const points = values.map((v, i) => `${i * stepX},${y(v)}`).join(' ')

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <polyline
        points={`0,${height} ${points} ${width},${height}`}
        fill={color}
        fillOpacity="0.12"
        stroke="none"
      />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.75"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** Ring chart for a single proportion. Reads faster than a bar for "X of Y". */
export function Donut({
  value,
  total,
  label,
  color = CHART_COLORS.green,
  size = 128,
}: {
  value: number
  total: number
  label?: string
  color?: string
  size?: number
}) {
  const stroke = 12
  const r = (size - stroke) / 2
  const circumference = 2 * Math.PI * r
  const ratio = total > 0 ? value / total : 0
  const percent = Math.round(ratio * 100)

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#232A42" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference * ratio} ${circumference}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={size * 0.22}
          fontWeight="700"
          fill="#E8ECF7"
        >
          {percent}%
        </text>
      </svg>
      {label ? <p className="text-center text-xs text-slate-400">{label}</p> : null}
    </div>
  )
}

const WEEKDAY_INITIALS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

/**
 * GitHub-style calendar heatmap. Columns are weeks, rows are weekdays starting Monday —
 * which lines up because the course starts on a Monday.
 */
export function Heatmap({
  cells,
  color = CHART_COLORS.green,
}: {
  cells: { date: string; weekday: number; week: number; items: number }[]
  color?: string
}) {
  if (cells.length === 0) return <p className="text-sm text-slate-500">Sin datos.</p>

  const max = Math.max(1, ...cells.map(c => c.items))
  const weeks = Math.max(...cells.map(c => c.week)) + 1
  const byKey = new Map(cells.map(c => [`${c.week}:${c.weekday}`, c]))

  const CELL = 22
  const GAP = 4

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-2">
        <div className="flex flex-col" style={{ gap: GAP }}>
          {WEEKDAY_INITIALS.map(d => (
            <span
              key={d}
              className="text-[10px] leading-none text-slate-600"
              style={{ height: CELL, lineHeight: `${CELL}px` }}
            >
              {d}
            </span>
          ))}
        </div>

        <div className="flex" style={{ gap: GAP }}>
          {Array.from({ length: weeks }, (_, w) => (
            <div key={w} className="flex flex-col" style={{ gap: GAP }}>
              {Array.from({ length: 7 }, (_, d) => {
                const cell = byKey.get(`${w}:${d}`)
                const intensity = cell ? cell.items / max : 0
                return (
                  <div
                    key={d}
                    className="rounded-[4px]"
                    style={{
                      width: CELL,
                      height: CELL,
                      backgroundColor: !cell
                        ? 'transparent'
                        : cell.items === 0
                          ? '#1B2237'
                          : color,
                      opacity: !cell ? 0 : cell.items === 0 ? 1 : 0.25 + intensity * 0.75,
                    }}
                    title={cell ? `${cell.date}: ${cell.items} respuestas` : ''}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-500">
        <span>Menos</span>
        {[0, 0.25, 0.5, 0.75, 1].map(o => (
          <span
            key={o}
            className="h-3 w-3 rounded-[3px]"
            style={{ backgroundColor: o === 0 ? '#1B2237' : color, opacity: o === 0 ? 1 : 0.25 + o * 0.75 }}
          />
        ))}
        <span>Más</span>
      </div>
    </div>
  )
}
