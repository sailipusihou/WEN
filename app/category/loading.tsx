import { Loader2 } from 'lucide-react'

export default function Loading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-[#8BA8A0]" />
        <p className="text-sm text-[#6B6F75]/60 tracking-wide">Loading category...</p>
      </div>
    </div>
  )
}
