import BottomNav from '@/components/nav/bottom-nav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-100">
      <main className="pb-28">{children}</main>
      <BottomNav />
    </div>
  )
}
