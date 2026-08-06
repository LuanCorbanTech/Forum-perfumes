"use client";

import { useEffect, useRef, useState } from "react";

const SLIDES = [
  { src: "/depoimentos/depoimento-1.jpg", alt: "Anúncio de perfume com elogio ao vendedor, print real do grupo" },
  { src: "/depoimentos/depoimento-2.jpg", alt: "Anúncio de perfume com qualificações do vendedor, print real do grupo" },
  { src: "/depoimentos/depoimento-3.jpg", alt: "Anúncio de perfume com qualificação de vendedor, print real do grupo" },
  { src: "/depoimentos/depoimento-4.jpg", alt: "Anúncio de perfume no grupo de desapego, print real do grupo" },
  { src: "/depoimentos/depoimento-5.jpg", alt: "Anúncio de perfume no grupo de desapego, print real do grupo" },
];

// Carrossel de prints reais do grupo, dentro de uma moldura de iPhone —
// só decorativo/social proof, sem chamada de API nenhuma (redesign
// "handoff": avanço automático a cada 4s, loop, dots clicáveis).
export function TestimonialCarousel() {
  const [slide, setSlide] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function restart() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSlide((s) => (s + 1) % SLIDES.length);
    }, 4000);
  }

  useEffect(() => {
    restart();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function goTo(i: number) {
    setSlide((i + SLIDES.length) % SLIDES.length);
    restart();
  }

  return (
    <div>
      <div
        className="relative w-[272px] rounded-[42px] bg-obsidian-900 p-2"
        style={{
          boxShadow:
            "0 30px 60px -18px rgba(18,22,26,0.45), 0 12px 24px -12px rgba(18,22,26,0.2), inset 0 0 0 1px #333A42",
        }}
      >
        <div className="relative aspect-[9/18.5] w-full overflow-hidden rounded-[35px] bg-[#0B0E11]">
          {SLIDES.map((sl, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={sl.src}
              src={sl.src}
              alt={sl.alt}
              className="absolute inset-0 h-full w-full object-cover object-top transition-opacity duration-[800ms] ease-in-out"
              style={{ opacity: i === slide ? 1 : 0 }}
            />
          ))}
          <span className="absolute left-1/2 top-2.5 z-[3] h-[22px] w-[78px] -translate-x-1/2 rounded-full bg-obsidian-900" />
        </div>
      </div>

      <div className="mt-4 flex justify-center gap-1.5">
        {SLIDES.map((sl, i) => (
          <button
            key={sl.src}
            type="button"
            onClick={() => goTo(i)}
            aria-label={sl.alt}
            className={`h-[7px] w-[7px] rounded-full p-0 transition-colors duration-300 ${
              i === slide ? "bg-dourado" : "bg-sand-400"
            }`}
          />
        ))}
      </div>

      <p className="mx-auto mt-3 max-w-[272px] text-center text-[10px] font-semibold uppercase tracking-[0.02em] text-dourado">
        Negociações e depoimentos reais da comunidade
      </p>
    </div>
  );
}
