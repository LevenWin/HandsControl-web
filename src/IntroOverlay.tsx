import { useEffect, useState } from 'react'

export default function IntroOverlay({
  title,
  zh,
  en,
}: {
  title: string
  zh: string
  en: string
}) {
  const [open, setOpen] = useState(true)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!open) return null

  return (
    <div
      className="absolute inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      style={{ animation: 'intro-fadein 0.35s ease-out both' }}
      onClick={() => setOpen(false)}
    >
      <style>{`
        @keyframes intro-fadein { from { opacity: 0 } to { opacity: 1 } }
        @keyframes intro-up {
          from { opacity: 0; transform: translateY(10px) }
          to   { opacity: 1; transform: translateY(0) }
        }
      `}</style>

      <div
        className="w-[340px] max-w-[88vw] bg-[#0a0817]/95 border border-white/[0.12] rounded-2xl px-7 py-7 shadow-2xl"
        style={{ animation: 'intro-up 0.5s ease-out both' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-amber-100/45 text-[10px] tracking-[0.5em] mb-3 text-center">✦</div>

        <h2 className="font-serif italic text-white/90 text-[26px] leading-none tracking-wide text-center mb-6">
          {title}
        </h2>

        <p className="text-white/85 text-[13px] leading-relaxed text-center mb-3">
          {zh}
        </p>
        <p className="text-white/40 text-[11px] leading-relaxed text-center tracking-wide">
          {en}
        </p>

        <button
          onClick={() => setOpen(false)}
          className="mt-7 w-full text-[10px] text-white/55 hover:text-white/95 tracking-[0.45em] uppercase py-2.5 border-t border-white/[0.08] transition-colors"
        >
          got it &nbsp;·&nbsp; 开始
        </button>
      </div>
    </div>
  )
}
