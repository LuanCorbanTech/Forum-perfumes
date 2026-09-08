import Image from "next/image";

// Faixa decorativa com fotos reais de perfumes de nicho, designer e árabes
// passando no topo do site (fotos enviadas pelo dono do canal). Roda em CSS
// puro (sem JS), então funciona igual em qualquer navegador/modo de desempenho.

type PerfumeEntry = { brand: string; name: string; image: string };

const PERFUMES: PerfumeEntry[] = [
  { brand: "Nishane", name: "Hacivat", image: "/perfumes/nishane-hacivat.jpg" },
  { brand: "Armaf", name: "Club de Nuit Intense Man", image: "/perfumes/armaf-club-de-nuit.jpg" },
  { brand: "Xerjoff", name: "Naxos", image: "/perfumes/xerjoff-naxos.jpg" },
  { brand: "Amouage", name: "Interlude Man", image: "/perfumes/amouage-interlude.jpg" },
  { brand: "Tom Ford", name: "Oud Wood", image: "/perfumes/tomford-oudwood.jpg" },
  { brand: "Dior", name: "Sauvage", image: "/perfumes/dior-sauvage.jpg" },
  {
    brand: "Maison Francis Kurkdjian",
    name: "Baccarat Rouge 540",
    image: "/perfumes/mfk-baccarat-rouge-540.jpg",
  },
  { brand: "Creed", name: "Aventus", image: "/perfumes/creed-aventus.jpg" },
  { brand: "Lattafa", name: "Khamrah", image: "/perfumes/lattafa-khamrah.jpg" },
  { brand: "Rasasi", name: "Hawas", image: "/perfumes/rasasi-hawas.jpg" },
  { brand: "Afnan", name: "9pm", image: "/perfumes/afnan-9pm.jpg" },
];

export function PerfumeMarquee() {
  const items = [...PERFUMES, ...PERFUMES];

  return (
    <div className="group overflow-hidden border-b border-ink-700 bg-ink-950">
      <div className="flex w-max animate-marquee gap-8 py-4 group-hover:[animation-play-state:paused] sm:gap-12">
        {items.map((p, i) => (
          <div key={i} className="flex shrink-0 flex-col items-center gap-1.5">
            <div className="h-16 w-16 overflow-hidden border border-ink-600 bg-ink-900 sm:h-20 sm:w-20">
              <Image
                src={p.image}
                alt={`${p.brand} — ${p.name}`}
                width={80}
                height={80}
                className="h-full w-full object-cover"
              />
            </div>
            <span className="whitespace-nowrap font-mono text-[9px] uppercase tracking-[0.16em] text-ink-400">
              <span className="text-gold-400">{p.brand}</span> — {p.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
