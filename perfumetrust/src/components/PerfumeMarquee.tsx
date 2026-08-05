// Faixa decorativa com frascos ilustrados (linha dourada original, sem foto
// de marca) passando no topo do site — perfumes de nicho, designer e árabes
// bem conhecidos nos grupos de desapego. Puramente decorativo, roda em CSS
// (sem JS), então funciona igual em qualquer navegador/modo de desempenho.

type PerfumeEntry = { brand: string; name: string };

const PERFUMES: PerfumeEntry[] = [
  { brand: "Nishane", name: "Hacivat" },
  { brand: "Armaf", name: "Club de Nuit Intense Man" },
  { brand: "Xerjoff", name: "Naxos" },
  { brand: "Amouage", name: "Interlude Man" },
  { brand: "Tom Ford", name: "Oud Wood" },
  { brand: "Dior", name: "Sauvage" },
  { brand: "Maison Francis Kurkdjian", name: "Baccarat Rouge 540" },
  { brand: "Creed", name: "Aventus" },
  { brand: "Lattafa", name: "Khamrah" },
  { brand: "Rasasi", name: "Hawas" },
  { brand: "Afnan", name: "9pm" },
];

// Três silhuetas originais de frasco (não reproduzem nenhum frasco real),
// só pra dar variedade visual à faixa.
function BottleIcon({ variant }: { variant: number }) {
  const common = {
    width: 26,
    height: 40,
    viewBox: "0 0 26 40",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1,
  };

  if (variant === 0) {
    // Frasco alto, retangular, tampa quadrada — estética "designer".
    return (
      <svg {...common}>
        <rect x="9" y="1.5" width="8" height="4" rx="0.5" />
        <rect x="10.5" y="5.5" width="5" height="3" />
        <path d="M6 9.5 h14 l1 3.5 v22 a2 2 0 0 1 -2 2 H7 a2 2 0 0 1 -2 -2 v-22 z" />
        <line x1="4.5" y1="17" x2="21.5" y2="17" opacity="0.5" />
      </svg>
    );
  }

  if (variant === 1) {
    // Flaconete mais arredondado — estética "árabe/oriental".
    return (
      <svg {...common}>
        <rect x="10.5" y="1.5" width="5" height="3.5" rx="0.5" />
        <path d="M9.5 5 h7 v3 c3 1.5 4.5 4.5 4.5 8 v16 a2 2 0 0 1 -2 2 H7 a2 2 0 0 1 -2 -2 v-16 c0 -3.5 1.5 -6.5 4.5 -8 z" />
        <line x1="5.2" y1="26" x2="20.8" y2="26" opacity="0.5" />
      </svg>
    );
  }

  // Frasco facetado/anguloso — estética "nicho".
  return (
    <svg {...common}>
      <rect x="10" y="1.5" width="6" height="3.5" />
      <path d="M8 5 h10 l2.5 6 v23 a1.8 1.8 0 0 1 -1.8 1.8 H7.3 A1.8 1.8 0 0 1 5.5 34.5 v-23 z" />
      <path d="M8 5 l-2.5 6 M18 5 l2.5 6" opacity="0.6" />
    </svg>
  );
}

export function PerfumeMarquee() {
  const items = [...PERFUMES, ...PERFUMES];

  return (
    <div className="group overflow-hidden border-b border-ink-700 bg-ink-950">
      <div className="flex w-max animate-marquee gap-10 py-4 group-hover:[animation-play-state:paused] sm:gap-16">
        {items.map((p, i) => (
          <div key={i} className="flex shrink-0 flex-col items-center gap-1.5 text-gold-500/80">
            <BottleIcon variant={i % 3} />
            <span className="whitespace-nowrap font-mono text-[9px] uppercase tracking-[0.16em] text-ink-400">
              <span className="text-gold-400">{p.brand}</span> — {p.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
