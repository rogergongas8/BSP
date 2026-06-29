// XP needed to advance from level N to N+1 (index 0 = level 1→2)
const XP_PER_LEVEL = [150, 230, 330, 450, 600, 780, 990, 1230, 1500] as const
const XP_PER_LEVEL_AFTER_10 = 300

const CATS = ['javi-tostado', 'mimo', 'zas'] as const
export type LevelCat = typeof CATS[number]

export type LevelInfo = {
  level: number
  xpInLevel: number
  xpForNext: number
  cat: LevelCat
}

export function getLevelInfo(totalXp: number): LevelInfo {
  let level = 1
  let remaining = Math.max(0, totalXp)

  for (const threshold of XP_PER_LEVEL) {
    if (remaining < threshold) break
    remaining -= threshold
    level++
  }

  // Level 10+: each additional level costs 300 XP
  if (level >= 10 && remaining >= XP_PER_LEVEL_AFTER_10) {
    const extraLevels = Math.floor(remaining / XP_PER_LEVEL_AFTER_10)
    level += extraLevels
    remaining = remaining % XP_PER_LEVEL_AFTER_10
  }

  const xpForNext =
    level <= XP_PER_LEVEL.length
      ? XP_PER_LEVEL[level - 1]
      : XP_PER_LEVEL_AFTER_10

  return {
    level,
    xpInLevel: remaining,
    xpForNext,
    cat: CATS[(level - 1) % CATS.length],
  }
}

export function catImagePath(cat: LevelCat): string {
  return `/images/levelup/${cat}.png`
}
