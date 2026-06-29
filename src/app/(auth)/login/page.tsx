'use client'

import Link from 'next/link'
import { AlertCircle } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AuthInput from '@/components/auth/auth-input'
import PinInput from '@/components/auth/pin-input'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const isReady = username.trim().length > 0 && pin.length === 4

  async function handleLogin() {
    if (!isReady || loading) return
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const email = `${username.trim().toLowerCase()}@bsp.internal`

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password: pin,
    })

    if (authError) {
      setError('Usuario o PIN incorrecto.')
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="w-64 flex flex-col gap-4">
        <AuthInput
          label="Username"
          placeholder="Enter your user name"
          value={username}
          onChange={setUsername}
        />
        <PinInput
          value={pin}
          onChange={setPin}
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          disabled={!isReady || loading}
          onClick={handleLogin}
          className={`shrink-0 rounded-full px-8 py-3 font-semibold text-sm transition-colors ${
            isReady && !loading
              ? 'bg-[#FF8716] text-white hover:bg-[#e57712] cursor-pointer'
              : 'bg-white/20 text-white/50 cursor-not-allowed'
          }`}
        >
          {loading ? 'Entrando...' : 'Log in'}
        </button>

        {error && (
          <div className="flex items-start gap-1 flex-1">
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
