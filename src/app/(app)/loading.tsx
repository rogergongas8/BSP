export default function HomeLoading() {
  return (
    <div className="flex flex-col animate-pulse">
      <div className="bg-bsp-blue px-5 pt-8 pb-8">
        <div className="flex items-center justify-between mb-5">
          <div className="w-9 h-9 rounded-full bg-white/20" />
          <div className="flex gap-2">
            <div className="w-16 h-6 rounded-full bg-white/20" />
            <div className="w-16 h-6 rounded-full bg-white/20" />
          </div>
        </div>
        <div className="bg-white/15 rounded-3xl px-4 py-3 h-16" />
      </div>

      <div className="bg-bsp-blue -mb-px">
        <svg viewBox="0 0 402 36" preserveAspectRatio="none" className="w-full block h-9">
          <path d="M0,0 C67,36 134,0 201,18 C268,36 335,0 402,18 L402,36 L0,36 Z" fill="#F3F4F6" />
        </svg>
      </div>

      <div className="bg-gray-100 px-4 pt-4 pb-6 flex-1">
        <div className="h-5 w-48 bg-gray-300 rounded mb-5" />
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="aspect-[9/16] bg-gray-300 rounded-2xl" />
          <div className="aspect-[9/16] bg-gray-300 rounded-2xl" />
        </div>
        <div className="h-32 bg-gray-300 rounded-2xl" />
      </div>
    </div>
  )
}
