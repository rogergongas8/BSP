export default function ProfileLoading() {
  return (
    <div className="flex flex-col animate-pulse">
      <div className="bg-bsp-blue px-5 sm:px-[26%] pt-10 pb-6">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-20 h-20 rounded-full bg-white/20" />
          <div className="flex flex-col gap-2">
            <div className="h-6 w-32 bg-white/20 rounded" />
            <div className="h-4 w-16 bg-white/20 rounded" />
          </div>
        </div>
        <div className="h-3 bg-white/20 rounded-full mb-6" />
        <div className="flex justify-between">
          <div className="h-10 w-16 bg-white/20 rounded" />
          <div className="h-10 w-16 bg-white/20 rounded" />
          <div className="h-10 w-16 bg-white/20 rounded" />
        </div>
      </div>

      <div className="bg-bsp-blue -mb-px">
        <svg viewBox="0 0 402 36" preserveAspectRatio="none" className="w-full block h-9">
          <path d="M0,0 C67,36 134,0 201,18 C268,36 335,0 402,18 L402,36 L0,36 Z" fill="#F3F4F6" />
        </svg>
      </div>

      <div className="bg-gray-100 px-4 sm:px-[26%] pt-4 pb-28 flex flex-col gap-4">
        <div className="bg-white rounded-2xl p-5 h-64" />
        <div className="bg-white rounded-2xl p-5 h-80" />
        <div className="bg-white rounded-2xl p-5 h-48" />
      </div>
    </div>
  )
}
