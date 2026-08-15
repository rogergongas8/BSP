'use client'

import { use, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence, type PanInfo } from 'motion/react'
import { X, BookOpen, ArrowLeft, ArrowRight, MessageSquareText, Repeat, FileText, CloudRain, Check, XCircle, ArrowDown } from 'lucide-react'
import { resolveTenseId } from '@/lib/game-logic'
import { LESSONS, type LessonBlock, type LessonStep, type PillColor } from '@/lib/lessons'
import OverscrollColor from '@/components/overscroll-color'

const TAG_STYLES: Record<'blue' | 'orange', { bg: string; text: string; solid: string }> = {
  blue: { bg: '#DBEAFE', text: '#2563EB', solid: 'var(--bsp-blue)' },
  orange: { bg: '#FFEAD1', text: '#C2680C', solid: 'var(--bsp-orange)' },
}

const PILL_STYLES: Record<PillColor, { border: string; arrow: string; text: string; solid: string; tint: string }> = {
  orange: { border: 'border-orange-200', arrow: 'text-orange-400', text: 'text-orange-700', solid: '#FF8716', tint: '#FFF4E8' },
  green:  { border: 'border-green-200',  arrow: 'text-green-400',  text: 'text-green-700',  solid: '#22C55E', tint: '#F0FDF4' },
  pink:   { border: 'border-pink-200',   arrow: 'text-pink-400',   text: 'text-pink-700',   solid: '#EC4881', tint: '#FEF1F5' },
  wine:   { border: 'border-rose-300',   arrow: 'text-rose-500',   text: 'text-rose-800',   solid: '#9F1239', tint: '#FDF2F5' },
  lavender: { border: 'border-indigo-200', arrow: 'text-indigo-400', text: 'text-indigo-700', solid: '#6366F1', tint: '#EEF0FE' },
}

const PASTEL_HEADER: Record<PillColor, { bg: string; text: string }> = {
  orange: { bg: '#FCE2C4', text: '#9A5B1C' },
  green: { bg: '#D2F2DC', text: '#166534' },
  pink: { bg: '#FBD6E4', text: '#9D174D' },
  wine: { bg: '#F0C9D3', text: '#881337' },
  lavender: { bg: '#D9DCFA', text: '#3730A3' },
}

function highlight(
  text: string,
  highlights: { word: string; color: 'blue' | 'orange' | 'pink' }[],
  fallbackColor?: string,
) {
  const words = text.split(/(\s+)/)
  return words.map((w, i) => {
    const clean = w.replace(/[().,¡!]/g, '')
    const match = highlights.find(h => h.word.toLowerCase() === clean.toLowerCase())
    if (!match) return <span key={i}>{w}</span>
    const color = match.color === 'pink' ? (fallbackColor ?? '#DB2777') : TAG_STYLES[match.color].text
    return (
      <span key={i} className="font-black" style={{ color }}>
        {w}
      </span>
    )
  })
}

function renderBold(text: string) {
  return text.split(/(\*\*.+?\*\*|\*.+?\*)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-bold text-gray-600">{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i} className="italic">{part.slice(1, -1)}</em>
    }
    return <span key={i}>{part}</span>
  })
}

const RICH_COLORS: Record<'red' | 'blue' | 'orange', string> = {
  red: '#E11D48', blue: '#2563EB', orange: 'var(--bsp-orange)',
}

function renderRichSubtitle(segments: { text: string; bold?: boolean; color?: 'red' | 'blue' | 'orange' }[]) {
  return segments.map((seg, i) => {
    const style = seg.color ? { color: RICH_COLORS[seg.color] } : undefined
    return seg.bold
      ? <strong key={i} className="font-bold" style={style ?? { color: '#4B5563' }}>{seg.text}</strong>
      : <span key={i} style={style}>{seg.text}</span>
  })
}

function LessonBlockView({ block, compact }: { block: LessonBlock; compact?: boolean }) {
  switch (block.type) {
    case 'formula':
      return (
        <div className="rounded-2xl border border-gray-100 px-4 py-3.5 flex flex-col gap-3.5">
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              {block.parts.map((p, i) => (
                <div key={p.tag} className="flex items-center gap-2.5">
                  {i > 0 && <span className="text-gray-300 font-black">+</span>}
                  <div className="flex flex-col items-center gap-1.5">
                    <span
                      className="px-3 py-1.5 rounded-xl text-sm font-black text-white"
                      style={{ backgroundColor: TAG_STYLES[p.color].solid }}
                    >
                      {p.tag}
                    </span>
                    <span className="text-[10px] font-semibold text-gray-400">{p.label}</span>
                  </div>
                </div>
              ))}
            </div>
            {block.character && !compact && (
              <Image
                src={block.character} alt="" width={44} height={44}
                className="object-contain shrink-0"
              />
            )}
          </div>
          {block.compareEn && (
            <div className="flex items-center gap-2.5 border-t border-gray-100 pt-3 text-xs text-gray-400">
              <span>Just like in English:</span>
              <span className="px-2 py-0.5 rounded-lg border border-blue-200 text-blue-600 font-bold">{block.compareEn[0]}</span>
              <span className="text-gray-300">+</span>
              <span className="text-gray-600 font-semibold">{block.compareEn[1]}</span>
            </div>
          )}
        </div>
      )
    case 'example':
      return (
        <div className="flex flex-col gap-2.5">
          <span className="w-fit flex items-center gap-1.5 rounded-full border border-blue-200 text-blue-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide">
            <MessageSquareText className="w-3 h-3" /> Ejemplo
          </span>
          <div className="rounded-2xl bg-gray-50 border border-gray-100 px-4 py-3.5 flex flex-col gap-1.5">
            <p className="text-sm font-medium text-gray-800">{highlight(block.es, block.highlights)}</p>
            <p className="text-xs text-gray-400">{highlight(block.en, block.highlights)}</p>
          </div>
        </div>
      )
    case 'table':
      return (
        <div className="flex flex-col gap-2.5">
          <div className={`relative grid grid-cols-2 ${compact ? 'gap-x-6 gap-y-1' : 'gap-x-8 gap-y-3 pb-6'}`}>
            {block.rows.map(([person, form]) => (
              <div key={person} className="flex items-baseline justify-between gap-3">
                <span className="text-xs text-gray-400">{person}</span>
                <span className="text-sm font-bold text-gray-900">{form}</span>
              </div>
            ))}
          </div>
          {block.note && !compact && (
            <div className="flex items-end justify-between gap-3">
              <p className="text-[11px] text-gray-400 italic flex-1">{block.note}</p>
              {block.character && (
                <Image src={block.character} alt="" width={40} height={40} className="object-contain shrink-0" />
              )}
            </div>
          )}
        </div>
      )
    case 'note':
      if (block.variant === 'boxed') {
        return (
          <div className="rounded-xl border border-green-100 border-l-4 border-l-green-400 bg-green-50/40 px-3.5 py-3">
            <p className="text-xs text-gray-600 leading-relaxed">{renderBold(block.text)}</p>
          </div>
        )
      }
      return (
        <div className="flex items-start gap-2.5 px-0.5">
          <span className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-black text-white shrink-0 mt-0.5" style={{ backgroundColor: 'var(--bsp-orange)' }}>!</span>
          <p className="text-xs text-gray-500 leading-relaxed flex-1">{renderBold(block.text)}</p>
          {block.character && !compact && (
            <Image src={block.character} alt="" width={56} height={56} className="object-contain shrink-0 -my-2" />
          )}
        </div>
      )
    case 'rule-cards':
      return (
        <div className="rounded-2xl border border-gray-100 overflow-hidden">
          {block.items.map((item, i) => (
            <div key={item.suffix} className={`px-4 py-3.5 flex flex-col gap-2 ${i > 0 ? 'border-t border-gray-100' : ''}`}>
              <div className="flex items-center gap-2.5 text-sm">
                <span className="font-bold text-gray-500">{item.suffix}</span>
                <ArrowRight className="w-3.5 h-3.5 text-gray-300" />
                <span
                  className="px-2 py-0.5 rounded-lg text-xs font-black text-white"
                  style={{ backgroundColor: TAG_STYLES.orange.solid }}
                >
                  {item.result}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {item.examples.map(([inf, part]) => (
                  <span key={inf} className="text-xs text-gray-400">
                    {inf} → <span className="font-semibold text-gray-600">{part}</span>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )
    case 'pill-pairs': {
      const styles = PILL_STYLES[block.color]
      return (
        <div className={`grid ${compact ? 'grid-cols-2 gap-1.5' : 'grid-cols-2 gap-2.5'}`}>
          {block.items.map(([inf, part]) => (
            <span key={inf} className={`flex items-center gap-1.5 rounded-full bg-white border ${styles.border} px-3 py-2 text-xs justify-center`}>
              <span className="text-gray-700 font-medium">{inf}</span>
              <ArrowRight className={`w-3 h-3 ${styles.arrow}`} />
              <span className={`font-bold ${styles.text}`}>{part}</span>
            </span>
          ))}
        </div>
      )
    }
    case 'word-pills':
      return (
        <div className="flex flex-wrap items-center gap-2.5">
          {block.groups.map((group, gi) => (
            <div key={gi} className="flex items-center gap-2">
              {gi > 0 && <span className="text-gray-300 font-black">·</span>}
              {group.words.map((word, wi) => (
                <div key={word} className="flex items-center gap-2">
                  {wi > 0 && <span className="text-gray-400 text-sm">/</span>}
                  <span
                    className="px-3 py-1.5 rounded-full text-sm font-black text-white"
                    style={{ backgroundColor: PILL_STYLES[group.color].solid }}
                  >
                    {word}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )
    case 'examples': {
      const styles = PILL_STYLES[block.color]
      return (
        <div className="flex flex-col gap-2.5">
          <span className="w-fit flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide" style={{ borderColor: styles.solid, color: styles.solid }}>
            <MessageSquareText className="w-3 h-3" /> Ejemplo
          </span>
          <div className="rounded-2xl border border-gray-100 px-4 py-3.5 flex flex-col gap-2.5" style={{ backgroundColor: styles.tint }}>
            {block.items.map((item, i) => (
              <p key={i} className="text-sm font-medium text-gray-800">
                {highlight(item.text, item.highlights.map(word => ({ word, color: 'pink' as const })), styles.text)}
              </p>
            ))}
          </div>
        </div>
      )
    }
    case 'correction-pairs':
      if (compact) {
        return (
          <div className="grid grid-cols-2 gap-1.5">
            {block.items.map(([wrong, correct]) => (
              <span key={wrong} className="flex items-center gap-1 rounded-full bg-white border border-green-200 px-3 py-1.5 text-xs justify-center">
                <span className="text-gray-400 line-through">{wrong}</span>
                <ArrowRight className="w-3 h-3 text-green-400" />
                <span className="font-bold text-green-700">{correct}</span>
              </span>
            ))}
          </div>
        )
      }
      return (
        <div className="rounded-2xl border border-gray-100 border-l-4 border-l-green-400 px-4 py-3.5 grid grid-cols-2 gap-x-4 gap-y-3">
          {block.items.map(([wrong, correct]) => (
            <div key={wrong} className="flex items-center gap-2 text-sm">
              <span className="text-gray-400 line-through">{wrong}</span>
              <ArrowRight className="w-3.5 h-3.5 text-green-400" />
              <span className="font-bold text-green-700">{correct}</span>
            </div>
          ))}
        </div>
      )
    case 'stem-formula':
      if (compact) {
        return (
          <div className="grid grid-cols-2 gap-1.5">
            {block.stems.map(([inf, stem]) => (
              <span key={inf} className="flex items-center gap-1 rounded-full bg-white border border-orange-200 px-3 py-1.5 text-xs justify-center">
                <span className="text-gray-700 font-medium">{inf}</span>
                <ArrowRight className="w-3 h-3 text-orange-400" />
                <span className="font-bold text-orange-700">{stem}</span>
              </span>
            ))}
          </div>
        )
      }
      return (
        <div className="flex items-center gap-4">
          <div className="flex-1 flex flex-col gap-2.5">
            <span className="text-[10px] font-black uppercase tracking-wide text-gray-400">Stem</span>
            {block.stems.map(([inf, stem]) => (
              <div key={inf} className="rounded-xl border border-gray-100 px-3.5 py-2.5 flex flex-col items-start">
                <span className="text-[10px] text-gray-400">{inf}</span>
                <span className="text-sm font-black text-orange-600">{stem}</span>
              </div>
            ))}
          </div>
          <span className="text-gray-300 font-black text-lg">+</span>
          <div className="flex-1 flex flex-col gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-wide text-gray-400">Ending</span>
            <div className="rounded-xl border border-gray-100 px-3.5 py-2.5 flex flex-col gap-2">
              {block.endings.map(e => (
                <span key={e} className="text-sm font-black text-orange-600">{e}</span>
              ))}
            </div>
          </div>
        </div>
      )
    case 'infinitive-table':
      return (
        <div className="rounded-2xl border border-gray-100 overflow-hidden">
          <div className="grid grid-cols-2 bg-orange-100">
            {block.headers.map(h => (
              <span key={h} className="px-4 py-2.5 text-[10px] font-black uppercase tracking-wide text-orange-700">{h}</span>
            ))}
          </div>
          {block.rows.map(([inf, stem], i) => (
            <div key={inf} className={`grid grid-cols-2 px-4 py-2.5 ${i > 0 ? 'border-t border-gray-100' : ''}`}>
              <span className="text-sm text-gray-700">{inf}</span>
              <span className="text-sm font-black text-orange-600">{stem}</span>
            </div>
          ))}
        </div>
      )
    case 'trio-table':
      return (
        <div className="rounded-2xl border border-gray-100 overflow-hidden">
          <div className="grid grid-cols-3 bg-gray-100">
            {block.headers.map(h => (
              <span key={h} className="px-3 py-2.5 text-[9px] font-black uppercase tracking-wide text-gray-500">{h}</span>
            ))}
          </div>
          {block.rows.map(([inf, stem, form], i) => (
            <div key={inf} className={`grid grid-cols-3 px-3 py-2.5 ${i > 0 ? 'border-t border-gray-100' : ''}`}>
              <span className="text-sm text-gray-700">{inf}</span>
              <span className="text-sm font-bold text-gray-900">{stem}</span>
              <span className="text-sm font-black text-orange-600 underline decoration-orange-300">{form}</span>
            </div>
          ))}
        </div>
      )
    case 'boxed-pairs': {
      const accentColor = block.accent === 'green' ? '#22C55E' : 'var(--bsp-orange)'
      return (
        <div className={`grid grid-cols-2 ${compact ? 'gap-1.5' : 'gap-2.5'}`}>
          {block.rows.map(([person, form], i) => {
            const isHighlighted = block.highlightIndex === i
            return (
              <div
                key={person}
                className="rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-2"
                style={isHighlighted
                  ? { backgroundColor: accentColor }
                  : { border: '1px solid #F3F4F6' }}
              >
                <span className={`text-xs ${isHighlighted ? 'text-white/90' : 'text-gray-400'}`}>{person}</span>
                <span className={`text-sm font-black ${isHighlighted ? 'text-white' : ''}`} style={isHighlighted ? {} : { color: accentColor }}>{form}</span>
              </div>
            )
          })}
        </div>
      )
    }
    case 'example-words': {
      const styles = PILL_STYLES[block.color]
      return (
        <div className="flex flex-col gap-2.5">
          <span className="w-fit flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide" style={{ borderColor: styles.solid, color: styles.solid }}>
            <MessageSquareText className="w-3 h-3" /> Ejemplo
          </span>
          <div className="rounded-2xl border border-gray-100 px-3.5 py-3 flex flex-wrap gap-2.5" style={{ backgroundColor: styles.tint }}>
            {block.words.map(w => (
              <span key={w} className={`px-3 py-1 rounded-full bg-white border ${styles.border} text-xs font-bold ${styles.text}`}>{w}</span>
            ))}
          </div>
        </div>
      )
    }
    case 'dual-conjugation':
      if (compact) {
        return (
          <div className="flex flex-col gap-3">
            {block.groups.map(group => (
              <div key={group.label} className="flex flex-col gap-1.5">
                <span className="text-xs font-black" style={{ color: PILL_STYLES[group.color].solid }}>{group.label.toUpperCase()}</span>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                  {group.rows.map(([person, form]) => (
                    <div key={person} className="flex items-baseline justify-between gap-3">
                      <span className="text-xs text-gray-400">{person}</span>
                      <span className="text-sm font-bold" style={{ color: PILL_STYLES[group.color].solid }}>{form}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      }
      return (
        <div className={block.style === 'pastel' ? 'grid grid-cols-2 gap-2.5' : 'rounded-2xl border border-gray-100 overflow-hidden flex'}>
          {block.groups.map((group, gi) => {
            const isPastel = block.style === 'pastel'
            const pastel = PASTEL_HEADER[group.color]
            return (
              <div
                key={group.label}
                className={isPastel
                  ? 'flex-1 flex flex-col gap-2'
                  : `flex-1 flex flex-col gap-2 px-2.5 py-3.5 ${gi > 0 ? 'border-l border-gray-100' : ''}`}
              >
                <span
                  className="mx-auto px-3 py-1 rounded-full text-xs font-black w-full text-center"
                  style={isPastel
                    ? { backgroundColor: pastel.bg, color: pastel.text }
                    : { backgroundColor: PILL_STYLES[group.color].solid, color: '#fff' }}
                >
                  {group.label}
                </span>
                <div className="flex flex-col gap-2 mt-1">
                  {group.rows.map(([person, form], ri) => {
                    const isHi = group.highlightIndex === ri
                    return (
                      <div
                        key={person}
                        className="flex flex-col items-center rounded-lg px-2.5 py-2"
                        style={isHi ? { border: `1.5px solid ${PILL_STYLES.orange.solid}` } : { border: '1px solid #F3F4F6' }}
                      >
                        <span className="text-[10px] text-gray-400">{person}</span>
                        <span className="text-xs font-bold" style={{ color: isHi ? PILL_STYLES.orange.solid : PILL_STYLES[group.color].solid }}>{form}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )
    case 'accent-table': {
      const styles = PILL_STYLES[block.color]
      return (
        <div className={`grid grid-cols-2 ${compact ? 'gap-x-6 gap-y-1' : 'gap-x-8 gap-y-3'}`}>
          {block.rows.map(([person, form]) => {
            const idx = form.toLowerCase().indexOf(block.underline.toLowerCase())
            return (
              <div key={person} className="flex items-baseline justify-between gap-3">
                <span className="text-xs text-gray-400">{person}</span>
                <span className="text-sm font-bold text-gray-900">
                  {idx === -1 ? form : (
                    <>
                      {form.slice(0, idx)}
                      <span className="underline decoration-2" style={{ color: styles.solid, textDecorationColor: styles.solid }}>
                        {form.slice(idx, idx + block.underline.length)}
                      </span>
                      {form.slice(idx + block.underline.length)}
                    </>
                  )}
                </span>
              </div>
            )
          })}
        </div>
      )
    }
    case 'stem-cards':
      return (
        <div className={`grid ${compact ? 'grid-cols-3 gap-1.5' : 'grid-cols-3 gap-2.5'}`}>
          {block.items.map(([inf, stem]) => (
            <div key={inf} className="rounded-xl border border-gray-100 px-2.5 py-2.5 flex flex-col items-center">
              <span className="text-[10px] text-gray-400">{inf}</span>
              <span className="text-sm font-black text-blue-600">{stem}</span>
            </div>
          ))}
        </div>
      )
    case 'uses-list': {
      const ICONS = { repeat: Repeat, file: FileText, cloud: CloudRain }
      return (
        <div className="flex flex-col gap-3.5">
          {block.items.map(item => {
            const Icon = ICONS[item.icon]
            return (
              <div key={item.title} className="rounded-2xl border border-gray-100 px-4 py-3.5 flex flex-col gap-2.5">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center shrink-0 overflow-hidden">
                    {item.image
                      ? <Image src={item.image} alt="" width={36} height={36} className="object-contain" />
                      : <Icon className="w-4 h-4 text-gray-400" />}
                  </span>
                  <div>
                    <p className="text-sm font-black text-gray-900">{item.title}</p>
                    <p className="text-xs text-gray-400">{renderBold(item.desc)}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {item.examples.map(ex => (
                    <p key={ex} className="text-xs text-gray-700 rounded-xl px-3 py-2.5" style={{ backgroundColor: PILL_STYLES.orange.tint }}>
                      {renderBold(ex)}
                    </p>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )
    }
    case 'validity-note':
      if (compact) return null
      return (
        <div className="rounded-2xl border border-orange-100 bg-orange-50/40 px-3.5 py-3.5 flex flex-col gap-2.5">
          <div className="flex items-start gap-2.5">
            <span className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-black text-white shrink-0 mt-0.5" style={{ backgroundColor: 'var(--bsp-orange)' }}>!</span>
            <p className="text-xs text-gray-600 leading-relaxed">{renderBold(block.text)}</p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 px-3 py-2">
            <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />
            <span className="text-xs text-green-800">{block.correct}</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2">
            <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
            <span className="text-xs text-red-800 line-through">{block.incorrect}</span>
          </div>
          <p className="text-[11px] text-gray-400 italic">{block.caption}</p>
        </div>
      )
    case 'now-then-list':
      return (
        <div className="flex flex-col gap-6">
          {block.groups.map(group => (
            <div key={group.label} className="flex flex-col gap-2.5">
              {!compact && (
                <span className="text-[10px] font-black uppercase tracking-wide text-gray-400 border-b border-orange-200 pb-1.5">{group.label}</span>
              )}
              <div className="flex items-center gap-2.5">
                <span className="shrink-0 px-2.5 py-1 rounded-full bg-gray-200 text-gray-600 text-[10px] font-black">NOW</span>
                <p className="text-xs text-gray-700 flex-1">{renderBold(group.now)}</p>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="shrink-0 px-2.5 py-1 rounded-full text-white text-[10px] font-black" style={{ backgroundColor: 'var(--bsp-orange)' }}>BACK THEN</span>
                <p className="text-xs flex-1" style={{ color: 'var(--bsp-orange)' }}>{renderBold(group.then)}</p>
              </div>
            </div>
          ))}
          {block.character && !compact && (
            <Image src={block.character} alt="" width={110} height={110} className="object-contain mx-auto mt-1" />
          )}
        </div>
      )
    case 'main-action-example':
      return (
        <div className="rounded-2xl border border-gray-100 px-4 py-3.5 flex items-center gap-3">
          <div className="flex-1 flex flex-col gap-2.5">
            <p className="text-sm text-gray-700">
              {highlight(block.sentence, [
                { word: block.backgroundPhrase.split(' ')[0], color: 'orange' },
                { word: block.actionPhrase, color: 'blue' },
              ])}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: PILL_STYLES.orange.tint, color: '#9A5B1C' }}>
                {block.backgroundPhrase}
              </span>
              <span className="px-3 py-1 rounded-full border border-blue-200 text-blue-700 text-xs font-bold">{block.actionPhrase}</span>
            </div>
          </div>
          {block.character && !compact && (
            <Image src={block.character} alt="" width={56} height={56} className="object-contain shrink-0" />
          )}
        </div>
      )
    case 'narration-chain':
      return (
        <div className="flex flex-col gap-1.5">
          {block.imperfectoLines.map((line, i) => (
            <div key={line} className="flex items-center gap-3">
              <div className="flex flex-col items-center w-2.5 shrink-0">
                <span className="w-2 h-2 rounded-full bg-orange-300" />
                {(i < block.imperfectoLines.length - 1 || true) && <span className="w-px flex-1 bg-orange-200" style={{ minHeight: 14 }} />}
              </div>
              <span className="text-xs px-3 py-1.5 rounded-full flex-1" style={{ backgroundColor: PILL_STYLES.orange.tint, color: '#9A5B1C' }}>{line}</span>
            </div>
          ))}
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center w-2.5 shrink-0">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--bsp-blue)' }} />
            </div>
            {block.closingIcon && !compact && (
              <Image src={block.closingIcon} alt="" width={36} height={36} className="object-contain shrink-0" />
            )}
            <span className="text-xs font-bold px-3 py-1.5 rounded-full text-white" style={{ backgroundColor: 'var(--bsp-blue)' }}>{block.indefinidoLine}</span>
            <span className="text-[10px] text-gray-400 italic">closes the narration</span>
          </div>
        </div>
      )
    case 'toggle-pair':
      return (
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-xl border border-green-200 bg-green-50 px-3.5 py-3 flex flex-col items-center gap-1">
            <span className="text-[9px] font-black uppercase tracking-wide text-green-600">Simple</span>
            <span className="text-sm font-bold text-gray-900">{block.simple}</span>
          </div>
          <div className="rounded-xl border border-gray-200 px-3.5 py-3 flex flex-col items-center gap-1">
            <span className="text-[9px] font-black uppercase tracking-wide text-gray-400">Progressive</span>
            <span className="text-sm font-bold text-gray-900">{block.progressive}</span>
          </div>
        </div>
      )
    case 'exception-pairs':
      return (
        <div className={`grid grid-cols-2 ${compact ? 'gap-1.5' : 'gap-2.5'}`}>
          {block.items.map(([correct, wrong]) => (
            <div key={correct} className="rounded-full bg-white border border-gray-100 px-3 py-2 flex items-center gap-1.5 text-xs justify-center">
              <span className="font-bold text-green-600">{correct}</span>
              <span className="text-red-400 line-through">{wrong}</span>
            </div>
          ))}
        </div>
      )
    case 'dual-card': {
      const cardBg = { blue: 'var(--bsp-blue)', blueLight: '#5B7FD6', red: '#B5314A' }
      const exampleBg = { blue: { bg: '#DBEAFE', text: '#1E40AF' }, blueLight: { bg: '#EEF0FE', text: '#3730A3' }, red: { bg: '#FBD6E4', text: '#9D174D' } }
      return (
        <div className="grid grid-cols-2 gap-2.5">
          {block.cards.map(card => (
            <div key={card.label} className="rounded-2xl border border-gray-100 overflow-hidden flex flex-col">
              <span className="px-2 py-2 text-center text-[10px] font-black text-white" style={{ backgroundColor: cardBg[card.color] }}>{card.label}</span>
              <div className="px-3 py-2.5 flex flex-col gap-2.5 flex-1">
                <div className="flex items-center gap-2">
                  {card.icon && <Image src={card.icon} alt="" width={28} height={28} className="object-contain shrink-0" />}
                  <p className="text-[11px] text-gray-600 leading-snug">{renderBold(card.text)}</p>
                </div>
                <p className="text-[11px] rounded-lg px-2.5 py-2" style={{ backgroundColor: exampleBg[card.color].bg, color: exampleBg[card.color].text }}>{card.example}</p>
              </div>
            </div>
          ))}
        </div>
      )
    }
    case 'time-unit-card': {
      const isPerfecto = block.variant === 'perfecto'
      const headerColor = isPerfecto ? '#B5314A' : 'var(--bsp-blue)'
      const softColor = isPerfecto ? '#DC5A76' : '#5B7FD6'
      return (
        <div className="rounded-2xl border border-gray-100 overflow-hidden">
          <span className="block px-3 py-2.5 text-center text-xs font-black text-white uppercase tracking-wide" style={{ backgroundColor: headerColor }}>
            {isPerfecto ? 'Perfecto' : 'Indefinido'}
          </span>
          <div className="px-4 py-3.5 flex flex-col gap-3.5">
            {block.desc && <p className="text-xs text-gray-700">{renderBold(block.desc)}</p>}
            {block.timeUnits && (
              <div className="flex flex-wrap gap-2 pb-2.5 border-b border-gray-100">
                {block.timeUnits.map(u => (
                  <span key={u} className="px-2.5 py-1 rounded-full border text-xs font-medium" style={{ borderColor: softColor, color: headerColor }}>{u}</span>
                ))}
              </div>
            )}
            {block.diagram && (
              <div className="flex flex-col items-center gap-1.5">
                <div className="flex items-center justify-between w-full text-[10px] text-gray-400 px-2">
                  <span>The event</span>
                  <span>You</span>
                </div>
                <div className="relative w-full flex items-center justify-between px-1">
                  <div className="absolute inset-x-0 h-6 rounded-full opacity-60" style={{ backgroundColor: isPerfecto ? '#FBD6E4' : '#DBEAFE' }} />
                  <Image src={block.diagram.eventIcon} alt="" width={52} height={52} className="relative object-contain" />
                  <Image src={block.diagram.youIcon} alt="" width={52} height={52} className="relative object-contain" />
                </div>
                {block.diagram.times && (
                  <div className="flex items-center justify-between w-full text-[9px] text-gray-400 px-1">
                    {block.diagram.times.map(t => <span key={t}>{t}</span>)}
                  </div>
                )}
              </div>
            )}
            <div className="flex items-center gap-2">
              {block.durations.map(d => (
                <span
                  key={d.label}
                  className="flex-1 text-center px-3 py-1.5 rounded-full text-xs font-bold"
                  style={d.variant === 'perfecto'
                    ? { border: '1.5px solid #B5314A', color: '#B5314A' }
                    : { backgroundColor: 'var(--bsp-blue)', color: '#fff' }}
                >
                  {d.label}
                </span>
              ))}
            </div>
            {block.example && (
              <p className="text-xs text-center text-gray-700">
                <span className="underline" style={{ color: headerColor, textDecorationColor: headerColor }}>{block.exampleUnderline}</span>
                {' '}
                <strong className="font-black" style={{ color: headerColor }}>{block.exampleBold}</strong>
                {' '}
                {block.example.replace(block.exampleUnderline ?? '', '').replace(block.exampleBold ?? '', '').trim()}
              </p>
            )}
          </div>
        </div>
      )
    }
    case 'ejemplo-lines':
      return (
        <div className="flex flex-col gap-2.5">
          <span className="w-fit flex items-center gap-1.5 rounded-full border border-blue-200 text-blue-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide">
            <MessageSquareText className="w-3 h-3" /> Ejemplo
          </span>
          <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3.5 flex flex-col gap-2.5">
            {block.items.map((item, i) => (
              <p key={i} className="text-xs text-gray-700">
                <span className="underline decoration-rose-400 text-rose-600">{item.underline}</span> {item.rest}
              </p>
            ))}
          </div>
        </div>
      )
    case 'consequence-grid':
      return (
        <div className="grid grid-cols-2 gap-2.5">
          {block.items.map((item, i) => {
            const isPerfecto = item.variant === 'perfecto'
            return (
              <div key={i} className="rounded-2xl border border-gray-100 overflow-hidden flex flex-col">
                <div className="px-3 py-2.5" style={{ backgroundColor: isPerfecto ? '#FBD6E4' : '#DBEAFE' }}>
                  <span className="text-[9px] font-black uppercase tracking-wide" style={{ color: isPerfecto ? '#B5314A' : 'var(--bsp-blue)' }}>
                    {isPerfecto ? 'Perfecto' : 'Indefinido'}
                  </span>
                  <p className="text-xs font-bold text-gray-900">&ldquo;{item.quote}&rdquo;</p>
                </div>
                <div className="flex items-center gap-2.5 px-3 py-2.5">
                  <Image src={item.icon} alt="" width={28} height={28} className="object-contain shrink-0" />
                  <p className="text-[11px] text-gray-600 leading-snug">{item.caption}</p>
                </div>
              </div>
            )
          })}
        </div>
      )
    case 'tag-cloud':
      return (
        <div className="flex flex-col gap-2.5">
          {block.groups.map(group => {
            const isPerfecto = group.variant === 'perfecto'
            return (
              <div key={group.variant} className="rounded-2xl border border-gray-100 px-3.5 py-3 flex flex-wrap gap-2">
                {group.words.map(w => (
                  <span
                    key={w}
                    className="px-2.5 py-1 rounded-full border text-xs font-medium"
                    style={{ borderColor: isPerfecto ? '#DC5A76' : '#5B7FD6', color: isPerfecto ? '#B5314A' : 'var(--bsp-blue)' }}
                  >
                    {w}
                  </span>
                ))}
              </div>
            )
          })}
        </div>
      )
    case 'mix-scenario': {
      const isPerfecto = block.actionVariant === 'perfecto'
      const actionColor = isPerfecto ? '#B5314A' : 'var(--bsp-blue)'
      return (
        <div className="rounded-2xl border border-gray-100 px-4 py-3.5 flex flex-col gap-3">
          <span className="text-[10px] font-black uppercase tracking-wide text-gray-400">{block.label}</span>
          <p className="text-xs">
            <span className="font-bold" style={{ color: 'var(--bsp-orange)' }}>{block.backgroundPhrase}</span>
            <span className="text-gray-500">, por eso </span>
            <span className="font-black underline" style={{ color: actionColor, textDecorationColor: actionColor }}>{block.actionPhrase}</span>
            <span className="text-gray-500"> algo.</span>
          </p>
          <div className="border-t border-gray-100 pt-3 flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5" style={{ backgroundColor: PILL_STYLES.orange.tint, color: '#9A5B1C' }}>
              {block.backgroundPhrase.toLowerCase()}
              <span className="px-2 py-0.5 rounded-full bg-white border text-xs font-bold" style={{ borderColor: actionColor, color: actionColor }}>{block.actionPhrase}</span>
            </span>
            {block.character && !compact && (
              <Image src={block.character} alt="" width={40} height={40} className="object-contain shrink-0 ml-auto" />
            )}
          </div>
          <div className="flex items-center gap-1 h-7">
            {block.timeline.length === 2 ? (
              <>
                <span className="flex-1 h-full rounded-l-full flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: 'var(--bsp-blue)' }}>{block.timeline[0]}</span>
                <span className="flex-1 h-full flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: '#FBD6E4', color: '#9D174D', clipPath: 'polygon(0 0, 85% 0, 100% 50%, 85% 100%, 0 100%)' }}>{block.timeline[1]}</span>
              </>
            ) : (
              <span className="flex-1 h-full flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: '#FBD6E4', color: '#9D174D', clipPath: 'polygon(0 0, 90% 0, 100% 50%, 90% 100%, 0 100%)' }}>{block.timeline[0]}</span>
            )}
          </div>
        </div>
      )
    }
    case 'decision-tree':
      return (
        <div className="flex flex-col gap-3.5">
          <div className="rounded-2xl border border-gray-100 px-4 py-4 flex flex-col gap-3.5">
            {block.steps.map((step, i) => (
              <div key={step.number} className="flex flex-col gap-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-bsp-blue text-white text-[10px] font-black flex items-center justify-center shrink-0">{step.number}</span>
                  <p className="text-xs font-bold text-gray-800">{step.question}</p>
                </div>
                <ArrowDown className="w-4 h-4 text-gray-300 mx-auto" />
                {step.result === 'single' ? (
                  <div className="rounded-xl px-4 py-3 flex flex-col items-center gap-1" style={{ backgroundColor: PILL_STYLES.orange.tint, border: '1px solid #F5CB98' }}>
                    <span className="text-sm font-black" style={{ color: 'var(--bsp-orange)' }}>{step.label}</span>
                    <span className="text-[10px] text-gray-500">{step.hint}</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5">
                    {step.options.map(opt => {
                      const isPerfecto = opt.variant === 'perfecto'
                      return (
                        <div
                          key={opt.label}
                          className="rounded-xl px-3.5 py-3 flex flex-col items-center gap-1"
                          style={{ backgroundColor: isPerfecto ? '#FBD6E4' : '#DBEAFE', border: `1px solid ${isPerfecto ? '#F0A8C0' : '#93C5FD'}` }}
                        >
                          <span className="text-sm font-black" style={{ color: isPerfecto ? '#B5314A' : 'var(--bsp-blue)' }}>{opt.label}</span>
                          <span className="text-[10px] text-gray-500 italic text-center">{opt.hint}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
                {i < block.steps.length - 1 && <div className="border-t border-gray-100 mt-1.5" />}
              </div>
            ))}
          </div>
          {block.tip && (
            <div className="rounded-xl bg-green-100/70 border border-green-200 px-3.5 py-3">
              <p className="text-xs text-green-900 leading-relaxed">{block.tip}</p>
            </div>
          )}
        </div>
      )
  }
}

function SectionTabs({ active }: { active: 'haber' | 'participio' }) {
  const tab = (key: 'haber' | 'participio', label: string) => {
    const isActive = active === key
    const color = key === 'haber' ? TAG_STYLES.blue.solid : TAG_STYLES.orange.solid
    return (
      <span
        className="px-3 py-1 rounded-lg text-xs font-black"
        style={isActive
          ? { backgroundColor: color, color: '#fff' }
          : { backgroundColor: '#F3F4F6', color: '#9CA3AF' }}
      >
        {label}
      </span>
    )
  }
  return (
    <div className="flex items-center gap-1.5 w-fit">
      {tab('haber', 'haber')}
      {tab('participio', 'participio')}
    </div>
  )
}

function BadgeCircle({ number, color }: { number: string; color: 'blue' | 'green' }) {
  return (
    <span
      className="shrink-0 w-6 h-6 rounded-full text-white text-[11px] font-black flex items-center justify-center mt-0.5"
      style={{ backgroundColor: color === 'green' ? '#22C55E' : 'var(--bsp-blue)' }}
    >
      {number}
    </span>
  )
}

function StepView({ step }: { step: LessonStep }) {
  return (
    <div className="flex flex-col gap-5">
      {step.section && <SectionTabs active={step.section} />}
      <div className="flex items-start gap-2.5">
        <BadgeCircle number={step.number} color={step.badgeColor ?? 'blue'} />
        <div>
          <h2 className="text-base font-black text-gray-900">{step.title}</h2>
          {step.richSubtitle
            ? <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">{renderRichSubtitle(step.richSubtitle)}</p>
            : step.subtitle && <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">{renderBold(step.subtitle)}</p>}
        </div>
      </div>
      <div className="flex flex-col gap-5">
        {step.blocks.map((block, i) => <LessonBlockView key={i} block={block} />)}
      </div>
    </div>
  )
}

function SummaryView({ steps }: { steps: LessonStep[] }) {
  return (
    <div className="flex flex-col gap-5 relative">
      {steps.map((step, idx) => (
        <div key={step.number} className="flex gap-3 relative">
          <div className="flex flex-col items-center shrink-0">
            <BadgeCircle number={step.number} color={step.badgeColor ?? 'blue'} />
            {idx < steps.length - 1 && <span className="w-px flex-1 bg-gray-200 mt-1" />}
          </div>
          <div className="flex flex-col gap-2 pb-1 flex-1 min-w-0">
            <h3 className="text-sm font-black text-gray-900">{step.title}</h3>
            <div className="flex flex-col gap-2">
              {step.blocks.map((block, i) => <LessonBlockView key={i} block={block} compact />)}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function LessonPage({ params }: { params: Promise<{ tenseId: string }> }) {
  const { tenseId: rawTenseId } = use(params)
  const tenseId = resolveTenseId(rawTenseId) ?? rawTenseId
  const router = useRouter()
  const lesson = LESSONS[tenseId]
  const [page, setPage] = useState(0)

  if (!lesson) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-gray-500 text-sm">La teoría de este tiempo todavía no está disponible.</p>
        <button onClick={() => router.back()} className="text-sm font-bold text-bsp-blue">Volver</button>
      </div>
    )
  }

  const totalPages = lesson.steps.length + 1
  const isFirst = page === 0
  const isSummary = page === totalPages - 1

  const SWIPE_OFFSET_THRESHOLD = 50
  const SWIPE_VELOCITY_THRESHOLD = 500

  const goNext = () => {
    if (isSummary) router.back()
    else setPage(p => Math.min(totalPages - 1, p + 1))
  }
  const goPrev = () => {
    if (!isFirst) setPage(p => Math.max(0, p - 1))
  }

  // Horizontal swipe — handled by Framer Motion's own drag="x" on the scroll container below.
  const handleDragEnd = (_: unknown, info: PanInfo) => {
    // Ignore mostly-vertical drags so Motion's transform-based drag never fights the native scroll.
    if (Math.abs(info.offset.x) < Math.abs(info.offset.y)) return

    const isSwipe = Math.abs(info.offset.x) > SWIPE_OFFSET_THRESHOLD || Math.abs(info.velocity.x) > SWIPE_VELOCITY_THRESHOLD
    if (!isSwipe) return

    if (info.offset.x < 0) goNext()
    else goPrev()
  }

  // Vertical swipe used to turn the page too (swipe up at the bottom advanced, swipe down at the
  // top went back). In practice it fired on ordinary reading: scroll to the end of a lesson and
  // the momentum of that same gesture carried you onto the next page unasked. Page turns are
  // horizontal-only now — that is the gesture people mean when they want to move on.

  return (
    <>
      <OverscrollColor top="#2F54BA" bottom="#ffffff" />
      <div className="h-dvh flex flex-col bg-white overflow-hidden">
        {/* Header */}
        <div className="shrink-0 bg-bsp-blue px-6 pt-10 pb-6 rounded-b-3xl">
          <div className="flex items-center justify-between mb-2">
            <motion.button whileTap={{ scale: 0.88 }} onClick={() => router.back()} className="p-1 -m-1">
              <X className="w-5 h-5 text-white/80" />
            </motion.button>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--bsp-orange)' }}>
              <BookOpen className="w-3 h-3" /> Lección
            </span>
            <h1 className="text-lg font-black text-white leading-tight">{lesson.title}</h1>
            {lesson.subtitle && <p className="text-xs text-white/70 -mt-0.5">{lesson.subtitle}</p>}
          </div>
        </div>

        {/* Content — scrolls internally only when it doesn't fit; page itself never scrolls.
            Swipe lives on this outer scroll container (not the inner content div) so a touch
            anywhere in the viewport — including blank space below short content — can trigger
            the page-turn, not just a touch directly on text/cards. Horizontal only: dragDirectionLock
            keeps a vertical gesture as a plain scroll, so reading never turns the page. */}
        <motion.div
          className="thin-scroll flex-1 min-h-0 overflow-y-auto px-6 pt-6 pb-6"
          drag="x"
          dragDirectionLock
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.6}
          onDragEnd={handleDragEnd}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={page}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              {isSummary
                ? <SummaryView steps={lesson.summarySteps ?? lesson.steps} />
                : <StepView step={lesson.steps[page]} />}
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Footer */}
        <div className="shrink-0 bg-white pt-2 pb-6">
          <div className="flex items-center justify-center gap-1.5 pb-3">
            {Array.from({ length: totalPages }).map((_, i) => (
              <span
                key={i}
                className="rounded-full transition-all duration-200"
                style={{
                  width: i === page ? 16 : 6,
                  height: 6,
                  backgroundColor: i === page ? (isSummary ? 'var(--bsp-orange)' : 'var(--bsp-blue)') : '#E5E7EB',
                }}
              />
            ))}
          </div>
          <div className="flex items-center gap-3 px-6">
            {!isFirst && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setPage(p => Math.max(0, p - 1))}
                className="flex-1 flex items-center justify-center gap-1.5 py-3.5 rounded-2xl text-sm font-bold border-2 border-gray-200 text-gray-700"
              >
                <ArrowLeft className="w-4 h-4" /> Atrás
              </motion.button>
            )}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                if (isSummary) router.back()
                else setPage(p => Math.min(totalPages - 1, p + 1))
              }}
              className="flex-1 flex items-center justify-center gap-1.5 py-3.5 rounded-2xl text-sm font-black text-white"
              style={{ backgroundColor: isSummary ? 'var(--bsp-orange)' : 'var(--bsp-blue)' }}
            >
              {isSummary ? '¡Fin!' : 'Siguiente'}
              {!isSummary && <ArrowRight className="w-4 h-4" />}
            </motion.button>
          </div>
        </div>
      </div>
    </>
  )
}
