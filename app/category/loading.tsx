import { Loader2 } from 'lucide-react'

export default function Loading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-[#5F7D72]" />
        <p className="text-sm text-[#5A4A36]/60 tracking-[0.1em]">Loading category...</p>
      </div>
    </div>
  )
}
