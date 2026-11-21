import type { Metadata } from 'next'

// The page is a Client Component and cannot export metadata, so it lives here. The canonical
// collapses /login?next=… variants (one per protected route) into a single URL.
export const metadata: Metadata = {
  title: 'Log in',
  description: 'Log in to Miaustico with your username and 4-digit PIN to keep practising the Spanish past tenses.',
  alternates: { canonical: '/login' },
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
