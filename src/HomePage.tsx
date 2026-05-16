import { ArrowRight, ExternalLink } from 'lucide-react'

export default function HomePage({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="w-full h-full bg-bg-primary flex items-center justify-center overflow-hidden relative">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 50% 0%, #f59e0b 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-8 px-6 max-w-lg w-full">
        <div className="flex flex-col items-center gap-5">
          <img
            src="/example.gif"
            alt="Incandescent Vision Lab"
            className="w-28 h-28 rounded-2xl shadow-2xl shadow-accent/20 border border-white/10"
          />

          <div className="text-center space-y-3">
            <h1 className="text-3xl font-bold text-text-primary tracking-tight">
              Incandescent Vision Lab
            </h1>
            <p className="text-sm text-text-secondary leading-relaxed max-w-sm mx-auto">
              A physics-based point-light simulator. Grab the virtual light chain with your hand
              and pull to toggle the incandescent bulb — blending vintage interaction with modern web technology.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={onEnter}
            className="w-full py-3 rounded-xl bg-accent text-black text-sm font-semibold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-amber-400 transition-all shadow-lg shadow-accent/30 active:scale-[0.98]"
          >
            <span>Launch Lab</span>
            <ArrowRight size={16} />
          </button>

          <div className="flex gap-3 justify-center">
            <a
              href="https://github.com/LevenWin/HandsControl-web"
              target="_blank"
              rel="noopener noreferrer"
              className="py-2 px-4 rounded-lg text-[11px] font-medium uppercase tracking-wider flex items-center gap-1.5 bg-bg-control text-text-secondary hover:text-text-primary border border-border/50 transition-colors"
            >
              <ExternalLink size={13} />
              GitHub
            </a>
          </div>
        </div>

        <div className="flex gap-4 text-[10px] text-text-dim uppercase tracking-widest">
          <span>Hand Tracking</span>
          <span className="opacity-30">·</span>
          <span>Physics Engine</span>
          <span className="opacity-30">·</span>
          <span>Point Light</span>
        </div>
      </div>
    </div>
  )
}
