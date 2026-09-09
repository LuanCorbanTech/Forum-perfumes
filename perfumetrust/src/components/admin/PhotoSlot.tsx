"use client";

import { useState } from "react";
import { PhotoLightbox } from "./PhotoLightbox";

interface PhotoSlotProps {
  label: string;
  url: string | null;
  heightClassName?: string;
}

// Miniatura de documento/selfie usada nas 3 telas de admin que mostram
// fotos (cadastros, usuários, reprovados). Clicar abre um visualizador em
// tela cheia com zoom (PhotoLightbox) em vez de sair pra outra aba —
// baixar continua possível, mas agora é uma ação extra dentro do
// visualizador, não o que acontece só de clicar na foto.
export function PhotoSlot({ label, url, heightClassName = "h-28" }: PhotoSlotProps) {
  const [open, setOpen] = useState(false);
  const isPdf = !!url && url.split("?")[0].toLowerCase().endsWith(".pdf");

  return (
    <div>
      <p className="mb-1.5 text-[9.5px] font-medium uppercase tracking-[0.02em] text-[#8A8F98]">{label}</p>
      {url ? (
        isPdf ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className={`flex ${heightClassName} w-full flex-col items-center justify-center gap-1 rounded-lg border border-sand-300 bg-sand text-[11px] font-medium text-[#5B6470] hover:border-dourado hover:text-dourado-dark`}
          >
            <span className="text-xl">📄</span>
            Abrir PDF
          </a>
        ) : (
          <>
            <button type="button" onClick={() => setOpen(true)} className="block w-full">
              <img
                src={url}
                alt={label}
                className={`${heightClassName} w-full rounded-lg border border-sand-300 object-cover transition-opacity hover:opacity-90`}
              />
            </button>
            {open && <PhotoLightbox url={url} alt={label} onClose={() => setOpen(false)} />}
          </>
        )
      ) : (
        <div
          className={`flex ${heightClassName} w-full items-center justify-center rounded-lg border border-dashed border-sand-400 text-[10px] text-[#8A8F98]`}
        >
          Sem foto
        </div>
      )}
    </div>
  );
}
