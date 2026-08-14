'use client'

import Image from 'next/image'
import { Switch } from '@/components/ui/switch'

export default function HintToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-6">
      <Switch checked={checked} onCheckedChange={onChange} className="scale-[1.75]" />
      <Image src="/images/loading/small-loading2.png" alt="" width={32} height={32} />
    </div>
  )
}
