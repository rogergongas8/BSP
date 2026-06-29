import Image from 'next/image'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getLevelInfo, catImagePath } from '@/lib/levels'
import type { AchievementId } from '@/lib/achievements'
import type { Tables } from '@/types/database.types'
import AchievementsGrid from './AchievementsGrid'

type Profile = Tables<'profiles'>
type UserAchievement = Tables<'user_achievements'>

const WEEK_BARS = [
  { day: 'Mon', height: 35 },
  { day: 'Tue', height: 60 },
  { day: 'Wed', height: 50 },
  { day: 'Thu', height: 90 },
  { day: 'Fri', height: 80 },
  { day: 'Sat', height: 40 },
  { day: 'Sun', height: 25 },
]

const ZAS  = '/images/profile/small-loading1.png'
const MIMO = '/images/profile/small-loading2.png'
const JAVI = '/images/profile/small-loading3.png'

const ESCRIBIENDO_TENSES = [
  { id: 'pp',  name: 'Pretérito Perfecto', accuracy: 85, barColor: 'bg-blue-500',   textColor: 'text-blue-500',   icon: ZAS },
  { id: 'imp', name: 'Imperfecto',         accuracy: 79, barColor: 'bg-red-400',    textColor: 'text-red-400',    icon: MIMO },
  { id: 'ind', name: 'Indefinido',         accuracy: 56, barColor: 'bg-orange-400', textColor: 'text-orange-400', icon: JAVI },
]

const LIO_COMBINATIONS = [
  {
    id: 'pp_ind',
    name: 'Pretérito Perfecto - Indefinido',
    accuracy: 98,
    barColor: 'bg-blue-500',
    textColor: 'text-blue-500',
    icons: [ZAS, JAVI],
  },
  {
    id: 'ind_imp',
    name: 'Indefinido - Imperfecto',
    accuracy: 67,
    barColor: 'bg-blue-500',
    textColor: 'text-blue-500',
    icons: [JAVI, MIMO],
  },
  {
    id: 'pp_ind_imp',
    name: 'P.Perfecto - Indefinido - Imperfecto',
    accuracy: 76,
    barColor: 'bg-orange-400',
    textColor: 'text-orange-400',
    icons: [ZAS, JAVI, MIMO],
  },
]

export default async function ProfilePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileRaw } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const profile = profileRaw as Profile | null
  if (!profile) redirect('/login')

  const { data: achievementsRaw } = await supabase
    .from('user_achievements')
    .select('achievement_id')
    .eq('user_id', user.id)

  const userAchievements = achievementsRaw as UserAchievement[] | null
  const unlockedIds = (userAchievements ?? []).map(r => r.achievement_id as AchievementId)
  const { level, xpInLevel, xpForNext, cat } = getLevelInfo(profile.total_xp)

  return (
    <div className="flex flex-col">

      {/* Blue header */}
      <div className="bg-bsp-blue px-5 pt-10 pb-6">

        {/* Avatar + name */}
        <div className="flex items-center gap-4 mb-5">
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-white/20">
              <Image src={catImagePath(cat)} alt="Avatar" width={80} height={80} className="w-full h-full object-contain" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-sm">
              <svg width="11" height="11" viewBox="0 0 10 10" fill="none">
                <path d="M7 1L9 3L3.5 8.5L1 9L1.5 6.5L7 1Z" stroke="#374151" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
          <div>
            <h1 className="text-white font-black text-2xl leading-tight">{profile.username}</h1>
            <div className="flex items-center gap-1.5 mt-1">
              <Image src="/images/home/streamline-plump-color_star-circle-flat.svg" alt="" width={16} height={16} />
              <span className="text-white/80 text-base font-semibold">Lvl {level}.</span>
            </div>
          </div>
        </div>

        {/* XP bar */}
        <div className="mb-5">
          <div className="h-3 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-bsp-orange rounded-full"
              style={{ width: `${(xpInLevel / xpForNext) * 100}%` }}
            />
          </div>
          <p className="text-white/50 text-xs mt-1.5 text-right">{xpInLevel} / {xpForNext} XP</p>
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0">
            <div className="flex items-center gap-1.5">
              <span className="text-base leading-none">🔥</span>
              <span className="text-white font-bold text-base">{profile.streak}</span>
            </div>
            <span className="text-white/50 text-xs">Day Streak</span>
          </div>
          <div className="flex flex-col gap-0">
            <div className="flex items-center gap-1.5">
              <span className="text-base leading-none">💎</span>
              <span className="text-white font-bold text-base">{profile.activities_completed}</span>
            </div>
            <span className="text-white/50 text-xs">Activities completed</span>
          </div>
          <div className="flex flex-col gap-0">
            <div className="flex items-center gap-1.5">
              <span className="text-base leading-none">🏆</span>
              <span className="text-white font-bold text-base">{profile.top3_finishes}</span>
            </div>
            <span className="text-white/50 text-xs">Top 3 finishes</span>
          </div>
        </div>
      </div>

      {/* Wave separator */}
      <div className="bg-bsp-blue -mb-px">
        <svg viewBox="0 0 402 36" preserveAspectRatio="none" className="w-full block h-9">
          <path d="M0,0 C67,36 134,0 201,18 C268,36 335,0 402,18 L402,36 L0,36 Z" fill="#F3F4F6" />
        </svg>
      </div>

      {/* Scrollable content */}
      <div className="bg-gray-100 px-4 pt-4 pb-28 flex flex-col gap-4">

        {/* Practice Time */}
        <div className="bg-white rounded-2xl p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
              <svg width="17" height="17" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="5.5" stroke="#9333EA" strokeWidth="1.2" />
                <path d="M7 4v3l2 1.5" stroke="#9333EA" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="font-bold text-gray-800 text-lg">Practice Time</span>
          </div>

          <div className="bg-[#FFF0EE] rounded-xl px-4 py-4 mb-5 text-center">
            <p className="font-black text-3xl text-gray-800 leading-tight">8 <span className="text-lg font-semibold">hours</span></p>
            <p className="text-gray-400 text-sm mt-0.5">Total practice time</p>
          </div>

          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-700 text-lg font-semibold">This Week</span>
            <div className="flex items-center gap-1.5 bg-gray-100 rounded-full px-3 py-1.5">
              <svg width="12" height="12" viewBox="0 0 10 10" fill="none">
                <rect x="0.5" y="1.5" width="9" height="8" rx="1.5" stroke="#6B7280" strokeWidth="1" />
                <path d="M3 0.5v2M7 0.5v2M0.5 4h9" stroke="#6B7280" strokeWidth="1" strokeLinecap="round" />
              </svg>
              <span className="text-gray-500 text-sm font-semibold">2.5h</span>
            </div>
          </div>

          <div className="flex items-end gap-1.5 h-24 mb-1.5">
            {WEEK_BARS.map(bar => (
              <div
                key={bar.day}
                className="flex-1 bg-[#2F54BA] rounded-t-sm"
                style={{ height: `${bar.height}%` }}
              />
            ))}
          </div>
          <div className="flex">
            {WEEK_BARS.map(bar => (
              <div key={bar.day} className="flex-1 text-center text-xs text-gray-400">{bar.day}</div>
            ))}
          </div>

          <div className="flex items-center gap-2 mt-4 bg-orange-50 rounded-xl px-4 py-3">
            <Image src="/images/home/fxemoji_fire.svg" alt="" width={16} height={16} />
            <span className="text-gray-600 text-sm">
              <span className="font-bold">Best day: Friday</span> · 4 activities · 32 min
            </span>
          </div>
        </div>

        {/* Accuracy */}
        <div className="bg-white rounded-2xl p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <svg width="17" height="17" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="5.5" stroke="#16A34A" strokeWidth="1.2" />
                <circle cx="7" cy="7" r="2.5" stroke="#16A34A" strokeWidth="1.2" />
                <circle cx="7" cy="7" r="0.8" fill="#16A34A" />
              </svg>
            </div>
            <span className="font-bold text-gray-800 text-lg">Accuracy</span>
          </div>

          {/* Category summary */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="border-2 border-blue-400 rounded-xl p-3 flex items-center gap-3">
              <div className="w-12 h-12 shrink-0 flex items-center justify-center">
                <Image src="/images/profile/escribiendo.png" alt="Escribiendo" width={48} height={48} className="object-contain w-full h-full" />
              </div>
              <div>
                <p className="text-2xl text-gray-800 leading-none">61 <span className="text-sm font-semibold">%</span></p>
                <p className="text-gray-400 text-xs mt-0.5">Avg Accuracy</p>
              </div>
            </div>
            <div className="border-2 border-red-400 rounded-xl p-3 flex items-center gap-3">
              <div className="w-12 h-12 shrink-0 flex items-center justify-center">
                <Image src="/images/profile/lio.png" alt="Lio de tiempos" width={48} height={48} className="object-contain w-full h-full" />
              </div>
              <div>
                <p className="text-2xl text-gray-800 leading-none">86 <span className="text-sm font-semibold">%</span></p>
                <p className="text-gray-400 text-xs mt-0.5">Avg Accuracy</p>
              </div>
            </div>
          </div>

          {/* Escribiendo tenses */}
          <div className="bg-blue-50 rounded-xl p-4 mb-3">
            <p className="font-bold text-gray-700 text-base mb-3">Escribiendo...</p>
            {ESCRIBIENDO_TENSES.map(t => (
              <div key={t.id} className="flex items-center gap-3 mb-3 last:mb-0">
                <div className="w-12 shrink-0 flex items-center justify-center">
                  <Image src={t.icon} alt={t.name} width={28} height={28} className="object-contain" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-700 text-xs font-medium mb-1">{t.name}</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-3 bg-white rounded-full overflow-hidden">
                      <div className={`h-full ${t.barColor} rounded-full`} style={{ width: `${t.accuracy}%` }} />
                    </div>
                    <span className={`text-xs font-bold ${t.textColor} shrink-0`}>{t.accuracy}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Lio de tiempos combinations */}
          <div className="bg-red-50 rounded-xl p-4">
            <p className="font-bold text-gray-700 text-base mb-3">Lío de tiempos</p>
            {LIO_COMBINATIONS.map(c => (
              <div key={c.id} className="flex items-center gap-3 mb-3 last:mb-0">
                <div className="w-12 shrink-0 flex items-center justify-center">
                  {c.icons.map((icon, idx) => (
                    <Image
                      key={idx}
                      src={icon}
                      alt=""
                      width={24}
                      height={24}
                      className={`object-contain ${idx > 0 ? '-ml-2' : ''}`}
                    />
                  ))}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-700 text-xs font-medium mb-1">{c.name}</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-3 bg-white rounded-full overflow-hidden">
                      <div className={`h-full ${c.barColor} rounded-full`} style={{ width: `${c.accuracy}%` }} />
                    </div>
                    <span className={`text-xs font-bold ${c.textColor} shrink-0`}>{c.accuracy}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Achievements */}
        <div className="bg-white rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                <svg width="17" height="17" viewBox="0 0 14 14" fill="none">
                  <path d="M3.5 1.5h7L9 7a2 2 0 01-4 0L3.5 1.5z" fill="#F97316" />
                  <path d="M1.5 2.5h2M10.5 2.5h2M7 9.5v2M5 11.5h4" stroke="#EA580C" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </div>
              <span className="font-bold text-gray-800 text-lg">Achievements</span>
            </div>
            <span className="text-gray-400 text-sm font-medium">{unlockedIds.length}/15</span>
          </div>

          <AchievementsGrid unlockedIds={unlockedIds} total={15} />
        </div>

      </div>
    </div>
  )
}
