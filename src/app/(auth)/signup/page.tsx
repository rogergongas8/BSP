'use client'

import Link from 'next/link'
import { useState } from 'react'
import AuthInput from '@/components/auth/auth-input'
import PinInput from '@/components/auth/pin-input'

const TAKEN_USERNAMES = ['queen', 'admin', 'test']

type UsernameStatus = 'idle' | 'error' | 'success'
type PinStatus = 'idle' | 'error' | 'success'

export default function SignupPage() {
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle')
  const [pinStatus, setPinStatus] = useState<PinStatus>('idle')

  const isReady = usernameStatus === 'success' && pinStatus === 'success'

  function handleUsernameChange(value: string) {
    setUsername(value)
    if (value.trim().length === 0) {
      setUsernameStatus('idle')
    } else if (TAKEN_USERNAMES.includes(value.toLowerCase())) {
      setUsernameStatus('error')
    } else if (value.trim().length >= 3) {
      setUsernameStatus('success')
    } else {
      setUsernameStatus('idle')
    }
  }

  function handlePinChange(value: string) {
    setPin(value)
    if (value.length === 0) setPinStatus('idle')
    else if (value.length === 4) setPinStatus('success')
    else setPinStatus('error')
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
            usernameStatus === 'error' ? 'This name is already taken. Try a new one!' :
            usernameStatus === 'success' ? 'Good name!' : undefined
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

      <button
        disabled={!isReady}
        className={`w-fit rounded-full px-10 py-3 font-semibold text-sm transition-colors ${
          isReady
            ? 'bg-[#FF8716] text-white hover:bg-[#e57712] cursor-pointer'
            : 'bg-white/20 text-white/50 cursor-not-allowed'
        }`}
      >
        Create account
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
