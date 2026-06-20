export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Force body background to match so Safari's overscroll / gaps don't show white */}
      <style>{`html, body { background-color: #2F54BA !important; overflow: hidden; height: 100%; }`}</style>
      <div className="fixed inset-0 bg-bsp-blue flex flex-col pl-10 pr-6 pt-20 pb-8 overflow-hidden">
        {children}
      </div>
    </>
  )
}
