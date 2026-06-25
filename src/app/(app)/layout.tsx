import BottomNav from '@/components/nav/bottom-nav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bsp-blue flex flex-col relative overflow-x-hidden">
      <main className="pb-28 flex-1 flex flex-col">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
