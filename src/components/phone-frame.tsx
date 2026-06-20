export default function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-200 flex items-center justify-center p-8">
      <div className="relative w-[390px] h-[844px] bg-black rounded-[52px] shadow-2xl overflow-hidden border-[10px] border-black">

        {/* Status bar */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-8 pt-4 pb-1">
          <span className="text-white text-sm font-semibold">9:41</span>
          <div className="flex items-center gap-1.5">
            {/* Signal */}
            <svg width="17" height="12" viewBox="0 0 17 12" fill="white">
              <rect x="0" y="7" width="3" height="5" rx="0.5" />
              <rect x="4.5" y="4.5" width="3" height="7.5" rx="0.5" />
              <rect x="9" y="2" width="3" height="10" rx="0.5" />
              <rect x="13.5" y="0" width="3" height="12" rx="0.5" />
            </svg>
            {/* Wifi */}
            <svg width="16" height="12" viewBox="0 0 16 12" fill="white">
              <path d="M8 9.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z" />
              <path d="M3.5 6.5a6.5 6.5 0 0 1 9 0" strokeWidth="1.5" stroke="white" fill="none" strokeLinecap="round" />
              <path d="M1 4A9.9 9.9 0 0 1 15 4" strokeWidth="1.5" stroke="white" fill="none" strokeLinecap="round" />
            </svg>
            {/* Battery */}
            <div className="flex items-center gap-0.5">
              <div className="w-6 h-3 border border-white/80 rounded-[3px] p-[1.5px]">
                <div className="w-full h-full bg-white rounded-[1.5px]" />
              </div>
              <div className="w-[2px] h-[5px] bg-white/60 rounded-full" />
            </div>
          </div>
        </div>

        {/* Dynamic island */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 w-[120px] h-[34px] bg-black rounded-full" />

        {/* Screen content */}
        <div className="absolute inset-0 overflow-y-auto overflow-x-hidden">
          {children}
        </div>

        {/* Home indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 w-32 h-1 bg-white/40 rounded-full" />
      </div>
    </div>
  )
}
