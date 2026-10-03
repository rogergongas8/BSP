'use client'

import { use, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence, type PanInfo } from 'motion/react'
import { X, BookOpen, ArrowLeft, ArrowRight, MessageSquareText, Repeat, FileText, CloudRain, Check, XCircle, CheckCircle2, ArrowDown, Lightbulb } from 'lucide-react'
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
  pink:   { border: 'border-pink-200',   arrow: 'text-pink-400',   text: 'text-pink-700',   solid: '#F55379', tint: '#FEF1F5' },
  wine:   { border: 'border-rose-300',   arrow: 'text-rose-500',   text: 'text-rose-800',   solid: '#9F1239', tint: '#FDF2F5' },
  lavender: { border: 'border-indigo-200', arrow: 'text-indigo-400', text: 'text-indigo-700', solid: '#6366F1', tint: '#EEF0FE' },
  blue: { border: 'border-blue-300', arrow: 'text-blue-500', text: 'text-blue-600', solid: '#2563EB', tint: '#EFF6FF' },
  red: { border: 'border-[#DC5A76]', arrow: 'text-[#DC5A76]', text: 'text-[#B5314A]', solid: '#DC5A76', tint: '#FDF2F5' },
}

const PASTEL_HEADER: Record<PillColor, { bg: string; text: string }> = {
  orange: { bg: '#FCE2C4', text: '#9A5B1C' },
  green: { bg: '#D2F2DC', text: '#166534' },
  pink: { bg: '#FBD6E4', text: '#9D174D' },
  wine: { bg: '#F0C9D3', text: '#881337' },
  lavender: { bg: '#D9DCFA', text: '#3730A3' },
  blue: { bg: '#DBEAFE', text: '#1E40AF' },
  red: { bg: '#FBD6E4', text: '#9D174D' },
}

function highlight(
  text: string,
  highlights: { word: string; color: 'blue' | 'orange' | 'pink' | PillColor }[],
  fallbackColor?: string,
) {
  const words = text.split(/(\s+)/)
  return words.map((w, i) => {
    const clean = w.replace(/[().,¡!]/g, '')
    const match = highlights.find(h => h.word.toLowerCase() === clean.toLowerCase())
    if (!match) return <span key={i}>{w}</span>
    let color = ''
    if (match.color === 'blue' || match.color === 'orange') {
      color = TAG_STYLES[match.color].text
    } else if (match.color === 'pink') {
      color = fallbackColor ?? '#F55379'
    } else {
      color = PILL_STYLES[match.color as PillColor]?.text || fallbackColor || '#000'
    }
    return (
      <span key={i} className="font-bold" style={{ color }}>
        {w}
      </span>
    )
  })
}


function renderBold(text: string, color?: string) {
  return text.split(/(\*\*.+?\*\*|\*.+?\*|__.+?__|\[\[.+?\]\]|!!.+?!!|\{\{.+?\}\}|\^\^.+?\^\^|==.+?==)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-gray-800" style={color ? { color } : undefined}>{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('__') && part.endsWith('__')) {
      return <strong key={i} className="font-semibold text-[#F58220]">{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('[[') && part.endsWith(']]')) {
      return <strong key={i} className="font-semibold text-green-700">{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('!!') && part.endsWith('!!')) {
      return <strong key={i} className="font-semibold text-[#E11D48]">{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('{{') && part.endsWith('}}')) {
      return <strong key={i} className="font-semibold text-[#3B82F6]">{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('^^') && part.endsWith('^^')) {
      return <strong key={i} className="font-semibold text-gray-800 underline decoration-[2px] decoration-[#3B82F6] underline-offset-4">{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('==') && part.endsWith('==')) {
      return <strong key={i} className="font-semibold text-gray-800 underline decoration-[2px] decoration-[#E11D48] underline-offset-4">{part.slice(2, -2)}</strong>
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

function renderRichSubtitle(segments: { text: string; bold?: boolean; color?: 'red' | 'blue' | 'orange'; underline?: boolean; underlineColor?: string }[]) {
  return segments.map((seg, i) => {
    const style: React.CSSProperties = seg.color ? { color: RICH_COLORS[seg.color] } : {}
    if (seg.underline) {
      style.textDecoration = 'underline'
      style.textDecorationThickness = '1.5px'
      style.textUnderlineOffset = '2px'
      if (seg.underlineColor === 'blue') style.textDecorationColor = '#3B82F6' // tailwind blue-500
      else if (seg.underlineColor) style.textDecorationColor = seg.underlineColor
    }
    return seg.bold
      ? <strong key={i} className="font-bold" style={{ color: '#4B5563', ...style }}>{seg.text}</strong>
      : <span key={i} style={style}>{seg.text}</span>
  })
}

function LessonBlockView({ block, compact }: { block: LessonBlock; compact?: boolean }) {
  switch (block.type) {
    case 'summary-group':
      return (
        <div className="flex flex-col gap-3.5 mt-3 mb-1">
          {block.title && <span className="text-xs font-bold uppercase tracking-wider text-gray-900 ml-1">{block.title}</span>}
          <div className={block.boxed ? "rounded-[20px] bg-white shadow-[0_4px_14px_rgba(0,0,0,0.04)] p-4 flex flex-col gap-4" : "flex flex-col gap-4"}>
            {block.blocks.map((b, i) => <LessonBlockView key={i} block={b} compact={true} />)}
          </div>
        </div>
      )
    case 'example-columns':
      return (
        <div className="relative pt-3 mt-4">
          <div className="absolute top-0 left-4 bg-gray-100 px-1.5">
            <span className="flex items-center gap-[4px] rounded-full border border-[#3E5C9F] text-[#3E5C9F] px-3.5 py-1 text-[10px] font-bold uppercase tracking-wide">
              <Lightbulb className="w-3.5 h-3.5" /> Ejemplo
            </span>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-[#EEF0F5] shadow-[0_4px_14px_rgba(0,0,0,0.06)] px-4 pt-8 pb-5 grid grid-cols-3 gap-y-3">
            {block.columns.map((col, i) => (
              <div key={i} className="flex flex-col gap-3">
                {col.map(word => (
                  <span key={word} className="w-[80px] mx-auto flex items-center justify-center rounded-full border border-[#91A5D8] bg-[#E3E8F4] text-[#2A4385] text-[11px] font-bold py-2 shadow-sm">
                    {word}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      )
    case 'vowel-change-table':
      return (
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#E5E7EB]">
              <tr>
                <th className="px-1.5 py-3 text-[10px] font-bold uppercase tracking-wide text-gray-500 text-center">Change</th>
                <th className="px-1.5 py-3 text-[10px] font-bold uppercase tracking-wide text-gray-500 text-center border-l-2 border-white">Infinitive</th>
                <th className="px-1.5 py-3 text-[10px] font-bold uppercase tracking-wide text-gray-500 text-center border-l-2 border-white">Stem</th>
                <th className="px-1.5 py-2 text-[9px] font-bold uppercase tracking-wide text-gray-500 text-center border-l-2 border-white leading-tight">Él/Ella<br/>Ellos/Ellas</th>
              </tr>
            </thead>
            {block.groups.map((g, gi) => (
              <tbody key={g.change.join('')} className={gi > 0 ? "border-t border-gray-200" : ""}>
                {g.rows.map((r, ri) => {
                  let diffIdx = -1;
                  for (let i = 0; i < r[1].length - 1; i++) {
                    if (r[0][i] !== r[1][i]) { diffIdx = i; break; }
                  }
                  
                  const renderInf = diffIdx !== -1 ? (
                    <>
                      {r[0].slice(0, diffIdx)}
                      <span className="text-blue-600 underline decoration-blue-500 decoration-2 underline-offset-2">{r[0][diffIdx]}</span>
                      {r[0].slice(diffIdx + 1)}
                    </>
                  ) : r[0];

                  const renderStem = diffIdx !== -1 ? (
                    <>
                      {r[1].slice(0, diffIdx)}
                      <span className="text-blue-600 underline decoration-blue-500 decoration-2 underline-offset-2">{r[1][diffIdx]}</span>
                      {r[1].slice(diffIdx + 1)}
                    </>
                  ) : r[1];

                  const base = r[1].replace('-', '');
                  const end1 = r[2].slice(base.length);
                  const end2 = r[3].slice(base.length);

                  return (
                    <tr key={r[0]} className="border-b border-gray-100 last:border-b-0">
                      {ri === 0 && (
                        <td rowSpan={g.rows.length} className="px-1.5 pt-3 pb-2 text-center align-top border-r border-gray-200 bg-[#FAFAFA]">
                          <span className="text-sm font-bold text-gray-900 inline-flex items-center justify-center gap-[4px]">
                            {g.change[0]} <ArrowRight className="w-3.5 h-3.5 text-gray-400" /> {g.change[1]}
                          </span>
                        </td>
                      )}
                      <td className="px-1.5 py-2 text-[11px] text-gray-500 text-center border-r border-gray-200 bg-white">
                        {renderInf}
                      </td>
                      <td className="px-1.5 py-2 text-[11px] font-bold text-gray-700 text-center bg-[#EAEFF5] border-r-2 border-white">
                        {renderStem}
                      </td>
                      <td className="px-1.5 py-1.5 text-[10px] bg-[#FAFAFA] text-center">
                        <div className="flex flex-col gap-0.5 leading-tight">
                          <span><strong className="font-bold text-blue-600">{base}</strong><span className="text-gray-500 font-medium">{end1}</span></span>
                          <span><strong className="font-bold text-blue-600">{base}</strong><span className="text-gray-500 font-medium">{end2}</span></span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            ))}
          </table>
        </div>
      )
    case 'formula':
      return (
        <div className="flex flex-col gap-5 mt-2">
          <div className="relative rounded-[20px] border border-gray-100 bg-white px-4 py-6 shadow-[0_4px_14px_rgba(0,0,0,0.04)] flex flex-col items-center">
            <div className="flex items-center gap-4">
              {block.parts.map((p, i) => (
                <div key={p.tag} className="flex items-center gap-4">
                  {i > 0 && <span className="text-gray-900 font-light text-xl">+</span>}
                  <div className="flex flex-col items-center gap-[4px]">
                    <span
                      className="px-4 py-2 rounded-[14px] text-[15px] font-bold text-white shadow-sm"
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
              <img
                src={block.character} alt=""
                className="absolute -bottom-2 right-2 w-[55px] object-contain shrink-0"
              />
            )}
          </div>
          {block.compareEn && (
            <div className="flex items-center gap-2.5 text-[11px] text-gray-500 font-medium px-2">
              <span>Just like in English:</span>
              <div className="flex items-center gap-2 ml-1">
                {block.compareEn.map((en, i) => {
                  const color = block.parts[i]?.color || 'blue'
                  return (
                    <div key={en} className="flex items-center gap-2">
                      {i > 0 && <span className="text-gray-400">+</span>}
                      <span className="px-3 py-1 rounded-full border bg-white shadow-sm" style={{ borderColor: TAG_STYLES[color].solid, color: TAG_STYLES[color].solid }}>
                        {en}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )
    case 'example':
      return (
        <div className="relative mt-7 mb-2">
          <div className="absolute -top-3 left-4">
            <span className="flex items-center gap-[4px] rounded-full border border-[#91A5D8] bg-white px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#3E5C9F]">
              <FileText className="w-3 h-3" /> Ejemplo
            </span>
          </div>
          <div className="rounded-[20px] border border-[#D2D6E1] bg-[#EEF0F5] px-5 pt-7 pb-5 shadow-sm overflow-x-auto">
            <div className="flex items-start justify-between w-full">
              {block.pairs.map(([es, en], i) => (
                <div key={i} className="flex flex-col gap-[4px]">
                  <span className="text-[13px] font-medium text-gray-700 whitespace-nowrap">
                    {highlight(es, block.highlights)}
                  </span>
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {highlight(en, block.highlights)}
                  </span>
                </div>
              ))}
            </div>
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
          <div className="rounded-2xl bg-orange-50 border border-orange-100 p-4 flex gap-3">
            <span className="text-xl shrink-0 mt-0.5">{block.character || '💡'}</span>
            <p className="text-sm text-gray-800 leading-relaxed pt-0.5">{renderBold(block.text)}</p>
          </div>
        )
      }
      return (
        <div className="relative px-1 mt-3 mb-2">
          {block.character ? (
            <>
              <p className="text-[11px] text-gray-600 font-light leading-relaxed pr-[70px]">{renderBold(block.text)}</p>
              <img src={block.character} className="absolute -top-16 right-0 w-[95px] z-10 object-contain pointer-events-none" />
            </>
          ) : (
            <>
              <Lightbulb className="absolute left-1 top-0.5 w-4 h-4 text-orange-500" />
              <p className="text-[11px] text-gray-600 font-light leading-relaxed pl-6">{renderBold(block.text)}</p>
            </>
          )}
        </div>
      )
    case 'outline-pills': {
      const styles = PILL_STYLES[block.color]
      const containerClass = block.columns === 4 ? 'grid grid-cols-4 gap-[4px]' : (block.columns === 2 ? 'grid grid-cols-2 gap-2' : 'flex flex-wrap gap-x-2 gap-y-2.5 justify-center')
      
      const content = (
        <div className={containerClass}>
          {block.words.map(w => (
            <span key={w} className={`flex justify-center items-center ${block.columns === 4 ? 'px-1 py-1.5 text-[11px]' : 'px-3 py-1.5 text-[11px]'} rounded-full border ${styles.border} font-bold ${styles.text}`} style={{ backgroundColor: '#FFFFFF' }}>
              {w}
            </span>
          ))}
        </div>
      )

      if (block.boxed) {
        return (
          <div className="rounded-[20px] border border-gray-100 bg-white p-5 shadow-sm">
            {content}
          </div>
        )
      }
      return content
    }
    case 'rule-cards':
      if (compact) {
        return (
          <div className="flex flex-row items-center justify-center gap-6 py-1">
            {block.items.map((item) => (
              <div key={item.suffix} className="flex items-center gap-3">
                <span className="font-bold text-gray-900 text-[13px]">{item.suffix}</span>
                <ArrowRight className="w-4 h-4 text-gray-300" />
                <span className="px-3 py-1.5 rounded-[12px] text-[13px] font-bold text-[#C2680C] bg-[#FFEAD1]">
                  {item.result}
                </span>
              </div>
            ))}
          </div>
        )
      }
      return (
        <div className="rounded-[20px] bg-white p-6 shadow-sm flex flex-col gap-8">
          {block.items.map((item, i) => (
            <div key={item.suffix} className="flex justify-center">
              <div className="grid grid-cols-[1fr_auto_1fr] gap-x-8">
                {/* Left Column */}
                <div className="flex flex-col items-center">
                  <span className="font-bold text-gray-900 text-[15px] mb-4">{item.suffix}</span>
                  <div className="flex flex-col gap-[4px] items-start">
                    {item.examples.map(([inf]) => (
                      <span key={inf} className="text-[13px] text-gray-400 font-medium">
                        {inf.slice(0, -2)}
                        <span className="text-gray-900 font-bold">{inf.slice(-2)}</span>
                      </span>
                    ))}
                  </div>
                </div>
                
                {/* Middle Column */}
                <div className="flex flex-col items-center justify-start pt-1">
                  <ArrowRight className="w-4 h-4 text-gray-300" />
                </div>
                
                {/* Right Column */}
                <div className="flex flex-col items-center">
                  <span className="px-3.5 py-1.5 rounded-[12px] text-[13px] font-bold text-[#C2410C] bg-[#FDBA74] mb-4">
                    {item.result}
                  </span>
                  <div className="flex flex-col gap-[4px] items-start">
                    {item.examples.map(([_, part]) => {
                      const suffixLen = item.result.replace('-', '').length
                      return (
                        <span key={part} className="text-[13px] text-gray-400 font-medium">
                          {part.slice(0, -suffixLen)}
                          <span className="text-[#C2410C] font-bold">{part.slice(-suffixLen)}</span>
                        </span>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )
    case 'pill-pairs': {
      const styles = PILL_STYLES[block.color]
      const styleMode = block.style || 'outline'
      const containerClass = block.columns === 3 ? 'grid grid-cols-3' : block.columns === 2 ? 'grid grid-cols-2' : 'flex flex-wrap'
      const gapClass = compact ? 'gap-2' : 
        (block.boxed ? 'gap-x-4 gap-y-4' : 
        (block.boxedStyle === 'left-border' ? 'gap-3 justify-center' : 'gap-2.5'));
      
      const inner = (
        <div className={`${containerClass} ${gapClass}`}>
          {block.items.map(([infRaw, partRaw], i) => {
            const infIsObj = typeof infRaw === 'object'
            const partIsObj = typeof partRaw === 'object'
            const inf = infIsObj ? infRaw.text : infRaw
            const part = partIsObj ? partRaw.text : partRaw
            
            const isSolid = styleMode === 'solid' || (styleMode === 'mixed' && i === 0)
            
            const renderText = (item: string | { text: string; prefixEnd?: number; underlineIdx?: number }, isLeft: boolean) => {
              if (typeof item === 'string') {
                return (
                  <span className={isLeft ? 
                    (block.boxedStyle === 'left-border' ? 'text-gray-800 font-medium' : 'text-gray-700 font-semibold') : 
                    (`font-bold ${block.boxed && block.color === 'orange' && !isSolid ? 'text-[#C2410C]' : styles.text}`)
                  }>
                    {item}
                  </span>
                )
              }
              const { text, prefixEnd, underlineIdx } = item
              const renderChar = (char: string, idx: number) => {
                return idx === underlineIdx ? <span key={idx} className="underline decoration-[1.5px] underline-offset-[3px]">{char}</span> : char
              }
              
              if (prefixEnd) {
                return (
                  <span className="text-[13px]">
                    <span className={`font-bold ${styles.text}`}>{text.slice(0, prefixEnd)}</span>
                    <span className="font-medium text-gray-700">
                      {text.slice(prefixEnd).split('').map((c, i) => renderChar(c, i + prefixEnd))}
                    </span>
                  </span>
                )
              }
              return (
                <span className={isLeft ? 'text-gray-700 font-semibold' : `font-bold ${styles.text}`}>
                  {text.split('').map((c, i) => renderChar(c, i))}
                </span>
              )
            }

            if (isSolid) {
              if (block.color === 'lavender' && i === 0) {
                return (
                  <span key={inf} className="flex items-center gap-2 rounded-full px-4 py-2 text-sm justify-center shadow-sm text-white" style={{ backgroundColor: styles.solid }}>
                    <span className="font-bold">{inf}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-white/70" />
                    <span className="font-bold">{part}</span>
                  </span>
                )
              }
              const arrowColor = infIsObj || partIsObj ? 'text-gray-400' : (block.boxedStyle === 'left-border' ? 'text-gray-400' : styles.arrow);
              return (
                <span key={inf} className={`flex items-center gap-2.5 rounded-full px-4 ${block.boxed || block.boxedStyle === 'left-border' ? 'py-2.5' : 'py-2'} text-xs justify-center`} style={{ backgroundColor: styles.tint }}>
                  {renderText(infRaw, true)}
                  <ArrowRight className={`w-3.5 h-3.5 ${arrowColor}`} />
                  {renderText(partRaw, false)}
                </span>
              )
            }
            // Outline mode
            const borderClass = block.boxed 
              ? (block.color === 'orange' ? 'border-orange-500' : `border-${block.color}-500`) 
              : styles.border;
            const arrowClass = block.boxed ? 'text-gray-300' : styles.arrow;
              
            return (
              <div key={inf} className={`flex items-center ${block.boxed ? 'w-full justify-between px-5 py-3' : 'gap-2 justify-center px-4 py-2'} rounded-full border ${borderClass}`} style={{ backgroundColor: block.boxed ? styles.tint : '#FFFFFF' }}>
                <span className={`text-gray-600 ${block.boxed ? 'text-[14px] font-medium' : 'text-xs font-semibold'}`}>{inf}</span>
                <ArrowRight className={`w-3.5 h-3.5 ${arrowClass}`} />
                <span className={`font-bold ${block.boxed && block.color === 'orange' ? 'text-[#C2410C]' : styles.text} ${block.boxed ? 'text-[14px]' : 'text-xs'}`}>{part}</span>
              </div>
            )
          })}
        </div>
      )
      
      if (block.boxed || block.boxedStyle === 'left-border') {
        if (block.boxedStyle === 'left-border') {
          return (
            <div className="rounded-[16px] bg-white p-5 shadow-sm flex flex-col gap-6" style={{ borderLeft: `4px solid ${styles.solid}` }}>
              {block.note && <p className="text-[13px] text-gray-600 leading-relaxed font-medium">{renderBold(block.note)}</p>}
              {inner}
            </div>
          )
        }
        return (
          <div className="rounded-[20px] bg-white p-6 shadow-sm flex flex-col gap-6">
            {block.note && <p className="text-[14px] text-gray-700 leading-relaxed text-center">{renderBold(block.note)}</p>}
            {inner}
          </div>
        )
      }
      return inner
    }
    case 'word-pills':
      return (
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          {block.groups.map((group, gi) => (
            <div key={gi} className="flex items-center gap-2.5">
              {group.words.map((word, wi) => (
                <div key={word} className="flex items-center gap-2.5">
                  {wi > 0 && <span className="text-gray-400 text-sm">/</span>}
                  <span
                    className="px-4 py-2 rounded-full text-sm font-bold text-white"
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
        <div className="relative mt-7 mb-2">
          <div className="absolute -top-3 left-4">
            <span className="flex items-center gap-[4px] rounded-full border border-[#91A5D8] bg-white px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#3E5C9F]">
              <FileText className="w-3 h-3" /> Ejemplo
            </span>
          </div>
          <div className="rounded-[20px] border border-[#D2D6E1] bg-[#EEF0F5] px-4 pt-6 pb-4 flex flex-col gap-2.5 shadow-sm">
            {block.items.map((item, i) => (
              <p key={i} className="text-sm font-medium text-gray-700 leading-relaxed">
                {highlight(item.text, item.highlights.map(word => ({ word, color: block.color })), styles.solid)}
              </p>
            ))}
          </div>
        </div>
      )
    }
    case 'correction-pairs':
      if (compact) {
        const gridCols = block.columns === 3 ? 'grid-cols-3' : 'grid-cols-2'
        return (
          <div className={`grid ${gridCols} gap-[4px]`}>
            {block.items.map(([wrong, correct]) => (
              <span key={wrong} className="flex items-center gap-[4px] rounded-full px-3 py-1.5 text-xs justify-center" style={{ backgroundColor: PILL_STYLES.green.tint }}>
                <span className="text-gray-500 line-through font-medium">{wrong}</span>
                <ArrowRight className="w-3.5 h-3.5 text-green-500" />
                <span className="font-bold text-[#15803D]">{correct}</span>
              </span>
            ))}
          </div>
        )
      }
      return (
        <div className="relative bg-white py-6 px-8 shadow-[0_4px_14px_rgba(0,0,0,0.06)] overflow-hidden rounded-r-[20px] rounded-l-none border-l-[3px] border-[#15803D]">
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            {block.items.map(([wrong, correct]) => (
              <span key={wrong} className="flex items-center gap-2 rounded-full px-4 py-2 text-[13px] justify-center" style={{ backgroundColor: PILL_STYLES.green.tint }}>
                <span className="text-gray-500 line-through font-medium">{wrong}</span>
                <ArrowRight className="w-4 h-4 text-green-500" />
                <span className="font-bold text-[#15803D]">{correct}</span>
              </span>
            ))}
          </div>
        </div>
      )
    case 'stem-cloud':

      return (
        <div className="rounded-[24px] bg-white p-6 shadow-sm flex flex-col gap-3">
          {Array.from({ length: Math.ceil(block.stems.length / 2) }).map((_, rowIndex) => {
            const rowStems = block.stems.slice(rowIndex * 2, rowIndex * 2 + 2)
            const isIndented = rowIndex % 2 === 1
            return (
              <div key={rowIndex} className={`flex justify-center gap-4 ${isIndented ? 'pl-8' : 'pr-8'}`}>
                {rowStems.map(([inf, stem]) => (
                  <div key={inf} className="flex items-center gap-2 rounded-full bg-[#FFF7F0] border border-[#C2410C] px-4 py-2">
                    <span className="text-xs text-gray-600">{inf}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-[14px] font-bold text-orange-500">{stem}</span>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )
    case 'stem-formula':
      if (compact) {
        return (
          <div className="grid grid-cols-2 gap-[4px]">
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
        <div className="flex items-stretch justify-center gap-6 py-2">
          <div className="flex flex-col gap-3 w-[120px]">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 text-center">Stem</span>
            <div className="flex flex-col gap-3">
              {block.stems.map(([inf, stem]) => (
                <div key={inf} className="rounded-[16px] border border-gray-100 bg-white py-3 flex flex-col items-center justify-center shadow-sm">
                  <span className="text-[10px] text-gray-400 mb-0.5">{inf}</span>
                  <span className="text-[15px] font-bold text-orange-500">{stem}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-center pt-6">
            <span className="text-[40px] font-light text-gray-900 leading-none">+</span>
          </div>
          <div className="flex flex-col gap-3 w-[120px]">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 text-center">Ending</span>
            <div className="flex-1 rounded-[16px] border border-gray-100 bg-white py-4 flex flex-col items-center justify-center shadow-sm">
              <div className="flex flex-col gap-3 items-center">
                {block.endings.map(e => (
                  <span key={e} className="text-[15px] font-bold text-orange-700">{e}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )
    case 'infinitive-table': {
      const renderInf = (inf: string) => {
        if (inf.endsWith('car') || inf.endsWith('gar') || inf.endsWith('zar')) {
          const char = inf.slice(-3, -2);
          return <>{inf.slice(0, -3)}<span className="underline decoration-2 underline-offset-2 decoration-gray-400">{char}</span>{inf.slice(-2)}</>;
        }
        return inf;
      }
      const renderYo = (yo: string) => {
        if (yo.endsWith('qué') || yo.endsWith('gué') || yo.endsWith('cé')) {
          const char = yo.endsWith('cé') ? 'c' : yo.slice(-3, -1);
          const len = char.length;
          return <>{yo.slice(0, -(len + 1))}<span className="underline decoration-2 underline-offset-2 decoration-orange-500">{char}</span>é</>;
        }
        return yo;
      }
      return (
        <div className="rounded-[20px] border border-gray-100 bg-white overflow-hidden shadow-sm mx-auto w-full max-w-sm">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#F8B973]">
              <tr>
                {block.headers.map((h, i) => (
                  <th key={h} className={`px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-800 ${i > 0 ? 'border-l-2 border-white' : ''}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map(([inf, stem], i) => (
                <tr key={inf} className="border-b border-gray-100 last:border-b-0">
                  <td className="px-6 py-4 text-xs text-gray-700 border-r border-gray-100 w-1/2">
                    {renderInf(inf)}
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-orange-500 w-1/2">
                    {renderYo(stem)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }
    case 'trio-table':
      return (
        <div className="rounded-xl border border-gray-100 bg-white overflow-hidden mt-4">
          <div className="grid grid-cols-[1fr_1fr_1.3fr] bg-[#EAEAEA]">
            {block.headers.map((h, i) => (
              <div key={h} className={`px-4 py-2 ${i > 0 ? 'border-l border-white' : ''}`}>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{h}</span>
              </div>
            ))}
          </div>
          <div className="bg-white">
            {block.rows.map(([inf, stem, form], i) => (
              <div key={inf} className={`grid grid-cols-[1fr_1fr_1.3fr] ${i > 0 ? 'border-t border-gray-100' : ''}`}>
                <div className="px-4 py-3 border-r border-gray-100">
                  <span className="text-xs text-gray-600">{inf}</span>
                </div>
                <div className="px-4 py-3 border-r border-gray-100">
                  <span className="text-xs font-bold text-gray-800">
                    {stem.split('j').map((part, idx, arr) => (
                      <span key={idx}>
                        {part}
                        {idx < arr.length - 1 && <span className="text-orange-500">j</span>}
                      </span>
                    ))}
                  </span>
                </div>
                <div className="px-4 py-3">
                  {typeof form === 'string' ? (
                    <span className="text-xs font-bold text-orange-500 underline decoration-2 underline-offset-2">{form}</span>
                  ) : (
                    <span className="text-xs font-bold text-orange-500">
                      {form.text.split(form.underline)[0]}
                      <span className="underline decoration-2 underline-offset-2">{form.underline}</span>
                      {form.text.split(form.underline)[1]}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    case 'boxed-pairs': {
      let accentColor = 'var(--bsp-orange)'
      if (block.accent === 'green') accentColor = '#15803D'
      if (block.accent === 'pink') accentColor = '#F55379'
      if (block.accent === 'blue') accentColor = '#2563EB'
      const highlightBg = block.accent === 'orange' ? '#FDBA74' : accentColor
      const highlightText = block.accent === 'orange' ? '#C2410C' : '#FFFFFF'
      
      const containerClasses = block.accent === 'green' 
        ? 'rounded-r-[20px] rounded-l-none border-l-[3px] border-[#15803D]' 
        : 'rounded-[20px]'

      const InnerGrid = (
        <div className={`grid grid-rows-3 grid-flow-col grid-cols-2 ${compact ? 'gap-2' : 'gap-2.5'}`}>
          {block.rows.map(([person, form], i) => {
            const hasHighlight = block.highlightIndex !== undefined
            const isHighlighted = hasHighlight && (Array.isArray(block.highlightIndex) ? block.highlightIndex.includes(i) : block.highlightIndex === i)
            const dimUnselected = hasHighlight && !isHighlighted
            return (
              <div
                key={person}
                className={`rounded-xl px-4 py-3 flex items-center justify-between gap-2 border border-gray-100 bg-white ${dimUnselected ? 'opacity-40' : ''}`}
                style={isHighlighted
                  ? { backgroundColor: highlightBg, borderColor: highlightBg }
                  : {}}
              >
                <span className={`text-xs ${isHighlighted ? '' : 'text-gray-500'}`} style={isHighlighted ? { color: highlightText } : {}}>{person}</span>
                <span className={`text-[13px] font-bold leading-tight text-right ${isHighlighted ? '' : ''}`} style={isHighlighted ? { color: highlightText } : { color: block.accent === 'orange' ? '#C2410C' : accentColor }}>
                  {typeof form === 'string' ? (
                    form.split('/').map((part, idx, arr) => (
                      <span key={idx}>
                        {part.replace(/-/g, '\u2011')}
                        {idx < arr.length - 1 && <>/</>}
                        {idx < arr.length - 1 && <br />}
                      </span>
                    ))
                  ) : (
                    <span>
                      {form.text.split(form.underline)[0]}
                      <span className="underline decoration-2 underline-offset-2">{form.underline}</span>
                      {form.text.split(form.underline)[1]}
                    </span>
                  )}
                </span>
              </div>
            )
          })}
        </div>
      )

      if (compact) return InnerGrid

      return (
        <div className={`relative bg-white p-4 shadow-sm overflow-hidden ${containerClasses}`}>
          {InnerGrid}
          {block.note && (
            <div className="mt-5 pt-1 pr-12">
              <p className="text-[11px] text-gray-400 italic leading-relaxed">{block.note}</p>
            </div>
          )}
          {block.character && (
            <img
              src={block.character} alt=""
              className="absolute bottom-2 right-1 w-[48px] object-contain shrink-0"
            />
          )}
        </div>
      )
    }
    case 'example-words': {
      const styles = PILL_STYLES[block.color]
      const boxStyles = block.boxColor ? PILL_STYLES[block.boxColor] : styles
      return (
        <div className="relative mt-7 mb-2">
          <div className="absolute -top-3 left-4">
            <span className="flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-white" style={{ borderColor: boxStyles.solid, color: boxStyles.solid }}>
              <MessageSquareText className="w-3 h-3" /> Ejemplo
            </span>
          </div>
          <div className="rounded-[20px] border bg-white px-3 pt-6 pb-4 flex flex-wrap gap-2 justify-start" style={{ backgroundColor: boxStyles.tint, borderColor: boxStyles.border }}>
            {block.words.map((w, i) => {
              if (typeof w === 'string') {
                return <span key={w} className={`px-3 py-1 rounded-full border ${styles.border} text-xs font-medium ${styles.text}`} style={{ backgroundColor: styles.tint }}>{w}</span>
              } else {
                const parts = w.text.split(w.underline)
                return (
                  <span key={w.text} className={`px-3 py-1 rounded-full border ${styles.border} text-xs font-medium ${styles.text}`} style={{ backgroundColor: styles.tint }}>
                    {parts[0]}<span className="underline decoration-2 underline-offset-2" style={{ textDecorationColor: styles.solid }}>{w.underline}</span>{parts[1]}
                  </span>
                )
              }
            })}
          </div>
        </div>
      )
    }
    case 'dual-conjugation':
      if (compact && block.style !== 'pastel') {
        return (
          <div className="flex flex-col gap-3">
            {block.groups.map(group => (
              <div key={group.label} className="flex flex-col gap-[4px]">
                <span className="text-xs font-bold" style={{ color: PILL_STYLES[group.color].solid }}>{group.label.toUpperCase()}</span>
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
        <div className={block.style === 'pastel' ? 'rounded-[20px] border border-gray-100 bg-white p-5 shadow-sm' : 'rounded-2xl border border-gray-100 bg-white overflow-hidden flex'}>
          <div className={block.style === 'pastel' ? 'grid grid-cols-2 gap-4' : 'flex'}>
            {block.groups.map((group, gi) => {
              const isPastel = block.style === 'pastel'
              
              return (
                <div key={group.label} className={`flex flex-col ${isPastel ? '' : (gi > 0 ? 'border-l border-gray-100' : '')} flex-1`}>
                  <span className={isPastel
                    ? `px-3 py-2 text-center text-xs font-bold uppercase tracking-wide rounded-full mb-4 w-[90%] mx-auto ${gi === 0 ? 'bg-[#98ACDA] text-[#273B73]' : 'bg-[#DEE3F1] text-[#273B73]'}`
                    : 'px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wide bg-gray-50 text-gray-500'}>
                    {group.label}
                  </span>
                  <div className={`flex flex-col ${isPastel ? 'gap-2.5' : ''}`}>
                    {group.rows.map(([pronoun, ending], i) => {
                      const isHighlighted = Array.isArray(group.highlightIndex)
                        ? group.highlightIndex.includes(i)
                        : group.highlightIndex === i
                      if (isPastel) {
                        return (
                          <div key={pronoun} className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border ${isHighlighted ? 'border-orange-400' : 'border-gray-200'}`}>
                            <span className="text-xs text-gray-500 font-medium">{pronoun}</span>
                            <span className="text-[13px] font-bold text-[#2A4385]">{ending}</span>
                          </div>
                        )
                      }
                      return (
                        <div key={pronoun} className={`flex items-center justify-between px-4 py-2.5 ${i > 0 ? 'border-t border-gray-100' : ''} ${isHighlighted ? 'bg-orange-50' : 'bg-white'}`}>
                          <span className={`text-[10px] font-bold uppercase tracking-wide ${isHighlighted ? 'text-orange-600' : 'text-gray-400'}`}>{pronoun}</span>
                          <span className={`text-sm font-bold ${isHighlighted ? 'text-orange-600' : 'text-gray-900'}`}>{ending}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
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
    case 'subject-stem-cards': {
      const { tint, text, arrow } = PILL_STYLES[block.color]
      const bg = PASTEL_HEADER[block.color]?.bg || tint
      return (
        <div className={`grid ${compact ? 'gap-3 grid-cols-2' : 'gap-4 grid-cols-2'}`}>
          {block.cards.map((card, i) => (
            <div key={i} className={`rounded-[24px] px-5 py-4 flex items-center justify-between shadow-sm`} style={{ backgroundColor: bg }}>
              <div className="flex flex-col text-[12px] text-gray-800 leading-snug">
                {card.subjects.map(s => <span key={s}>{s}</span>)}
              </div>
              <div className="flex items-center gap-2.5">
                <ArrowRight className={`w-3.5 h-3.5 ${arrow}`} />
                <span className={`text-[15px] font-bold ${text}`}>
                  {typeof card.stem === 'string' ? (
                    card.stem
                  ) : (
                    <>
                      {card.stem.text.split(card.stem.underline)[0]}
                      <span className="underline decoration-2 underline-offset-2">{card.stem.underline}</span>
                      {card.stem.text.split(card.stem.underline)[1]}
                    </>
                  )}
                </span>
              </div>
            </div>
          ))}
        </div>
      )
    }
    case 'stem-cards':
      return (
        <div className={`grid w-full px-2 ${compact ? 'grid-cols-3 gap-[4px]' : 'grid-cols-3 gap-3'}`}>
          {block.items.map(([inf, stem]) => (
            <div key={inf} className="rounded-xl border border-gray-200 bg-white px-3 py-3 flex flex-col items-center shadow-sm">
              <span className="text-[10px] text-gray-400">{inf}</span>
              <span className="text-sm font-bold text-blue-600">{stem}</span>
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
              <div key={item.title} className="rounded-2xl border border-gray-100 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] px-4 py-4 flex flex-col gap-3">
                <div className="flex items-center gap-4">
                  {item.image ? (
                    <Image src={item.image} alt="" width={60} height={60} className="object-contain shrink-0" />
                  ) : (
                    <span className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center shrink-0 overflow-hidden">
                      <Icon className="w-4 h-4 text-gray-400" />
                    </span>
                  )}
                  <div>
                    <p className="text-[14px] font-bold text-gray-900 leading-snug">{item.title}</p>
                    <p className="text-[12px] text-gray-600 font-medium leading-snug">{renderBold(item.desc)}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 mt-1">
                  {item.examples.map(ex => (
                    <p key={ex} className="text-xs text-gray-700 rounded-xl px-3 py-2.5" style={{ backgroundColor: PILL_STYLES.orange.tint }}>
                      {renderBold(ex, PILL_STYLES.orange.solid)}
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
        <div className="rounded-2xl border border-orange-200 bg-orange-50/50 px-4 py-4 flex flex-col gap-3">
          <div className="flex items-start gap-2.5">
            <Lightbulb className="w-4 h-4 shrink-0 mt-0.5 text-orange-400" strokeWidth={2.5} />
            <p className="text-[13px] text-gray-700 leading-snug">{renderBold(block.text)}</p>
          </div>
          <div className="flex flex-col gap-2 mt-1">
            <div className="flex items-center gap-2.5 rounded-lg border border-green-500 bg-[#E8F8EE] px-3.5 py-2.5">
              <CheckCircle2 className="w-4 h-4 text-white fill-green-600 shrink-0" />
              <span className="text-xs text-gray-900">{renderBold(block.correct, '#16a34a')}</span>
            </div>
            <div className="flex items-center gap-2.5 rounded-lg border border-[#D94F69] bg-[#FCE8EB] px-3.5 py-2.5">
              <XCircle className="w-4 h-4 text-white fill-[#D94F69] shrink-0" />
              <span className="text-xs text-gray-900">{renderBold(block.incorrect, '#D94F69')}</span>
            </div>
          </div>
          <p className="text-[11px] text-gray-500 italic leading-snug">{block.caption}</p>
        </div>
      )
    case 'now-then-list':
      return (
        <div className="flex flex-col gap-3">
          {block.groups.map(group => (
            <div key={group.now} className="flex flex-col gap-3 rounded-2xl bg-white px-4 py-4 shadow-sm border border-gray-100">
              {!compact && group.label && (
                <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400 border-b border-orange-300 pb-1.5">{group.label}</span>
              )}
              <div className="flex items-center gap-3">
                <span className="shrink-0 px-2.5 py-1 rounded-full bg-[#8E94A2] text-white text-[10px] font-bold">NOW</span>
                <p className="text-[12px] text-gray-800 flex-1 leading-snug">{renderBold(group.now)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="shrink-0 px-2.5 py-1 rounded-full bg-[#FBA862] text-gray-900 text-[10px] font-bold">BACK THEN</span>
                <p className="text-[12px] text-gray-800 flex-1 leading-snug">{renderBold(group.then, '#F58220')}</p>
              </div>
            </div>
          ))}
          {block.character && !compact && (
            <div className="flex justify-center mt-4 mb-2">
              <Image src={block.character} alt="" width={200} height={200} className="object-contain" />
            </div>
          )}
        </div>
      )
    case 'main-action-example': {
      const formatSentence = (sentence: string, bgP: string, actP: string) => {
        const parts = sentence.split(new RegExp(`(${bgP}|${actP})`, 'i'))
        return parts.map((part, i) => {
          if (part.toLowerCase() === bgP.toLowerCase()) {
            return <strong key={i} className="font-bold text-[#F58220]">{part}</strong>
          }
          if (part.toLowerCase() === actP.toLowerCase()) {
            return <strong key={i} className="font-bold text-[#2563EB] underline decoration-[1.5px] underline-offset-2">{part}</strong>
          }
          return <span key={i}>{part}</span>
        })
      }

      return (
        <div className="rounded-[1.25rem] border border-gray-100 bg-white shadow-sm p-4 flex flex-col gap-3.5">
          <p className="text-[13px] text-gray-800 leading-snug">
            {formatSentence(block.sentence, block.backgroundPhrase, block.actionPhrase)}
          </p>

          <div className="w-full h-px bg-gray-100 mt-1" />

          <div className="flex gap-4 w-full mt-3">
            <div className="flex-1 flex flex-col relative pt-1 gap-2">
              {/* Visual Track */}
              <div className={`relative ${block.layout === 'center' ? 'h-[100px]' : 'h-[76px]'} w-full flex items-center justify-center`}>
                {/* Dashed orange track */}
                <div className={`absolute ${block.layout === 'center' ? 'left-0 right-0 h-[80px]' : 'left-0 right-8 h-[56px]'} rounded-full border-[1.5px] border-dashed border-orange-300 bg-[#FFF8F0] z-0`} />
                {/* BG Image */}
                <div className={`absolute inset-0 z-10 flex items-center justify-center ${block.layout === 'center' ? '' : 'pr-16'}`}>
                  {block.bgImage && (
                    <Image 
                      src={block.bgImage} 
                      width={300} 
                      height={120} 
                      className={`object-contain ${block.layout === 'center' ? 'w-full h-[120px] -mt-3' : 'w-[160px] h-[80px]'}`} 
                      alt="" 
                    />
                  )}
                </div>
                {/* Action circle */}
                <div className={`absolute ${block.layout === 'center' ? 'left-1/2 -translate-x-1/2' : 'right-0'} top-1/2 -translate-y-1/2 w-[54px] h-[54px] rounded-full bg-[#2563EB] border-[2px] border-white flex items-center justify-center z-20 overflow-hidden shadow-sm`}>
                  {block.actionImage && (
                    <Image 
                      src={block.actionImage} 
                      width={80} 
                      height={80} 
                      className={`object-cover max-w-none ${block.layout === 'center' ? 'w-[130%] h-[130%] object-[50%_25%]' : 'w-[180%] h-[180%] translate-y-4'}`} 
                      alt="" 
                    />
                  )}
                </div>
              </div>

              {/* Labels */}
              {block.layout === 'center' ? (
                <div className="relative w-full mt-1 flex flex-col items-center justify-center rounded-[20px] border-[1.5px] border-dashed border-orange-300 bg-[#FFF8F0] py-3 gap-2 px-4 mx-auto max-w-[220px]">
                  <div className="h-8 px-4 rounded-full border-[1.5px] border-[#2563EB] bg-white flex items-center justify-center shadow-sm">
                    <span className="text-[12px] font-bold text-[#2563EB] whitespace-nowrap">{block.actionPhrase}</span>
                  </div>
                  <span className="text-[12px] font-bold text-[#D97706] text-center leading-tight">{block.backgroundPhrase}</span>
                </div>
              ) : (
                <div className="relative h-9 w-full mt-1">
                  <div className="absolute left-0 right-8 h-full rounded-full border-[1.5px] border-dashed border-orange-300 bg-[#FFF8F0] flex items-center justify-center">
                    <span className="text-[12px] font-bold text-[#D97706]">{block.backgroundPhrase}</span>
                  </div>
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 h-8 px-4 rounded-full border-[1.5px] border-[#2563EB] bg-white flex items-center justify-center shadow-sm z-10">
                    <span className="text-[12px] font-bold text-[#2563EB] whitespace-nowrap">{block.actionPhrase}</span>
                  </div>
                </div>
              )}
            </div>

            {/* You now */}
            {/* Placed in the same flex row, top-aligned visually with the main track */}
            <div className={`shrink-0 flex flex-col items-center justify-center w-[56px] pt-1 ${block.layout === 'center' ? 'h-[100px]' : 'h-[76px]'}`}>
              <span className="text-[10px] font-bold text-gray-700 mb-1.5 whitespace-nowrap">You now</span>
              <Image src="/images/teoria/imperfectovsindefinido/Profile - Mimo.png" width={56} height={56} className="object-contain" alt="" />
            </div>
          </div>
        </div>
      )
    }
    case 'narration-chain':
      return (
        <div className="flex flex-col">
          {block.paragraph && (
            <div className="pb-5 mb-5 border-b border-gray-100">
              <p className="text-[13px] italic text-gray-500 leading-relaxed">{block.paragraph}</p>
            </div>
          )}
          
          <div className="flex flex-col pl-2">
            {block.imperfectoLines.map((line, i) => (
              <div key={line} className="flex items-stretch gap-4">
                <div className="flex flex-col items-center w-10 shrink-0 pt-0.5">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-white border border-gray-100 flex items-center justify-center shadow-sm z-10 shrink-0 relative">
                    <Image src="/images/profile/small-loading2.png" width={48} height={48} className="object-cover w-full h-full absolute" alt="" />
                  </div>
                  {i < block.imperfectoLines.length - 1 && (
                    <div className="w-[2px] flex-1 bg-[#F58220] -my-1 relative z-0" style={{ minHeight: '32px' }} />
                  )}
                </div>
                <div className="pb-4 flex-1 flex items-start">
                  <span className="inline-block text-[13px] font-bold px-4 py-2.5 rounded-[12px] border-[1.5px] border-dashed border-[#FBA862] bg-[#FFF8F0] text-gray-900 shadow-sm">
                    {line}
                  </span>
                </div>
              </div>
            ))}
            
            <div className="flex items-start gap-4 mt-2">
              <div className="flex flex-col items-center w-10 shrink-0 pt-1">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-white border border-gray-100 flex items-center justify-center shadow-sm shrink-0 relative">
                  {block.closingIcon && (
                    <Image src={block.closingIcon} width={48} height={48} className="object-cover w-full h-full absolute" alt="" />
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 flex-1">
                <span className="inline-block text-[14px] font-bold px-5 py-2.5 rounded-[12px] bg-[#3B82F6] text-white shadow-sm">
                  {block.indefinidoLine}
                </span>
                <div className="flex items-center gap-1 text-[12px] text-gray-400 font-medium">
                  <ArrowLeft className="w-4 h-4" />
                  <span>closes the narration</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    case 'toggle-pair':
      return (
        <div className="grid grid-cols-2 gap-3 mt-2">
          <div className="rounded-[1.25rem] border border-[#C5E1B5] bg-[#EEF5EA] px-4 py-6 flex flex-col items-center justify-center gap-[4px] shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Simple</span>
            <span className="text-[15px] font-bold text-gray-900">{block.simple}</span>
          </div>
          <div className="rounded-[1.25rem] border border-gray-100 bg-white px-4 py-6 flex flex-col items-center justify-center gap-[4px] shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Progressive</span>
            <span className="text-[15px] font-bold text-gray-900">{block.progressive}</span>
          </div>
        </div>
      )
    case 'exception-pairs': {
      const content = (
        <div className={`grid grid-cols-2 ${compact ? 'gap-2' : 'gap-3'}`}>
          {block.items.map(([correct, wrong]) => (
            <div key={correct} className={`rounded-full bg-white border ${block.note ? 'border-orange-200' : 'border-gray-100'} px-3 py-2.5 flex items-center justify-center gap-2 shadow-sm`}>
              <span className="text-[13px] font-bold text-green-600">{correct}</span>
              <span className="text-[11px] font-medium text-red-400 line-through decoration-red-400/60">{wrong}</span>
            </div>
          ))}
        </div>
      )

      if (block.note) {
        return (
          <div className="rounded-[1.25rem] border border-orange-200 bg-[#FFF8F0] p-4 mt-2 shadow-sm">
            <div className="flex items-start gap-2.5 mb-4">
              <Lightbulb className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
              <p className="text-[13px] text-gray-800 leading-snug">{renderBold(block.note)}</p>
            </div>
            {content}
          </div>
        )
      }

      if (block.title) {
        return (
          <div className="flex flex-col gap-2.5 mt-3">
            <span className="text-[11px] font-bold text-gray-900 ml-1">{block.title}</span>
            {content}
          </div>
        )
      }

      return content
    }
    case 'dual-card': {
      const cardBg = { blue: 'var(--bsp-blue)', blueLight: '#5B7FD6', red: '#B5314A' }
      const exampleBg = { blue: { bg: '#DBEAFE', text: '#1E40AF' }, blueLight: { bg: '#EEF0FE', text: '#3730A3' }, red: { bg: '#FBD6E4', text: '#9D174D' } }
      const cardBorder = { blue: '#A9C0ED', blueLight: '#91A5D8', red: '#F1A9BC' }
      const nestedBg = { blue: '#E1EDFB', red: '#FDE9EF' }
      
      return (
        <div className="grid grid-cols-2 gap-3">
          {block.cards.map(card => (
            <div key={card.label} className="rounded-[1.25rem] border bg-white overflow-hidden flex flex-col shadow-sm" style={{ borderColor: cardBorder[card.color] }}>
              <span className="px-2 py-2.5 text-center text-[11px] font-bold text-white tracking-wide" style={{ backgroundColor: cardBg[card.color] }}>{card.label}</span>
              <div className="px-3.5 py-4 flex flex-col gap-3 flex-1 items-center justify-start">
                <div className={`flex items-center gap-2 ${!card.icon ? 'justify-center text-center' : ''}`}>
                  {card.icon && <Image src={card.icon} alt="" width={28} height={28} className="object-contain shrink-0" />}
                  <p className="text-[12px] text-gray-700 leading-snug">{renderBold(card.text)}</p>
                </div>
                {card.nestedConsequence && (
                  <div className="rounded-[1rem] border overflow-hidden mt-1 flex flex-col w-full" style={{ borderColor: cardBorder[card.color] }}>
                    <div className="px-3 py-3 flex items-center justify-center text-center" style={{ backgroundColor: card.color === 'red' ? nestedBg.red : nestedBg.blue }}>
                      <p className="text-[12px] font-bold text-gray-900 leading-snug">{card.nestedConsequence.quote}</p>
                    </div>
                    <div className="flex items-center gap-2.5 px-3 py-2.5 bg-white">
                      <Image src={card.nestedConsequence.icon} alt="" width={24} height={24} className="object-contain shrink-0" />
                      <p className="text-[10px] text-gray-600 leading-tight font-medium text-left">{card.nestedConsequence.caption}</p>
                    </div>
                  </div>
                )}
                {card.exampleRich ? (
                  <p className="text-[11px] rounded-lg px-2.5 py-2 w-full text-center" style={{ backgroundColor: exampleBg[card.color].bg }}>
                    <span className="underline decoration-[1.5px] underline-offset-2" style={{ color: card.color === 'red' ? '#B5314A' : '#1E40AF', textDecorationColor: card.color === 'red' ? '#DC5A76' : '#60A5FA' }}>{card.exampleRich.underline}</span>
                    {' '}
                    <strong className="font-bold" style={{ color: card.color === 'red' ? '#B5314A' : '#1E40AF' }}>{card.exampleRich.bold}</strong>
                    <span className="text-gray-500">{card.exampleRich.rest}</span>
                  </p>
                ) : card.example ? (
                  <p className="text-[12px] rounded-[10px] px-3 py-2.5 w-full text-center leading-snug" style={{ backgroundColor: exampleBg[card.color].bg, color: exampleBg[card.color].text }}>{renderBold(card.example)}</p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )
    }
    case 'time-unit-card': {
      const isPerfecto = block.variant === 'perfecto' || block.variant === 'perfecto-split'
      const isSplit = block.variant === 'indefinido' || block.variant === 'perfecto-split'
      const leftFillColor = block.variant === 'perfecto-split' ? '#B5314A' : '#DBEAFE'
      const headerColor = isPerfecto ? '#B5314A' : 'var(--bsp-blue)'
      const softColor = isPerfecto ? '#DC5A76' : '#5B7FD6'
      return (
        <div className={block.hideHeader ? "flex flex-col gap-3.5" : "rounded-2xl border border-gray-100 bg-white overflow-hidden"}>
          {!block.hideHeader && (
            <span className="block px-3 py-2.5 text-center text-xs font-bold text-white uppercase tracking-wide" style={{ backgroundColor: headerColor }}>
              {isPerfecto ? 'Perfecto' : 'Indefinido'}
            </span>
          )}
          <div className={`${block.hideHeader ? '' : 'px-4 py-3.5'} flex flex-col gap-3.5`}>
            {block.desc && <p className="text-xs text-gray-700">{renderBold(block.desc)}</p>}
            {block.timeUnits && (
              <div className="flex flex-wrap justify-center gap-2 pb-2.5 border-b" style={{ borderBottomColor: isPerfecto ? 'rgba(220, 90, 118, 0.4)' : 'rgba(91, 127, 214, 0.4)' }}>
                {block.timeUnits.map(u => (
                  <span key={u} className="px-2.5 py-1 rounded-full border text-xs font-medium" style={{ borderColor: softColor, color: headerColor }}>{u}</span>
                ))}
              </div>
            )}
            {block.diagram && (
              <div className="flex flex-col items-center gap-[4px] mt-2 w-[92%] mx-auto">
                <div className={`w-full text-[10px] text-gray-800 font-bold px-2 ${block.diagram.times?.length === 3 ? 'grid grid-cols-3 text-center' : 'grid grid-cols-2 text-center'}`}>
                  <span>The event</span>
                  <span>You</span>
                  {block.diagram.times?.length === 3 && <span></span>}
                </div>
                <div className={`relative w-full px-1 py-1 ${block.diagram.times?.length === 3 ? 'grid grid-cols-3 justify-items-center' : 'grid grid-cols-2 justify-items-center'}`}>
                  <div className={`absolute inset-x-0 h-14 top-1/2 -translate-y-1/2 flex ${block.variant === 'perfecto-split' ? '' : 'justify-between gap-1'}`}>
                    {!isSplit ? (
                      <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                        <polygon points="0,25 80,25 80,0 100,50 80,100 80,75 0,75" fill="#FBD6E4" />
                      </svg>
                    ) : (
                      <>
                        <svg className={`${block.variant === 'perfecto-split' ? 'w-[50%]' : 'w-[48%]'} h-full`} preserveAspectRatio="none" viewBox="0 0 100 100">
                          {block.variant === 'indefinido' ? (
                            <polygon points="0,25 92,25 92,10 100,10 100,90 92,90 92,75 0,75" fill={leftFillColor} />
                          ) : (
                            <polygon points="0,25 100,25 100,75 0,75" fill={leftFillColor} />
                          )}
                        </svg>
                        <svg className={`${block.variant === 'perfecto-split' ? 'w-[50%]' : 'w-[48%]'} h-full`} preserveAspectRatio="none" viewBox="0 0 100 100">
                          <polygon points="0,25 75,25 75,0 100,50 75,100 75,75 0,75" fill="#FBD6E4" />
                        </svg>
                      </>
                    )}
                  </div>
                  <Image src={block.diagram.eventIcon} alt="" width={52} height={52} className="relative object-contain" />
                  <Image src={block.diagram.youIcon} alt="" width={52} height={52} className={`relative object-contain ${block.diagram.youIconFlipped ? 'scale-x-[-1]' : ''}`} />
                  {block.diagram.times?.length === 3 && <div></div>}
                </div>
                {block.diagram.times && (
                  <div className={`w-full text-[9px] text-gray-400 px-1 ${block.diagram.times.length === 3 ? 'grid grid-cols-3 text-center' : 'flex justify-between'}`}>
                    {block.diagram.times.map((t, idx) => <span key={idx}>{t}</span>)}
                  </div>
                )}
                {block.diagram.bottomIcons && (
                  <div className="flex justify-between w-[75%] mx-auto mt-1 px-1 relative z-10">
                    <Image src={block.diagram.bottomIcons.left} alt="" width={42} height={42} className="object-contain" />
                    <Image src={block.diagram.bottomIcons.right} alt="" width={42} height={42} className="object-contain" />
                  </div>
                )}
              </div>
            )}
            {block.durationsLayout === 'stack' ? (
              <div className="flex flex-col gap-2 w-[92%] mx-auto mt-1">
                <div className="grid grid-cols-2 gap-2">
                  {block.durations[0] && (
                    <span
                      className="text-center px-3 py-1.5 rounded-full text-xs font-bold"
                      style={block.durations[0].variant === 'perfecto-solid' ? { backgroundColor: '#B5314A', color: '#fff', border: '1px solid #B5314A' } : block.durations[0].variant === 'perfecto' ? { border: '1px solid #DC5A76', backgroundColor: '#FDF2F5', color: '#B5314A' } : { border: '1px solid #5B7FD6', backgroundColor: '#EFF6FF', color: '#1D4ED8' }}
                    >
                      {block.durations[0].label}
                    </span>
                  )}
                  <div></div>
                </div>
                {block.durations[1] && (
                  <span
                    className="w-full text-center px-3 py-1.5 rounded-full text-xs font-bold"
                    style={block.durations[1].variant === 'perfecto-solid' ? { backgroundColor: '#B5314A', color: '#fff', border: '1px solid #B5314A' } : block.durations[1].variant === 'perfecto' ? { border: '1px solid #DC5A76', backgroundColor: '#FDF2F5', color: '#B5314A' } : { border: '1px solid #5B7FD6', backgroundColor: '#EFF6FF', color: '#1D4ED8' }}
                  >
                    {block.durations[1].label}
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 w-[92%] mx-auto mt-1">
                {block.durations.map(d => (
                  <span
                    key={d.label}
                    className="flex-1 text-center px-3 py-1.5 rounded-full text-xs font-bold"
                    style={d.variant === 'perfecto-solid' ? { backgroundColor: '#B5314A', color: '#fff', border: '1px solid #B5314A' } : d.variant === 'perfecto' ? { border: '1px solid #DC5A76', backgroundColor: '#FDF2F5', color: '#B5314A' } : { border: '1px solid #5B7FD6', backgroundColor: '#EFF6FF', color: '#1D4ED8' }}
                  >
                    {d.label}
                  </span>
                ))}
              </div>
            )}
            {block.example && (
              <p className="text-xs text-center text-gray-700">
                <span className="underline" style={{ color: headerColor, textDecorationColor: headerColor }}>{block.exampleUnderline}</span>
                {' '}
                <strong className="font-bold" style={{ color: headerColor }}>{block.exampleBold}</strong>
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
        <div className="relative mt-4">
          <span className="absolute -top-3.5 left-4 bg-white flex items-center gap-[4px] rounded-full border border-[#91A5D8] text-[#3E5C9F] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide z-10">
            <MessageSquareText className="w-3 h-3" /> Ejemplo
          </span>
          <div className="rounded-[20px] border border-[#D2D6E1] bg-[#EEF0F5] px-4 pt-6 pb-4 flex flex-col gap-3 relative shadow-sm">
            {block.items.map((item, i) => (
              <p key={i} className="text-xs text-gray-700">
                <span className="underline decoration-[#DC5A76] decoration-[1.5px] underline-offset-4">{item.underline}</span> {item.rest}
              </p>
            ))}
          </div>
        </div>
      )
    case 'consequence-grid':
      return (
        <div className="grid grid-cols-2 gap-3">
          {block.items.map((item, i) => {
            const isPerfecto = item.variant === 'perfecto'
            const borderColor = isPerfecto ? '#F1A9BC' : '#A9C0ED'
            const topBgColor = isPerfecto ? '#FDE9EF' : '#E1EDFB'
            const tagColor = isPerfecto ? '#B5314A' : '#3258A6'
            
            return (
              <div key={i} className="rounded-[1.25rem] border bg-white overflow-hidden flex flex-col shadow-sm" style={{ borderColor }}>
                <div className="px-3.5 pt-3.5 pb-3 flex flex-col gap-1" style={{ backgroundColor: topBgColor }}>
                  <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: tagColor }}>
                    {isPerfecto ? 'Perfecto' : 'Indefinido'}
                  </span>
                  <p className="text-[12px] font-bold text-gray-900 leading-snug">&ldquo;{item.quote}&rdquo;</p>
                </div>
                <div className="flex items-center gap-2.5 px-3.5 py-3">
                  <Image src={item.icon} alt="" width={28} height={28} className="object-contain shrink-0" />
                  <p className="text-[10px] text-gray-600 leading-tight font-medium">{item.caption}</p>
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
              <div key={group.variant} className="rounded-2xl border border-gray-100 bg-white px-3.5 py-3 flex flex-wrap gap-2">
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
      const actionColor = isPerfecto ? '#E11D48' : '#2563EB' // Rose-600 vs Blue-600
      const pillTextColor = isPerfecto ? '#111827' : '#2563EB' // Gray-900 vs Blue-600
      
      return (
        <div className="rounded-[1.25rem] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 p-5 flex flex-col relative overflow-hidden">
          <span className="text-[12px] font-bold text-gray-500 uppercase tracking-wide mb-2">{block.label}</span>
          
          {block.sentence ? (
            <p className="text-[14px] text-gray-800 leading-snug mb-5">
              {renderBold(block.sentence)}
            </p>
          ) : (
            <p className="text-[14px] text-gray-800 leading-snug mb-5">
              <span className="font-bold text-[#F58220]">{block.backgroundPhrase}</span>
              <span className="text-gray-500">, por eso </span>
              <span className="font-bold underline decoration-[2px] underline-offset-4" style={{ color: actionColor }}>{block.actionPhrase}</span>
              <span className="text-gray-500"> algo.</span>
            </p>
          )}

          <div className="w-full border-t border-gray-100 pt-5 flex flex-col gap-3">
            <div className="flex items-start justify-between w-full">
              <div className="flex flex-col gap-4 relative z-10 w-[240px]">
                
                {/* Visual Track */}
                <div className="h-[64px] rounded-full border-[1.5px] border-dashed border-[#FBA862] bg-[#FFF8F0] relative w-full flex items-center p-[4px]">
                  {block.bgImage && (
                    <Image 
                      src={block.bgImage} 
                      width={120} 
                      height={75} 
                      className="absolute -bottom-2 left-3 object-contain h-[85px] drop-shadow-sm" 
                      alt="" 
                    />
                  )}
                  <div className="ml-auto w-[50px] h-[50px] shrink-0 rounded-full flex items-center justify-center overflow-hidden z-20 relative" style={{ backgroundColor: actionColor }}>
                    {block.actionImage && (
                      <Image 
                        src={block.actionImage} 
                        width={50} 
                        height={50} 
                        className={isPerfecto ? "object-cover w-[85%] h-[85%] object-top translate-y-0.5 drop-shadow-md" : "object-cover w-[180%] h-[180%] object-top translate-y-4 -translate-x-0.5 drop-shadow-md"} 
                        alt="" 
                      />
                    )}
                  </div>
                </div>

                {/* Labels */}
                <div className="h-[36px] rounded-full border-[1.5px] border-dashed border-[#FBA862] bg-[#FFF8F0] relative w-[240px] flex items-center p-[4px] pl-4 mt-1">
                  <div className="flex-1 flex items-center justify-center pr-2">
                    <span className="text-[12px] font-bold text-gray-900 leading-none">{block.backgroundPhrase}</span>
                  </div>
                  <div className="h-[28px] shrink-0 rounded-full border-[1.5px] bg-white flex items-center justify-center px-4 z-10 ml-auto" style={{ borderColor: actionColor }}>
                    <span className="text-[12px] font-bold leading-none" style={{ color: pillTextColor }}>{block.actionPhrase}</span>
                  </div>
                </div>
              </div>

              {/* You now */}
              <div className="flex flex-col items-center justify-center shrink-0 pr-1 h-[64px] relative">
                <span className="text-[11px] font-bold text-gray-900 absolute -top-2">You now</span>
                <Image src="/images/teoria/liodetiempos/Profile - Mimo.png" width={52} height={52} className="object-contain" alt="" />
              </div>
            </div>

            {/* Timeline Ribbons */}
            <div className="flex items-center w-full mt-4">
              {block.timeline.length === 2 ? (
                <>
                  <div className="relative w-[240px] h-[42px] flex items-center justify-center">
                    <svg className="absolute inset-0 w-full h-full text-[#C6D2EE]" preserveAspectRatio="none" viewBox="0 0 100 100">
                      <polygon points="0,25 94,25 94,10 100,10 100,90 94,90 94,75 0,75" fill="currentColor" />
                    </svg>
                    <span className="relative z-10 text-[13px] font-bold text-[#3852A4] leading-none">{block.timeline[0]}</span>
                  </div>
                  <div className="relative flex-1 h-[42px] ml-4 flex items-center justify-center pr-4">
                    <svg className="absolute inset-0 w-full h-full text-[#F8D7E3]" preserveAspectRatio="none" viewBox="0 0 100 100">
                      <polygon points="0,25 75,25 75,0 100,50 75,100 75,75 0,75" fill="currentColor" />
                    </svg>
                    <span className="relative z-10 text-[13px] font-bold text-[#E11D48] leading-none">{block.timeline[1]}</span>
                  </div>
                </>
              ) : (
                <div className="relative w-full h-[42px] flex items-center justify-center pr-4">
                  <svg className="absolute inset-0 w-full h-full text-[#F8D7E3]" preserveAspectRatio="none" viewBox="0 0 100 100">
                    <polygon points="0,25 92,25 92,0 100,50 92,100 92,75 0,75" fill="currentColor" />
                  </svg>
                  <span className="relative z-10 text-[13px] font-bold text-[#E11D48] leading-none">{block.timeline[0]}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )
    }
        case 'review-links':
      return (
        <div className="flex flex-col gap-3 mt-1">
          {block.links.map((link, i) => (
            <button
              key={i}
              onClick={() => window.location.href = link.href}
              className="w-full text-left rounded-[16px] bg-[#DCFCE7] px-4 py-3.5 flex items-center gap-4 shadow-sm transition-transform active:scale-[0.98]"
            >
              <div className="w-[44px] h-[44px] shrink-0 rounded-[10px] bg-[#166534] flex items-center justify-center shadow-sm">
                <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-[24px] h-[24px] text-white">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                </svg>
              </div>
              <div className="flex flex-col flex-1 gap-1 min-w-0">
                <span className="text-[13px] font-bold text-gray-900 leading-tight">{link.title}</span>
                <span className="text-[12px] text-gray-700 leading-snug">{renderBold(link.text)}</span>
              </div>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="shrink-0 text-[#166534]">
                <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          ))}
        </div>
      )
    case 'decision-tree':
      return (
        <div className="flex flex-col gap-3.5">
          <div className="rounded-[20px] bg-white px-5 py-6 flex flex-col gap-6 shadow-sm border border-gray-100">
            {block.steps.map((step, i) => (
              <div key={step.number} className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <span className="w-[26px] h-[26px] rounded-full bg-[#3852A4] text-white text-[12px] font-bold flex items-center justify-center shrink-0">{step.number}</span>
                  <p className="text-[13px] font-bold text-gray-900">{step.question}</p>
                </div>
                <div className="flex justify-center -mt-1 mb-0.5">
                  <svg width="18" height="20" viewBox="0 0 18 20" fill="#CBD5E1">
                    <path d="M5 0h8v10h5l-9 10-9-10h5z"/>
                  </svg>
                </div>
                {step.result === 'single' ? (
                  <div className="rounded-[12px] px-2 py-4 flex flex-col items-center gap-1" style={{ backgroundColor: '#FFF8F0', border: '1px solid #FBA862' }}>
                    <span className="text-[14px] font-bold" style={{ color: '#F58220' }}>{step.label}</span>
                    {step.hint && <span className="text-[12px] text-[#D4A07A] font-medium mt-1">{step.hint}</span>}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {step.options.map(opt => {
                      const isPerfecto = opt.variant === 'perfecto'
                      return (
                        <div
                          key={opt.label}
                          className="rounded-[12px] px-2 py-4 flex flex-col items-center justify-center gap-1"
                          style={{ backgroundColor: isPerfecto ? '#FFF0F2' : '#F0F4FF', border: '1px solid ' + (isPerfecto ? '#FCA5A5' : '#93C5FD') }}
                        >
                          <span className="text-[14px] font-bold" style={{ color: isPerfecto ? '#E11D48' : '#2563EB' }}>{opt.label}</span>
                          {opt.hint && <span className="text-[11px] text-gray-500 font-medium mt-1 text-center">{opt.hint}</span>}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )
  }
}

function SectionTabs({ active }: { active: 'haber' | 'participio' }) {
  const tab = (key: 'haber' | 'participio', label: string) => {
    const isActive = active === key
    const color = key === 'haber' ? TAG_STYLES.blue.solid : 'var(--bsp-orange)'
    return (
      <span
        className="px-4 py-2 rounded-[12px] text-[12px] font-bold"
        style={isActive
          ? { backgroundColor: color, color: '#fff' }
          : { backgroundColor: '#D2D6E1', color: '#6B7280' }}
      >
        {label}
      </span>
    )
  }
  return (
    <div className="flex items-center gap-2.5 w-fit">
      {tab('haber', 'haber')}
      <span className="text-gray-800 text-sm font-medium">+</span>
      {tab('participio', 'participio')}
    </div>
  )
}

function BadgeCircle({ number, color }: { number: string; color: 'blue' | 'green' }) {
  return (
    <span
      className="shrink-0 w-6 h-6 rounded-full text-white text-[11px] font-bold flex items-center justify-center mt-0.5"
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
          <h2 className="text-base font-bold text-gray-900">{step.title}</h2>
          {step.richSubtitle
            ? <p className="text-xs text-gray-600 mt-1.5 leading-relaxed font-light">{renderRichSubtitle(step.richSubtitle)}</p>
            : step.subtitle && <p className="text-xs text-gray-600 mt-1.5 leading-relaxed font-light">{renderBold(step.subtitle)}</p>}
        </div>
      </div>
      <div className="flex flex-col gap-5">
        {step.blocks.map((block, i) => <LessonBlockView key={i} block={block} />)}
      </div>
    </div>
  )
}

function SummaryView({ steps }: { steps: LessonStep[] }) {
  const isSingleStep = steps.length === 1;

  if (isSingleStep) {
    const step = steps[0];
    return (
      <div className="flex flex-col gap-6 relative mt-2">
        <div className="flex items-start gap-4 relative">
          <div className="flex flex-col items-center shrink-0 mt-0.5">
            <span className="w-11 h-11 rounded-full bg-[#3852A4] text-white text-[18px] font-bold flex items-center justify-center shadow-sm">
              {step.number}
            </span>
          </div>
          <div className="flex flex-col gap-1.5 pt-1 flex-1 min-w-0">
            <h3 className="text-[18px] font-bold text-gray-900">{step.title}</h3>
            {step.subtitle && (
              <p className="text-[13.5px] text-gray-600 leading-relaxed pr-2">
                {renderBold(step.subtitle)}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-5 mt-1 w-full max-w-md mx-auto">
          {step.blocks.map((block, i) => <LessonBlockView key={i} block={block} compact />)}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 relative mt-2">
      {steps.map((step, idx) => (
        <div key={step.number} className="flex items-start gap-4 relative">
          <div className="flex flex-col items-center shrink-0 mt-0.5">
            <span className="w-11 h-11 rounded-full bg-[#3852A4] text-white text-[18px] font-bold flex items-center justify-center shadow-sm">
              {step.number}
            </span>
            {idx < steps.length - 1 && <span className="w-[1.5px] flex-1 bg-gray-200 mt-3 -mb-8" />}
          </div>
          <div className="flex flex-col gap-4 pb-2 flex-1 min-w-0">
            <div className="flex flex-col gap-1.5 pt-1">
              <h3 className="text-[17px] font-bold text-gray-900">{step.title}</h3>
              {step.subtitle && (
                <p className="text-[13px] text-gray-600 leading-relaxed pr-2">
                  {renderBold(step.subtitle)}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-4 mt-2">
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
      <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-gray-500 text-sm">La teoría de este tiempo todavía no está disponible.</p>
        <button onClick={() => router.back()} className="text-sm font-bold text-bsp-blue">Volver</button>
      </div>
    )
  }

  const totalPages = lesson.steps.length + 1
  const isFirst = page === 0
  const isSummary = page === totalPages - 1
  const isPerfectoSummary = tenseId === 'pretérito-perfecto' && isSummary

  const SWIPE_OFFSET_THRESHOLD = 50
  const SWIPE_VELOCITY_THRESHOLD = 500

  const goNext = () => {
    if (isSummary) router.back()
    else setPage(p => Math.min(totalPages - 1, p + 1))
  }
  const goPrev = () => {
    if (!isFirst) setPage(p => Math.max(0, p - 1))
  }

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (Math.abs(info.offset.x) < Math.abs(info.offset.y)) return

    const isSwipe = Math.abs(info.offset.x) > SWIPE_OFFSET_THRESHOLD || Math.abs(info.velocity.x) > SWIPE_VELOCITY_THRESHOLD
    if (!isSwipe) return

    if (info.offset.x < 0) goNext()
    else goPrev()
  }

  return (
    <>
      <OverscrollColor top="#2F54BA" bottom={isPerfectoSummary ? "#FFFFFF" : "#F3F4F6"} />
      <div className={`flex-1 min-h-0 flex flex-col overflow-hidden ${isPerfectoSummary ? 'bg-white' : 'bg-gray-100'}`}>
        {/* Header */}
        <div className="shrink-0 bg-bsp-blue px-6 pt-10 pb-8">
          <div className="flex items-center justify-between mb-4">
            <motion.button whileTap={{ scale: 0.88 }} onClick={() => router.back()} className="p-2 -m-2 bg-white/20 rounded-full">
              <X className="w-5 h-5 text-white" />
            </motion.button>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="flex items-center gap-1 text-xs font-medium uppercase tracking-widest" style={{ color: '#FBBF24' }}>
              <BookOpen className="w-3 h-3" /> Lección
            </span>
            <h1 className="text-lg font-bold text-white leading-tight">{lesson.title}</h1>
            {lesson.subtitle && <p className="text-xs text-white/70 -mt-0.5 font-light">{lesson.subtitle}</p>}
          </div>
        </div>

        {/* ── Wave separator ── */}
        <div className="shrink-0 bg-bsp-blue -mb-px">
          <svg viewBox="0 0 402 36" preserveAspectRatio="none" className="w-full block h-9">
            <path
              d="M0,0 C67,36 134,0 201,18 C268,36 335,0 402,18 L402,36 L0,36 Z"
              fill={isPerfectoSummary ? "#FFFFFF" : "#F3F4F6"}
            />
          </svg>
        </div>

        {/* Content */}
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
        <div className={`shrink-0 pt-2 pb-6 ${isPerfectoSummary ? 'bg-white' : 'bg-gray-100'}`}>
          <div className="flex items-center justify-center gap-[4px] pb-3">
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
                className="flex-1 flex items-center justify-center gap-[4px] py-3.5 rounded-2xl text-sm font-bold border-2 border-gray-200 text-gray-700"
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
              className="flex-1 flex items-center justify-center gap-[4px] py-3.5 rounded-2xl text-sm font-bold text-white"
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
