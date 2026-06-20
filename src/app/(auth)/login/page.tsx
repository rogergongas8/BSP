'use client'

import Link from 'next/link'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'
import { useState } from 'react'

export default function LoginPage() {
  const [showPin, setShowPin] = useState(false)
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)

  const isReady = username.trim().length > 0 && pin.length === 4

  function handleLogin() {
    // Phase 2: real auth logic here
    setError("Looks like there's no one with that username and PIN. Please, check your input or create a new account.")
  }

  return (
    <div className="w-full max-w-sm flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-white text-sm font-medium">
            Username
          </label>
          <input
            type="text"
            placeholder="Enter your user name"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-64 rounded-2xl bg-white px-4 py-3.5 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-[#FF8716]"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-white text-sm font-medium">
            4-Digit PIN
          </label>
          <div className="relative w-64">
            {showPin ? (
              <input
                type="text"
                inputMode="tel"
                maxLength={4}
                placeholder="····"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="w-full rounded-2xl bg-white px-4 py-3.5 pr-11 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-[#FF8716] tracking-widest"
                autoFocus
              />
            ) : (
              <input
                type="password"
                inputMode="tel"
                maxLength={4}
                placeholder="····"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="w-full rounded-2xl bg-white px-4 py-3.5 pr-11 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-[#FF8716] tracking-widest"
                autoFocus
              />
            )}
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label={showPin ? 'Ocultar PIN' : 'Mostrar PIN'}
            >
              {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          disabled={!isReady}
          onClick={handleLogin}
          className={`shrink-0 rounded-full px-8 py-3 font-semibold text-sm transition-colors ${
            isReady
              ? 'bg-[#FF8716] text-white hover:bg-[#e57712] cursor-pointer'
              : 'bg-white/20 text-white/50 cursor-not-allowed'
          }`}
        >
          Log in
        </button>

        {error && (
          <div className="flex items-start gap-1 w-52">
            <AlertCircle size={13} className="text-[#FF8716] shrink-0 mt-0.5" />
            <p className="text-white/80 text-[10px] leading-tight font-normal">{error}</p>
          </div>
        )}
      </div>

      <Link
        href="/signup"
        className="text-white/80 text-xs underline underline-offset-2 hover:text-white transition-colors font-normal"
      >
        Don&apos;t have an account? Create one
      </Link>
    </div>
  )
}
