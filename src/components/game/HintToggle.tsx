'use client'

import Image from 'next/image'
import { Switch } from '@/components/ui/switch'

export default function HintToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-2">
      <Switch checked={checked} onCheckedChange={onChange} />
      <Image src="/images/loading/small-loading2.png" alt="" width={20} height={20} className="rounded-full" />
    </div>
  )
}
