import type { Metadata } from 'next'

// The page is a Client Component and cannot export metadata, so it lives here.
export const metadata: Metadata = {
  title: 'Create account',
  description: 'Create a Miaustico account with a username and a 4-digit PIN. No email needed.',
  alternates: { canonical: '/signup' },
}

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children
}
