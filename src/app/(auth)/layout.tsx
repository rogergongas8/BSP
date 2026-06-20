export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bsp-blue flex flex-col pl-10 pr-6 pt-20 pb-8">
      {children}
    </div>
  )
}
