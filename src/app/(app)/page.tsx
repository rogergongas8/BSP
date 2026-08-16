import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getLevelInfo, catImagePath } from '@/lib/levels'
import { resolveAvatarPath } from '@/lib/avatars'
import ActivityCard from './ActivityCard'
import LogoutButton from './LogoutButton'
import NotificationQueue from './NotificationQueue'
import OverscrollColor from '@/components/overscroll-color'
import {
  challengeProgress as challengeProgressFor,
  challengeTargetCount,
  dayNumber,
  difficultyForDay,
  pickChallenge,
} from '@/lib/daily-challenges'

const CAT_POSITIONS = [
  { cat: 'absolute -top-5 right-4 w-[60px] h-[60px] z-20', xp: 'absolute top-7 right-4 z-10' },
  { cat: 'absolute -top-5 -right-1 w-[38px] h-[38px] z-20 rotate-[20deg]', xp: 'absolute top-2 -right-3 z-10 rotate-[20deg]' },
  { cat: 'absolute -bottom-3 right-1 w-[52px] h-[52px] z-20', xp: 'absolute -top-2 -right-1 z-10 rotate-[20deg]' },
] as const

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let streak = 0
  let level = 1
  let avatarSrc = '/images/nav/user-image.svg'

  const today = dayNumber()
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  // The challenge depends on the user's level, so the profile has to come back first; the
  // pool query is unfiltered and independent, so both still go out together.
  const [{ data: challengePool }, { data: profile }] = await Promise.all([
    supabase.from('daily_challenges').select('*'),
    user
      ? supabase.from('profiles').select('streak, total_xp, avatar_id').eq('id', user.id).single()
      : Promise.resolve({ data: null, error: null }),
  ])

  if (profile) {
    streak = profile.streak
    const info = getLevelInfo(profile.total_xp)
    level = info.level
    avatarSrc = resolveAvatarPath(profile.avatar_id, catImagePath(info.cat))
  }

  // Today's challenge: difficulty follows the user's level, then one is drawn from that
  // block. Signed-out visitors have no level, so they see the easy rotation.
  const difficulty = difficultyForDay(level, today)
  const challenge = pickChallenge(
    (challengePool ?? []).filter(c => c.difficulty === difficulty),
    user?.id ?? 'anonymous',
    today
  )

  let challengeProgress = 0
  const challengeTarget = challenge ? challengeTargetCount(challenge) : 3

  if (user && challenge) {
    const { data: todaySessions } = await supabase
      .from('practice_sessions')
      .select('tense, total, correct, first_try, with_hints, skipped, half_correct')
      .eq('user_id', user.id)
      .gte('completed_at', todayStart.toISOString())

    challengeProgress = Math.min(
      challengeProgressFor(challenge, todaySessions ?? []),
      challengeTarget
    )
  }

  const progressPct = challengeTarget > 0 ? challengeProgress / challengeTarget : 0
  const CIRCUMFERENCE = 119.38
  const dashOffset = CIRCUMFERENCE * (1 - progressPct)

  // Cat artwork rotates through its three poses on the same daily clock as the challenge,
  // so the card's illustration changes with the challenge it belongs to.
  const pos = CAT_POSITIONS[today % CAT_POSITIONS.length]

  return (
    <div className="flex flex-col">
      <OverscrollColor top="#2F54BA" bottom="#F3F4F6" />

      {/* ── Blue header ── */}
      <div className="bg-bsp-blue px-5 pt-8">

        {/* User row */}
        <div className="flex items-center justify-between mb-5">
          <Link
            href="/profile"
            className="relative w-9 h-9 shrink-0"
          >
            <Image
              src={avatarSrc}
              alt="Avatar"
              fill
              sizes="36px"
              className="object-contain"
            />
          </Link>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white/15 rounded-full px-2.5 py-1">
              <Image src="/images/home/fxemoji_fire.svg" alt="Racha" width={16} height={16} />
              <span className="text-white text-xs font-semibold">{streak}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/15 rounded-full px-2.5 py-1">
              <Image src="/images/home/streamline-plump-color_star-circle-flat.svg" alt="Nivel" width={16} height={16} />
              <span className="text-white text-xs font-semibold">Lvl {level}.</span>
            </div>
            <LogoutButton />
          </div>
        </div>

        {/* Today's challenge card */}
        <div className="relative mb-8">
          {/* Cat character — rotates position every 24 h */}
          <div className={pos.cat}>
            <Image
              src="/images/home/avatar.svg"
              alt="Cat"
              fill
              className="object-contain drop-shadow-md"
            />
          </div>

          {/* XP badge — follows the cat */}
          <div className={`${pos.xp} bg-bsp-orange rounded-full px-2 py-2 shadow-md z-10`}>
            <span className="text-black text-xs">+ {challenge?.xp_reward ?? 50} XP</span>
          </div>

          <div className="bg-white/15 rounded-3xl px-4 py-3 flex items-center gap-3">
            {/* Progress ring */}
            <div className="relative w-12 h-12 shrink-0">
              <svg viewBox="0 0 48 48" className="w-full h-full -rotate-90">
                <circle cx="24" cy="24" r="19" fill="none" stroke="white" strokeOpacity="0.25" strokeWidth="4" />
                <circle
                  cx="24" cy="24" r="19" fill="none"
                  stroke="#4CAF50" strokeWidth="4"
                  strokeDasharray="119.38" strokeDashoffset={dashOffset}
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div className="flex-1 min-w-0 pr-14">
              <p className="text-white/70 text-xs mb-0.5">Today&apos;s challenge</p>
              <p className="text-white font-bold text-sm">{challenge?.text ?? 'Complete 3 activities'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Wave separator ── */}
      <div className="bg-bsp-blue -mb-px">
        <svg viewBox="0 0 402 36" preserveAspectRatio="none" className="w-full block h-9">
          <path
            d="M0,0 C67,36 134,0 201,18 C268,36 335,0 402,18 L402,36 L0,36 Z"
            fill="#F3F4F6"
          />
        </svg>
      </div>

      {/* ── Content area ── */}
      <div className="bg-gray-100 px-4 pt-4 pb-6 flex-1">

        {/* Section title */}
        <h2 className="mb-5 text-base leading-snug">
          <span className="font-black text-gray-900">SUPER</span>
          <span className="font-semibold text-gray-900"> useful activities </span>
          <span className="font-normal text-gray-400 text-sm">(your welcome)</span>
        </h2>

        {/* 2-col activity cards */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <ActivityCard
            href="/escribiendo"
            imageSrc="/images/home/escribiendo.png"
            imageAlt="Escribiendo"
            imageWidth={564}
            imageHeight={1022}
            buttonColor="orange"
            buttonBottom="10%"
          />
          <ActivityCard
            href="/practice"
            imageSrc="/images/home/liodetiempos.png"
            imageAlt="Lío de tiempos"
            imageWidth={564}
            imageHeight={1019}
            buttonColor="orange"
            buttonBottom="10%"
            priority={true}
          />
        </div>

        {/* Battle / Multiplayer card */}
        <ActivityCard
          href="/room"
          imageSrc="/images/home/multiplayer.png"
          imageAlt="BSP Battle"
          imageWidth={1123}
          imageHeight={828}
          buttonColor="gradient"
          buttonPosition="right"
          buttonBottom="15%"
          buttonRight="10%"
          buttonWidth="w-24"
        />

      </div>
      <NotificationQueue />
    </div>
  )
}
