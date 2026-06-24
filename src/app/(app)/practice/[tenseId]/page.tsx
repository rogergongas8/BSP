import Image from 'next/image'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export default async function PracticePage({ params }: { params: Promise<{ tenseId: string }> }) {
  // Await the params before accessing its properties. In Next.js 15+, params is a Promise.
  const resolvedParams = await params;
  const tenseId = resolvedParams.tenseId;
  
  return (
    <div className="flex flex-col min-h-screen">
      {/* ── Blue header ── */}
      <div className="relative bg-bsp-blue px-5 pt-8 pb-12 overflow-hidden">
        <Image
          src="/images/escribiendo/background.png"
          alt=""
          fill
          className="object-cover opacity-20 pointer-events-none select-none"
        />
        <div className="relative flex items-center justify-between mb-3">
          <Image src="/images/nav/user-image.svg" alt="Avatar" width={36} height={36} className="rounded-full" />
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white/15 rounded-full px-2.5 py-1">
              <Image src="/images/home/fxemoji_fire.svg" alt="Racha" width={16} height={16} />
              <span className="text-white text-xs font-semibold">4</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/15 rounded-full px-2.5 py-1">
              <Image src="/images/home/streamline-plump-color_star-circle-flat.svg" alt="Nivel" width={16} height={16} />
              <span className="text-white text-xs font-semibold">Lvl 2.</span>
            </div>
          </div>
        </div>
        <div className="relative mb-2">
          <Link href="/escribiendo" className="flex items-center gap-1 text-white/80 text-xs font-semibold w-fit">
            <ChevronRight className="w-3.5 h-3.5 rotate-180" />
            Back
          </Link>
        </div>
        <h1 className="relative text-center text-3xl font-black text-white tracking-tight">
          Práctica: {tenseId}
        </h1>
      </div>

      {/* ── Wave ── */}
      <div className="bg-bsp-blue -mb-px">
        <svg viewBox="0 0 402 36" preserveAspectRatio="none" className="w-full block h-9">
          <path d="M0,0 C67,36 134,0 201,18 C268,36 335,0 402,18 L402,36 L0,36 Z" fill="#F3F4F6" />
        </svg>
      </div>

      {/* ── Content ── */}
      <div className="bg-gray-100 flex-1 pt-5 pb-8 px-5 flex flex-col items-center">
        <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-sm border border-gray-200 mt-8 text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Plantilla del Juego</h2>
          <p className="text-gray-600 mb-6">
            Aquí puedes desarrollar la lógica del juego para el tiempo verbal <strong>{tenseId}</strong>.
          </p>
          <div className="h-40 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center">
            <span className="text-gray-400 font-medium">Área de juego</span>
          </div>
        </div>
      </div>
    </div>
  )
}
