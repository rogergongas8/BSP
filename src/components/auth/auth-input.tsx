'use client'

import { AlertCircle, CheckCircle2 } from 'lucide-react'

type Status = 'idle' | 'error' | 'success'

interface AuthInputProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  inputMode?: 'text' | 'tel' | 'numeric'
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'
  autoCorrect?: 'on' | 'off'
  maxLength?: number
  status?: Status
  message?: string
  suffix?: React.ReactNode
}

export default function AuthInput({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  inputMode,
  autoCapitalize = 'none',
  autoCorrect = 'off',
  maxLength,
  status = 'idle',
  message,
  suffix,
}: AuthInputProps) {
  const ringClass =
    status === 'error' ? 'ring-2 ring-[#FF8716]' :
    status === 'success' ? 'ring-2 ring-green-400' :
    'focus:ring-2 focus:ring-[#FF8716]'

  return (
    <div className="flex flex-col gap-1">
      <label className="text-white text-sm font-semibold">{label}</label>
      <div className="relative w-full">
        <input
          type={type}
          inputMode={inputMode}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          maxLength={maxLength}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
className={`w-full rounded-2xl bg-white px-4 py-3.5 text-base text-gray-900 focus:text-gray-600 placeholder:text-gray-400 outline-none transition-all [&:-webkit-autofill]:[box-shadow:0_0_0_30px_white_inset] ${suffix ? 'pr-11' : ''} ${ringClass}`}
        />
        {suffix && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {suffix}
          </div>
        )}
      </div>
      {message && status !== 'idle' && (
        <div className="flex items-center gap-1 mt-0.5">
          {status === 'error'
            ? <AlertCircle size={12} className="text-[#FF8716] shrink-0" />
            : <CheckCircle2 size={12} className="text-green-400 shrink-0" />
          }
          <p className={`text-[10px] font-normal ${status === 'error' ? 'text-[#FF8716]' : 'text-green-400'}`}>
            {message}
          </p>
        </div>
      )}
    </div>
  )
}
