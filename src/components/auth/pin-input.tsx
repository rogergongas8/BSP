'use client'

import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import AuthInput from './auth-input'

type Status = 'idle' | 'error' | 'success'

interface PinInputProps {
  value: string
  onChange: (value: string) => void
  status?: Status
  message?: string
}

export default function PinInput({ value, onChange, status, message }: PinInputProps) {
  const [show, setShow] = useState(false)

  const eyeButton = (
    <button
      type="button"
      onClick={() => setShow(!show)}
      className="text-gray-400 hover:text-gray-600 transition-colors"
      aria-label={show ? 'Ocultar PIN' : 'Mostrar PIN'}
    >
      {show ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  )

  return (
    <AuthInput
      key={show ? 'pin-text' : 'pin-password'}
      label="4-Digit PIN"
      type={show ? 'text' : 'password'}
      inputMode="tel"
      maxLength={4}
      placeholder="····"
      value={value}
      onChange={(val) => onChange(val.replace(/\D/g, '').slice(0, 4))}
      status={status}
      message={message}
      suffix={eyeButton}
    />
  )
}
