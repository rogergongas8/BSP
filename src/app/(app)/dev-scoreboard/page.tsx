'use client'

// TEMP preview route — lets us iterate on FinishedView (final scoreboard) and the
// contrast round results card without playing a full multiplayer battle. Delete this
// whole folder + the temporary `export`s on play/[code]/page.tsx when done.

import { useState } from 'react'
import { FinishedView, RoundView, type Round, type RoundPhase } from '../play/[code]/page'

// Covers all three movement states (climbed / dropped / held) and overflows the top-5 cut, so
// the preview exercises both the arrows and the pinned "your position" row.
const FAKE_STANDINGS = [
  { user_id: '1', username: 'roger',  avatar: '/images/levelup/javi-tostado.png', total_points: 887, delta: 112, streak: 3, rank: 1, rank_change: 2 },
  { user_id: '2', username: 'akane',  avatar: '/images/levelup/mimo.png',         total_points: 879, delta: 0,   streak: 0, rank: 2, rank_change: -1 },
  { user_id: '3', username: 'carlos', avatar: '/images/levelup/zas.png',          total_points: 640, delta: 105, streak: 0, rank: 3, rank_change: 0 },
  { user_id: '4', username: 'jana',   avatar: '/images/levelup/mimo.png',         total_points: 590, delta: 98,  streak: 2, rank: 4, rank_change: 1 },
  { user_id: '5', username: 'marta',  avatar: '/images/levelup/zas.png',          total_points: 512, delta: 0,   streak: 0, rank: 5, rank_change: -2 },
  { user_id: '6', username: 'pablo',  avatar: '/images/levelup/javi-tostado.png', total_points: 430, delta: 100, streak: 0, rank: 6, rank_change: 1 },
  { user_id: '7', username: 'lucia',  avatar: '/images/levelup/mimo.png',         total_points: 380, delta: 0,   streak: 0, rank: 7, rank_change: -1 },
]

const FAKE_ROUND: Round = {
  id: 'round-1',
  room_id: 'room-1',
  round_number: 3,
  status: 'results',
  started_at: new Date().toISOString(),
  duration_seconds: 30,
  phrase_id: null,
  contrast_phrase_id: 'phrase-1',
  phrases: null,
  // Mirrors what the browser really receives mid-round: no answer key. The correct options
  // live in the results payload below, exactly as they do in a real battle.
  contrast_phrases: {
    id: 'phrase-1',
    battle_id: 'mimo-zas',
    sentence: 'Ayer mi madre ___ a mi hija del colegio ___ porque yo ___ médico.',
    infinitive_1: 'recoger, ella',
    option_a_1: 'recogió',
    option_b_1: 'recogía',
    infinitive_2: 'tener, yo',
    option_a_2: 'tuve',
    option_b_2: 'tenía',
  },
}

const FAKE_CORRECT_1 = 1 as const
const FAKE_CORRECT_2 = 2 as const

function fakeResults(selected1: 1 | 2, selected2: 1 | 2): RoundPhase & { type: 'results' } {
  const isCorrect = selected1 === FAKE_CORRECT_1 && selected2 === FAKE_CORRECT_2
  return {
    type: 'results',
    round: FAKE_ROUND,
    myAnswer: { kind: 'contrast', selected1, selected2 },
    results: {
      is_contraste: true,
      correct_1: FAKE_CORRECT_1,
      correct_2: FAKE_CORRECT_2,
      my_selected_1: selected1,
      my_selected_2: selected2,
      my_validation_status: isCorrect ? 'correct' : 'incorrect',
      my_points: isCorrect ? 850 : 0,
      is_correct: isCorrect,
      correct_count: 5,
      total_count: 8,
      my_rank: 3,
      total_players: 3,
      points_behind: 24,
      player_ahead_name: 'Roger',
      standings: FAKE_STANDINGS,
      round_number: 3,
    },
  }
}

const VARIANTS = [
  { label: 'Both correct', selected1: 1 as const, selected2: 2 as const, streak: 0 },
  { label: 'Both correct + streak', selected1: 1 as const, selected2: 2 as const, streak: 3 },
  { label: 'Gap 2 wrong', selected1: 1 as const, selected2: 1 as const, streak: 0 },
  { label: 'Both wrong', selected1: 2 as const, selected2: 1 as const, streak: 0 },
]

export default function DevScoreboardPage() {
  const [view, setView] = useState<'finished' | 'contrast-results'>('contrast-results')
  const [variantIdx, setVariantIdx] = useState(0)
  const [controlsOpen, setControlsOpen] = useState(true)
  const variant = VARIANTS[variantIdx]

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Floating controls — doesn't take layout space, so it never pushes the real screen content down */}
      <div className="fixed top-2 left-2 right-2 z-[60] flex flex-col items-start gap-1">
        <button
          onClick={() => setControlsOpen(o => !o)}
          className="px-2 py-1 rounded-md text-[10px] font-bold bg-gray-900/80 text-white backdrop-blur"
        >
          {controlsOpen ? 'Hide controls' : 'Show controls'}
        </button>
        {controlsOpen && (
          <div className="flex flex-col gap-1.5 p-2 rounded-xl bg-gray-900/80 backdrop-blur max-w-full">
            <div className="flex gap-1.5 flex-wrap">
              <button
                onClick={() => setView('contrast-results')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${view === 'contrast-results' ? 'bg-white text-black' : 'bg-gray-700 text-white'}`}
              >
                Contrast results
              </button>
              <button
                onClick={() => setView('finished')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${view === 'finished' ? 'bg-white text-black' : 'bg-gray-700 text-white'}`}
              >
                Final scoreboard
              </button>
            </div>
            {view === 'contrast-results' && (
              <div className="flex gap-1.5 flex-wrap">
                {VARIANTS.map((v, i) => (
                  <button
                    key={v.label}
                    onClick={() => setVariantIdx(i)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${i === variantIdx ? 'bg-amber-400 text-black' : 'bg-gray-700 text-white'}`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {view === 'finished' && (
        <FinishedView
          standings={FAKE_STANDINGS}
          isHost={true}
          currentUserId="1"
          onFinish={() => alert('Finish battle clicked')}
          onLeave={() => alert('Leave clicked')}
        />
      )}
      {view === 'contrast-results' && (
        <RoundView
          phase={fakeResults(variant.selected1, variant.selected2)}
          secondsLeft={0}
          isHost={true}
          myStreak={variant.streak}
          onAnswer={() => {}}
          onSkip={() => {}}
          onNext={() => alert('Next clicked')}
        />
      )}
    </div>
  )
}
