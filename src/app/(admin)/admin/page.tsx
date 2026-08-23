import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAdminStats, COURSE_START } from '@/lib/admin-stats'
import { Panel, Stat, DataTable, Podium, scoreColor } from './components/ui'
import {
  BarList, ColumnChart, LineChart, StackedBar, Sparkline, Donut, Heatmap, CHART_COLORS,
} from './components/charts'

/**
 * Control centre — cross-user stats for the app owner.
 *
 * Always rendered fresh: the whole point is the current state of the database, so the
 * default full-route cache would serve stale numbers.
 */
export const dynamic = 'force-dynamic'

/**
 * Only these accounts may read the page. Kept as an env var so the ids are not baked into
 * the repo and can differ per environment; with none set the route redirects rather than
 * falling open — a missing config must never expose every user's data.
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

  // An unset ADMIN_USER_IDS locks the page for everyone, which from the browser is
  // indistinguishable from "not an admin" — the deploy that forgot the variable looked
  // exactly like a permissions problem. Server-side only, so it leaks nothing to the client.
  if (ADMIN_USER_IDS.length === 0) {
    console.warn('[admin] ADMIN_USER_IDS is not set — /admin is closed to everyone.')
  }

  // Same redirect for "not logged in", "not an admin" and "no admins configured": the page
  // should not confirm its own existence to anyone else.
  if (!user || !ADMIN_USER_IDS.includes(user.id)) redirect('/')

  const stats = await getAdminStats()
  const { totals, multiplayer, retention, difficulty } = stats

  const engagementRate = totals.users > 0
    ? Math.round((totals.activeUsers / totals.users) * 100)
    : 0
  const totalFailures = stats.failureReasons.reduce((n, r) => n + r.count, 0)

  const sessionTrend = stats.timeline.map(d => d.sessions)
  const itemTrend    = stats.timeline.map(d => d.items)
  const userTrend    = stats.timeline.map(d => d.activeUsers)
  const minuteTrend  = stats.timeline.map(d => d.minutes)

  const topXp   = stats.users.filter(u => u.totalXp > 0).slice(0, 3)
  const topWins = [...stats.users].filter(u => u.gamesWon > 0).sort((a, b) => b.gamesWon - a.gamesWon).slice(0, 3)
  const topAcc  = [...stats.users]
    .filter(u => u.sessions >= 3 && u.accuracyPct !== null)
    .sort((a, b) => (b.accuracyPct ?? 0) - (a.accuracyPct ?? 0))
    .slice(0, 3)

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-8 sm:px-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-white">Centro de control</h1>
        <p className="mt-1 text-sm text-slate-500">
          Desde el lunes {fmtDate(`${COURSE_START}T12:00:00`)} · actualizado {fmtDateTime(stats.generatedAt)}
        </p>
      </header>

      {/* ── Headline numbers ── */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat
          label="Usuarios"
          value={totals.users}
          hint={`${totals.activeUsers} activos · ${engagementRate}%`}
          chart={<Sparkline values={userTrend} color={CHART_COLORS.teal} width={64} />}
        />
        <Stat
          label="Sesiones"
          value={totals.sessions}
          hint={`${totals.items} respuestas`}
          chart={<Sparkline values={sessionTrend} color={CHART_COLORS.blue} width={64} />}
        />
        <Stat
          label="Precisión"
          value={`${totals.accuracyPct}%`}
          hint="singleplayer"
          accent={scoreColor(totals.accuracyPct)}
        />
        <Stat
          label="XP total"
          value={totals.xp.toLocaleString('es-ES')}
          accent={CHART_COLORS.amber}
          chart={<Sparkline values={itemTrend} color={CHART_COLORS.amber} width={64} />}
        />
        <Stat label="Partidas multi" value={totals.rooms} hint={`${totals.rounds} rondas`} />
        <Stat
          label="Tiempo jugado"
          value={`${totals.minutes} min`}
          hint={retention.avgSecondsPerItem === null ? undefined : `${retention.avgSecondsPerItem}s por respuesta`}
          chart={<Sparkline values={minuteTrend} color={CHART_COLORS.violet} width={64} />}
        />
      </div>

      <div className="flex flex-col gap-6">
        {/* ── Actividad temporal ── */}
        <Panel
          title="Actividad por día"
          subtitle={`Desde el inicio del curso, ${stats.timeline.length} días`}
        >
          <LineChart
            labels={stats.timeline.map(d => fmtDate(`${d.date}T12:00:00`))}
            series={[
              { label: 'Sesiones',   color: CHART_COLORS.blue,   values: sessionTrend },
              { label: 'Respuestas', color: CHART_COLORS.violet, values: itemTrend },
              { label: 'Usuarios',   color: CHART_COLORS.green,  values: userTrend },
              { label: 'Minutos',    color: CHART_COLORS.amber,  values: minuteTrend },
            ]}
          />
        </Panel>

        <Panel title="Mapa de actividad" subtitle="Respuestas por día — cada columna es una semana">
          <Heatmap cells={stats.heatmap} />
        </Panel>

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Hora del día" subtitle="Cuándo se completan las sesiones">
            <ColumnChart
              rows={stats.hourly.map(h => ({ label: String(h.hour), value: h.answers }))}
              valueSuffix=" sesiones"
            />
          </Panel>

          <Panel title="Niveles y participación" subtitle="Usuarios por nivel alcanzado">
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

        {/* ── Podios ── */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Panel title="Más XP" subtitle="Ranking general">
            <Podium
              entries={topXp.map(u => ({
                name: u.username,
                value: `${u.totalXp} XP`,
                hint: `Nivel ${u.level}`,
              }))}
            />
          </Panel>
          <Panel title="Más victorias" subtitle="Multijugador">
            <Podium
              entries={topWins.map(u => ({
                name: u.username,
                value: `${u.gamesWon}`,
                hint: `${u.top3} veces en top 3`,
              }))}
            />
          </Panel>
          <Panel title="Más precisos" subtitle="Mínimo 3 sesiones">
            <Podium
              entries={topAcc.map(u => ({
                name: u.username,
                value: `${u.accuracyPct}%`,
                hint: `${u.sessions} sesiones`,
              }))}
            />
          </Panel>
        </div>

        {/* ── Por qué se falla ── */}
        <Panel
          title="Por qué se falla"
          subtitle={`${totalFailures} respuestas incorrectas en multijugador, clasificadas por tipo de error`}
        >
          <div className="grid gap-8 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center">
            <Donut
              value={totals.answers - totalFailures}
              total={totals.answers}
              label={`${totals.answers - totalFailures} de ${totals.answers} correctas`}
              color={scoreColor(multiplayer.accuracyPct)}
            />
            <BarList
              color={CHART_COLORS.red}
              rows={stats.failureReasons.map(r => ({ label: r.label, value: r.count }))}
            />
          </div>
        </Panel>

        {/* ── Dificultad: verbos, personas, tipos ── */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Verbos que más fallan" subtitle="Top 10 por número de errores">
            <BarList
              color={CHART_COLORS.amber}
              rows={difficulty.verbs.map(v => ({ label: v.label, value: v.mistakes }))}
            />
          </Panel>

          <Panel title="Personas gramaticales" subtitle="Errores por persona">
            <BarList
              color={CHART_COLORS.violet}
              rows={difficulty.persons.map(p => ({ label: p.label, value: p.mistakes }))}
            />
          </Panel>
        </div>

        <Panel
          title="Tipos de conjugación"
          subtitle="Ordenado por tasa de error — errores dividido entre frases existentes de cada tipo, para que un grupo grande no parezca más difícil solo por tamaño"
        >
          <DataTable
            rows={difficulty.types}
            rowKey={t => t.label}
            empty="Sin errores registrados."
            columns={[
              { key: 'type',     header: 'Tipo',     render: t => <span className="font-mono text-slate-200">{t.label}</span> },
              { key: 'mistakes', header: 'Errores',  align: 'right', render: t => t.mistakes },
              { key: 'phrases',  header: 'Frases',   align: 'right', render: t => t.phrases },
              {
                key: 'rate',
                header: 'Tasa',
                align: 'right',
                render: t => (
                  <span style={{ color: scoreColor(100 - Math.min(100, t.ratePct * 10)) }}>
                    {t.ratePct}%
                  </span>
                ),
              },
            ]}
          />
        </Panel>

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
                {
                  key: 'acc',
                  header: 'Aciertos',
                  align: 'right',
                  render: m => (
                    <span style={{ color: m.items > 0 ? scoreColor(m.accuracyPct) : undefined }}>
                      {m.items > 0 ? `${m.accuracyPct}%` : '—'}
                    </span>
                  ),
                },
                { key: 'first',    header: 'A la 1ª',    align: 'right', render: m => (m.items > 0 ? `${m.firstTryPct}%` : '—') },
                { key: 'hint',     header: 'Con pista',  align: 'right', render: m => (m.items > 0 ? `${m.hintPct}%` : '—') },
                { key: 'skip',     header: 'Saltadas',   align: 'right', render: m => (m.items > 0 ? `${m.skipPct}%` : '—') },
                { key: 'score',    header: 'Nota media', align: 'right', render: m => (m.items > 0 ? `${m.avgScorePct}%` : '—') },
              ]}
            />
          </div>
        </Panel>

        {/* ── Retención ── */}
        <Panel
          title="Retención y ritmo"
          subtitle="Cuántos días distintos vuelve cada usuario y a qué velocidad responde"
        >
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat
              label="Vuelven otro día"
              value={retention.returningUsers}
              hint={`de ${retention.returningUsers + retention.oneDayUsers} que jugaron`}
              accent={CHART_COLORS.green}
            />
            <Stat label="Solo un día" value={retention.oneDayUsers} accent={CHART_COLORS.red} />
            <Stat
              label="Por respuesta"
              value={retention.avgSecondsPerItem === null ? '—' : `${retention.avgSecondsPerItem}s`}
              hint="singleplayer"
            />
            <Stat
              label="Puntos multi"
              value={retention.multiplayerPoints.toLocaleString('es-ES')}
              hint={`${retention.avgPointsPerAnswer} por respuesta`}
              accent={CHART_COLORS.amber}
            />
          </div>

          <ColumnChart
            rows={retention.daysActive.map(d => ({
              label: `${d.days} día${d.days === 1 ? '' : 's'}`,
              value: d.users,
            }))}
            color={CHART_COLORS.teal}
            valueSuffix=" usuarios"
          />
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
                render: u =>
                  u.accuracyPct === null ? (
                    '—'
                  ) : (
                    <span style={{ color: scoreColor(u.accuracyPct) }}>{u.accuracyPct}%</span>
                  ),
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
            <Stat
              label="Precisión"
              value={`${multiplayer.accuracyPct}%`}
              accent={scoreColor(multiplayer.accuracyPct)}
            />
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
                render: r =>
                  r.accuracyPct === null ? (
                    '—'
                  ) : (
                    <span style={{ color: scoreColor(r.accuracyPct) }}>{r.accuracyPct}%</span>
                  ),
              },
              { key: 'when',    header: 'Fecha',      align: 'right', render: r => fmtDate(r.createdAt) },
            ]}
          />
        </Panel>

        {/* ── Errores ── */}
        <Panel
          title="Frases más falladas"
          subtitle={`${totals.mistakes} errores registrados en Mis Errores`}
        >
          <div className="grid gap-8 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center">
            <Donut
              value={totals.mistakesResolved}
              total={totals.mistakes}
              label={`${totals.mistakesResolved} corregidos de ${totals.mistakes}`}
              color={CHART_COLORS.green}
            />
            <div>
              <StackedBar
                segments={[
                  { label: 'Corregidos', value: totals.mistakesResolved,                   color: CHART_COLORS.green },
                  { label: 'Pendientes', value: totals.mistakes - totals.mistakesResolved, color: CHART_COLORS.red },
                ]}
              />
            </div>
          </div>

          <div className="mt-6">
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
                    <span style={{ color: m.unresolved > 0 ? CHART_COLORS.red : CHART_COLORS.green }}>
                      {m.unresolved}
                    </span>
                  ),
                },
              ]}
            />
          </div>
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
