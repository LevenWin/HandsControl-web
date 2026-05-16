import { ArrowRight } from 'lucide-react'

export default function HomePage({ onEnterChain, onEnterCandle }: { onEnterChain: () => void; onEnterCandle: () => void }) {
  return (
    <div className="w-full h-full bg-bg-primary flex items-center justify-center overflow-hidden relative">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 50% 0%, #f59e0b 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-10 px-6 w-full max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">
            Incandescent Vision Lab
          </h1>
          <p className="text-sm text-text-dim mt-2">
            Interactive light experiments
          </p>
        </div>

        <div className="flex flex-col gap-6 w-full">
          <button
            onClick={onEnterChain}
            className="group w-full text-left bg-bg-panel border border-border/40 rounded-2xl p-5 hover:border-accent/30 hover:bg-bg-panel/80 transition-all active:scale-[0.99]"
          >
            <img
              src="/example.gif"
              alt="Pull Chain Light"
              className="w-full h-40 object-cover rounded-xl mb-4 shadow-lg"
            />
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-text-primary">Pull Chain Light</h2>
                <p className="text-[11px] text-text-dim mt-0.5">Physics chain + hand tracking</p>
              </div>
              <ArrowRight size={16} className="text-text-dim group-hover:text-accent transition-colors" />
            </div>
          </button>

          <button
            onClick={onEnterCandle}
            className="group w-full text-left bg-bg-panel border border-border/40 rounded-2xl p-5 hover:border-warm-glow/30 hover:bg-bg-panel/80 transition-all active:scale-[0.99]"
          >
            <img
              src="/candle.gif"
              alt="Candle Light"
              className="w-full h-40 object-cover rounded-xl mb-4 shadow-lg"
            />
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-text-primary">Candle Light</h2>
                <p className="text-[11px] text-text-dim mt-0.5">Radial spotlight + candle glow</p>
              </div>
              <ArrowRight size={16} className="text-text-dim group-hover:text-warm-glow transition-colors" />
            </div>
          </button>
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
