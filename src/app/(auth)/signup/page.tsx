'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AuthInput from '@/components/auth/auth-input'
import PinInput from '@/components/auth/pin-input'
import { createClient } from '@/lib/supabase/client'

type UsernameStatus = 'idle' | 'error' | 'success'
type PinStatus = 'idle' | 'error' | 'success'

export default function SignupPage() {
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle')
  const [usernameMessage, setUsernameMessage] = useState<string | undefined>()
  const [pinStatus, setPinStatus] = useState<PinStatus>('idle')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const isReady = usernameStatus === 'success' && pinStatus === 'success'

  async function handleUsernameChange(value: string) {
    setUsername(value)

    if (value.trim().length < 3) {
      setUsernameStatus('idle')
      setUsernameMessage(undefined)
      return
    }

    const supabase = createClient()
    const { data } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', value.trim().toLowerCase())
      .maybeSingle()

    if (data) {
      setUsernameStatus('error')
      setUsernameMessage('This name is already taken. Try a new one!')
    } else {
      setUsernameStatus('success')
      setUsernameMessage('Good name!')
    }
  }

  function handlePinChange(value: string) {
    setPin(value)
    if (value.length === 0) setPinStatus('idle')
    else if (value.length === 4) setPinStatus('success')
    else setPinStatus('error')
  }

  async function handleSignup() {
    if (!isReady || loading) return
    setLoading(true)
    setError(null)

    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.trim().toLowerCase(), pin }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error === 'Username already taken'
        ? 'This name is already taken. Try a new one!'
        : 'No se ha podido crear la cuenta. Intenta de nuevo.')
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div className="w-64 flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <AuthInput
          label="Username"
          placeholder="Enter your user name"
          value={username}
          onChange={handleUsernameChange}
          status={usernameStatus}
          message={
            usernameMessage ??
            (usernameStatus === 'error' ? 'This name is already taken. Try a new one!' :
            usernameStatus === 'success' ? 'Good name!' : undefined)
          }
        />
        <PinInput
          value={pin}
          onChange={handlePinChange}
          status={pinStatus}
          message={
            pinStatus === 'error' ? 'PIN has to be 4 digits long' :
            pinStatus === 'success' ? 'Good!' : undefined
          }
        />
      </div>

      {error && (
        <p className="text-[#FF8716] text-xs">{error}</p>
      )}

      <button
        disabled={!isReady || loading}
        onClick={handleSignup}
        className={`w-fit rounded-full px-10 py-3 font-semibold text-sm transition-colors ${
          isReady && !loading
            ? 'bg-[#FF8716] text-white hover:bg-[#e57712] cursor-pointer'
            : 'bg-white/20 text-white/50 cursor-not-allowed'
        }`}
      >
        {loading ? 'Creando cuenta...' : 'Create account'}
      </button>

      <Link
        href="/login"
        className="text-white/80 text-xs underline underline-offset-2 hover:text-white transition-colors font-normal"
      >
        Already have an account? Log in
      </Link>
    </div>
  )
}
