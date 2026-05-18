import { ArrowUpRight } from 'lucide-react'

type Entry = {
  idx: string
  title: string
  sub: string
  gif: string
  glow: string
}

const TWINKLES = [
  { top: '8%',  left: '8%',  size: 2,   delay: '0s',   dur: '5.2s' },
  { top: '16%', left: '84%', size: 1.5, delay: '1.4s', dur: '6.1s' },
  { top: '32%', left: '6%',  size: 1,   delay: '2.8s', dur: '4.6s' },
  { top: '24%', left: '94%', size: 2.5, delay: '0.6s', dur: '7.3s' },
  { top: '46%', left: '2%',  size: 1.2, delay: '3.5s', dur: '5.8s' },
  { top: '52%', left: '96%', size: 1.8, delay: '2.0s', dur: '6.4s' },
  { top: '68%', left: '4%',  size: 1,   delay: '4.1s', dur: '5.0s' },
  { top: '74%', left: '95%', size: 1.3, delay: '1.0s', dur: '7.0s' },
  { top: '86%', left: '14%', size: 2,   delay: '3.2s', dur: '6.7s' },
  { top: '90%', left: '82%', size: 1.5, delay: '0.3s', dur: '5.5s' },
  { top: '4%',  left: '48%', size: 1,   delay: '2.4s', dur: '6.2s' },
  { top: '96%', left: '52%', size: 1.2, delay: '4.6s', dur: '5.9s' },
]

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'

function HeroCard({ entry, index, onClick }: { entry: Entry; index: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group relative block w-full text-left"
      style={{ animation: `hp-rise 0.95s ${EASE} ${0.32 + index * 0.13}s both` }}
    >
      <div
        className="pointer-events-none absolute -inset-3 rounded-[28px] opacity-0 blur-2xl transition-opacity duration-[900ms] group-hover:opacity-100"
        style={{
          background: `radial-gradient(58% 58% at 50% 55%, ${entry.glow} 0%, transparent 72%)`,
          transitionTimingFunction: EASE,
        }}
      />

      <div
        className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl ring-1 ring-white/[0.06] transition-[transform,box-shadow,ring] duration-[700ms] group-hover:-translate-y-[3px] group-hover:ring-white/[0.22]"
        style={{ transitionTimingFunction: EASE }}
      >
        <img
          src={entry.gif}
          alt={entry.title}
          draggable={false}
          className="absolute inset-0 h-full w-full scale-[1.02] object-cover transition-transform duration-[1600ms] group-hover:scale-[1.09]"
          style={{ transitionTimingFunction: EASE }}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

        <div
          className="absolute inset-0 opacity-0 transition-opacity duration-[800ms] group-hover:opacity-100"
          style={{
            background: `radial-gradient(80% 60% at 50% 100%, ${entry.glow} 0%, transparent 65%)`,
            mixBlendMode: 'screen',
            transitionTimingFunction: EASE,
          }}
        />

        <span className="absolute top-3.5 right-4 font-serif text-[12px] italic tracking-wider text-white/55 transition-colors duration-500 group-hover:text-white/85">
          {entry.idx}
        </span>

        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5">
          <div className="min-w-0 transition-transform duration-[700ms] group-hover:translate-x-[3px]" style={{ transitionTimingFunction: EASE }}>
            <div className="truncate text-[17px] font-light tracking-wide text-white/95">
              {entry.title}
            </div>
            <div className="mt-1 truncate text-[10px] uppercase tracking-[0.28em] text-white/55">
              {entry.sub}
            </div>
          </div>
          <ArrowUpRight
            size={17}
            className="shrink-0 text-white/55 transition-all duration-[600ms] group-hover:-translate-y-[5px] group-hover:translate-x-[5px] group-hover:text-amber-100"
            style={{ transitionTimingFunction: EASE }}
          />
        </div>

        <div
          className="absolute bottom-0 left-0 h-[1.5px] w-0 transition-[width] duration-[1000ms] group-hover:w-full"
          style={{
            background: `linear-gradient(90deg, ${entry.glow.replace('0.32', '0.95').replace('0.30', '0.95').replace('0.34', '0.95')} 0%, transparent 100%)`,
            transitionTimingFunction: EASE,
          }}
        />
      </div>
    </button>
  )
}

export default function HomePage({
  onEnterChain,
  onEnterCandle,
  onEnterStarRain,
}: {
  onEnterChain: () => void
  onEnterCandle: () => void
  onEnterStarRain: () => void
}) {
  const entries: { entry: Entry; onClick: () => void }[] = [
    {
      entry: {
        idx: 'i',
        title: 'Pull Chain Light',
        sub: 'physics chain · hand tracking',
        gif: '/light_switch.gif',
        glow: 'rgba(252, 211, 77, 0.32)',
      },
      onClick: onEnterChain,
    },
    {
      entry: {
        idx: 'ii',
        title: 'Candle Light',
        sub: 'radial spotlight · breath glow',
        gif: '/candle.gif',
        glow: 'rgba(251, 146, 60, 0.30)',
      },
      onClick: onEnterCandle,
    },
    {
      entry: {
        idx: 'iii',
        title: 'Star Rain',
        sub: 'pentagram physics · two hands',
        gif: '/star.gif',
        glow: 'rgba(196, 156, 255, 0.34)',
      },
      onClick: onEnterStarRain,
    },
  ]

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden overflow-y-auto bg-[#06040d]">
      <style>{`
        @keyframes hp-twinkle {
          0%, 100% { opacity: 0.15; transform: scale(0.9); }
          50%      { opacity: 0.85; transform: scale(1.4); }
        }
        @keyframes hp-drift {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-6px); }
        }
        @keyframes hp-rise {
          from { opacity: 0; transform: translateY(28px) scale(0.985); filter: blur(6px); }
          to   { opacity: 1; transform: translateY(0) scale(1);        filter: blur(0); }
        }
        @keyframes hp-fade-up {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes hp-glow-pulse {
          0%, 100% { opacity: 0.45; }
          50%      { opacity: 0.75; }
        }
      `}</style>

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 55% at 50% 0%, rgba(255,200,140,0.09) 0%, transparent 60%), radial-gradient(ellipse 60% 75% at 50% 100%, rgba(140,90,200,0.06) 0%, transparent 65%)',
        }}
      />

      <div className="pointer-events-none absolute inset-0">
        {TWINKLES.map((s, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              top: s.top,
              left: s.left,
              width: s.size,
              height: s.size,
              animation: `hp-twinkle ${s.dur} ease-in-out ${s.delay} infinite`,
              boxShadow: '0 0 4px rgba(255,255,255,0.6)',
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex w-full max-w-[440px] flex-col gap-10 px-6 py-12">
        <div
          className="text-center"
          style={{
            animation: `hp-fade-up 0.9s ${EASE} 0.1s both`,
          }}
        >
          <div
            className="mb-4 text-[11px] tracking-[0.5em] text-amber-100/45"
            style={{ animation: 'hp-glow-pulse 5s ease-in-out infinite' }}
          >
            ✦
          </div>
          <h1
            className="font-serif text-[44px] italic leading-none tracking-wide text-white/92"
            style={{ animation: `hp-drift 8s ease-in-out 1s infinite` }}
          >
            constellations
          </h1>
          <p className="mt-4 text-[10px] uppercase tracking-[0.42em] text-white/40">
            a quiet study of light
          </p>
        </div>

        <div className="flex flex-col gap-8">
          {entries.map((e, i) => (
            <HeroCard key={e.entry.idx} entry={e.entry} index={i} onClick={e.onClick} />
          ))}
        </div>

        <div
          className="text-center text-[9px] uppercase tracking-[0.42em] text-white/25"
          style={{ animation: `hp-fade-up 0.9s ${EASE} 1s both` }}
        >
          gesture &nbsp;·&nbsp; matter &nbsp;·&nbsp; light
        </div>
      </div>
    </div>
  )
}
