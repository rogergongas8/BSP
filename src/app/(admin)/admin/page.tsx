import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAdminStats } from '@/lib/admin-stats'
import { Panel, Stat, DataTable } from './components/ui'
import { BarList, ColumnChart, LineChart, StackedBar, CHART_COLORS } from './components/charts'

/**
 * Control centre — cross-user stats for the app owner.
 *
 * Always rendered fresh: the whole point is the current state of the database, so the
 * default full-route cache would serve stale numbers.
 */
export const dynamic = 'force-dynamic'

/**
 * Only this account may read the page. Kept as an env var so the id is not baked into the
 * repo and can differ per environment; with none set the route 404s rather than falling
 * open — a missing config must never expose every user's data.
 */
const ADMIN_USER_IDS = (process.env.ADMIN_USER_IDS ?? '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-ES', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Same 404 for "not logged in", "not an admin" and "no admins configured": the page
  // should not confirm its own existence to anyone else.
  if (!user || !ADMIN_USER_IDS.includes(user.id)) redirect('/')

  const stats = await getAdminStats()
  const { totals, multiplayer } = stats

  const engagementRate = totals.users > 0
    ? Math.round((totals.activeUsers / totals.users) * 100)
    : 0
  const resolvedRate = totals.mistakes > 0
    ? Math.round((totals.mistakesResolved / totals.mistakes) * 100)
    : 0

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-8 sm:px-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-white">Centro de control</h1>
        <p className="mt-1 text-sm text-slate-500">
          Datos en vivo · actualizado {fmtDateTime(stats.generatedAt)}
        </p>
      </header>

      {/* ── Headline numbers ── */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat
          label="Usuarios"
          value={totals.users}
          hint={`${totals.activeUsers} activos · ${engagementRate}%`}
        />
        <Stat label="Sesiones" value={totals.sessions} hint={`${totals.items} respuestas`} />
        <Stat
          label="Precisión"
          value={`${totals.accuracyPct}%`}
          hint="singleplayer"
          accent={CHART_COLORS.green}
        />
        <Stat label="XP total" value={totals.xp.toLocaleString('es-ES')} accent={CHART_COLORS.amber} />
        <Stat label="Partidas multi" value={totals.rooms} hint={`${totals.rounds} rondas`} />
        <Stat label="Tiempo jugado" value={`${totals.minutes} min`} hint={`${Math.round(totals.minutes / 60)} h`} />
      </div>

      <div className="flex flex-col gap-6">
        {/* ── Actividad temporal ── */}
        <Panel
          title="Actividad por día"
          subtitle="Sesiones completadas, respuestas y usuarios únicos activos"
        >
          {stats.timeline.length > 0 ? (
            <LineChart
              labels={stats.timeline.map(d => fmtDate(`${d.date}T12:00:00`))}
              series={[
                { label: 'Sesiones',       color: CHART_COLORS.blue,   values: stats.timeline.map(d => d.sessions) },
                { label: 'Respuestas',     color: CHART_COLORS.violet, values: stats.timeline.map(d => d.items) },
                { label: 'Usuarios',       color: CHART_COLORS.green,  values: stats.timeline.map(d => d.activeUsers) },
                { label: 'Minutos',        color: CHART_COLORS.amber,  values: stats.timeline.map(d => d.minutes) },
              ]}
            />
          ) : (
            <p className="text-sm text-slate-500">Sin actividad registrada.</p>
          )}
        </Panel>

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Hora del día" subtitle="Cuándo se completan las sesiones">
            <ColumnChart
              rows={stats.hourly.map(h => ({ label: String(h.hour), value: h.answers }))}
              valueSuffix=" sesiones"
            />
          </Panel>

          <Panel title="Distribución de niveles" subtitle="Usuarios por nivel alcanzado">
            <ColumnChart
              rows={stats.levelDistribution.map(l => ({ label: `L${l.level}`, value: l.users }))}
              color={CHART_COLORS.teal}
              valueSuffix=" usuarios"
            />
            <div className="mt-5">
              <StackedBar
                segments={[
                  { label: 'Han jugado',    value: totals.activeUsers, color: CHART_COLORS.green },
                  { label: 'Nunca jugaron', value: totals.neverPlayed, color: '#3A4260' },
                ]}
              />
            </div>
          </Panel>
        </div>

        {/* ── Rendimiento por modo ── */}
        <Panel
          title="Rendimiento por modo"
          subtitle="Los 6 modos: volumen, precisión y en cuáles se pide más ayuda"
        >
          <div className="grid gap-6 lg:grid-cols-2">
            <BarList
              rows={stats.modes.map(m => ({
                label: m.label,
                value: m.sessions,
                hint: `${m.items} resp.`,
              }))}
              color={CHART_COLORS.blue}
            />
            <BarList
              rows={stats.modes.map(m => ({ label: m.label, value: m.accuracyPct }))}
              valueSuffix="%"
              color={CHART_COLORS.green}
              max={100}
            />
          </div>

          <div className="mt-6">
            <DataTable
              rows={stats.modes}
              rowKey={m => m.mode}
              columns={[
                { key: 'label',    header: 'Modo',       render: m => <span className="font-medium text-slate-200">{m.label}</span> },
                { key: 'sessions', header: 'Partidas',   align: 'right', render: m => m.sessions },
                { key: 'items',    header: 'Respuestas', align: 'right', render: m => m.items },
                { key: 'acc',      header: 'Aciertos',   align: 'right', render: m => `${m.accuracyPct}%` },
                { key: 'first',    header: 'A la 1ª',    align: 'right', render: m => `${m.firstTryPct}%` },
                { key: 'hint',     header: 'Con pista',  align: 'right', render: m => `${m.hintPct}%` },
                { key: 'skip',     header: 'Saltadas',   align: 'right', render: m => `${m.skipPct}%` },
                { key: 'score',    header: 'Nota media', align: 'right', render: m => `${m.avgScorePct}%` },
              ]}
            />
          </div>
        </Panel>

        {/* ── Usuarios ── */}
        <Panel title="Usuarios" subtitle={`${totals.users} perfiles, ordenados por XP`}>
          <DataTable
            rows={stats.users}
            rowKey={u => u.id}
            columns={[
              {
                key: 'user',
                header: 'Usuario',
                render: u => (
                  <span className={u.totalXp === 0 ? 'text-slate-500' : 'font-medium text-slate-100'}>
                    {u.username}
                  </span>
                ),
              },
              { key: 'level',   header: 'Nivel',     align: 'right', render: u => u.level },
              { key: 'xp',      header: 'XP',        align: 'right', render: u => u.totalXp },
              { key: 'streak',  header: 'Racha',     align: 'right', render: u => u.streak },
              { key: 'sess',    header: 'Sesiones',  align: 'right', render: u => u.sessions },
              {
                key: 'acc',
                header: 'Aciertos',
                align: 'right',
                render: u => (u.accuracyPct === null ? '—' : `${u.accuracyPct}%`),
              },
              { key: 'won',     header: 'Victorias', align: 'right', render: u => u.gamesWon },
              { key: 'top3',    header: 'Top 3',     align: 'right', render: u => u.top3 },
              { key: 'retos',   header: 'Retos',     align: 'right', render: u => u.dailyChallenges },
              { key: 'ach',     header: 'Logros',    align: 'right', render: u => u.achievements },
              {
                key: 'last',
                header: 'Últ. actividad',
                align: 'right',
                render: u => (u.lastActivityDate ? fmtDate(`${u.lastActivityDate}T12:00:00`) : '—'),
              },
            ]}
          />
        </Panel>

        {/* ── Multijugador ── */}
        <Panel
          title="Multijugador"
          subtitle={`${totals.rooms} salas · ${totals.rounds} rondas · ${totals.answers} respuestas`}
        >
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Precisión" value={`${multiplayer.accuracyPct}%`} accent={CHART_COLORS.green} />
            <Stat
              label="Tiempo medio"
              value={multiplayer.avgResponseMs === null ? '—' : `${(multiplayer.avgResponseMs / 1000).toFixed(1)}s`}
              hint={multiplayer.fastestMs === null ? undefined : `mín ${(multiplayer.fastestMs / 1000).toFixed(1)}s`}
            />
            <Stat label="Jugadores/sala" value={multiplayer.avgPlayersPerRoom} />
            <Stat label="Salas acabadas" value={`${multiplayer.finishedRooms}/${totals.rooms}`} />
          </div>

          {multiplayer.answersByRoundNumber.length > 0 ? (
            <div className="mb-6">
              <p className="mb-3 text-xs text-slate-500">
                Precisión por número de ronda — si cae al final, las partidas son demasiado largas
              </p>
              <LineChart
                height={180}
                valueSuffix="%"
                labels={multiplayer.answersByRoundNumber.map(r => `R${r.round}`)}
                series={[
                  {
                    label: 'Aciertos %',
                    color: CHART_COLORS.green,
                    values: multiplayer.answersByRoundNumber.map(r => r.accuracyPct),
                  },
                ]}
              />
            </div>
          ) : null}

          <DataTable
            rows={stats.rooms.slice(0, 20)}
            rowKey={r => r.code}
            columns={[
              { key: 'code',    header: 'Código',     render: r => <span className="font-mono text-slate-200">{r.code}</span> },
              {
                key: 'type',
                header: 'Modo',
                render: r => (
                  <span>
                    {r.gameType}
                    <span className="ml-2 text-xs text-slate-500">{r.family}</span>
                  </span>
                ),
              },
              { key: 'status',  header: 'Estado',     render: r => r.status },
              { key: 'players', header: 'Jugadores',  align: 'right', render: r => r.players },
              { key: 'rounds',  header: 'Rondas',     align: 'right', render: r => r.rounds },
              { key: 'answers', header: 'Respuestas', align: 'right', render: r => r.answers },
              {
                key: 'acc',
                header: 'Aciertos',
                align: 'right',
                render: r => (r.accuracyPct === null ? '—' : `${r.accuracyPct}%`),
              },
              { key: 'when',    header: 'Fecha',      align: 'right', render: r => fmtDate(r.createdAt) },
            ]}
          />
        </Panel>

        {/* ── Errores ── */}
        <Panel
          title="Frases más falladas"
          subtitle={`${totals.mistakes} errores registrados · ${resolvedRate}% ya corregidos`}
        >
          <div className="mb-5">
            <StackedBar
              segments={[
                { label: 'Corregidos',  value: totals.mistakesResolved,                  color: CHART_COLORS.green },
                { label: 'Pendientes',  value: totals.mistakes - totals.mistakesResolved, color: CHART_COLORS.red },
              ]}
            />
          </div>

          <DataTable
            rows={stats.topMistakes}
            rowKey={m => `${m.mode}:${m.sentence}`}
            empty="Todavía no hay errores registrados."
            columns={[
              {
                key: 'sentence',
                header: 'Frase',
                render: m => <span className="text-slate-200">{m.sentence}</span>,
              },
              { key: 'mode',       header: 'Modo',       render: m => <span className="text-slate-500">{m.label}</span> },
              { key: 'total',      header: 'Fallos',     align: 'right', render: m => m.total },
              {
                key: 'unresolved',
                header: 'Sin corregir',
                align: 'right',
                render: m => (
                  <span style={{ color: m.unresolved > 0 ? CHART_COLORS.red : undefined }}>
                    {m.unresolved}
                  </span>
                ),
              },
            ]}
          />
        </Panel>

        {/* ── Logros ── */}
        <Panel title="Logros" subtitle="Cuántos usuarios han desbloqueado cada uno">
          <BarList
            color={CHART_COLORS.amber}
            max={totals.users}
            rows={stats.achievements.map(a => ({
              label: a.name,
              value: a.unlocked,
              hint: a.description,
            }))}
          />
        </Panel>
      </div>
    </div>
  )
}
