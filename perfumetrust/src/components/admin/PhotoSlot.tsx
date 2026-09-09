"use client";

import { useEffect, useState } from "react";
import { PhotoLightbox } from "./PhotoLightbox";

interface PhotoSlotProps {
  label: string;
  url: string | null;
  heightClassName?: string;
}

function isHeicUrl(url: string): boolean {
  return /\.(heic|heif)(\?|$)/i.test(url);
}

// Miniatura de documento/selfie usada nas 3 telas de admin que mostram
// fotos (cadastros, usuários, reprovados). Clicar abre um visualizador em
// tela cheia com zoom (PhotoLightbox) em vez de sair pra outra aba —
// baixar continua possível, mas agora é uma ação extra dentro do
// visualizador, não o que acontece só de clicar na foto.
//
// Fotos enviadas antes da correção do cadastro podem ter ficado salvas em
// HEIC (padrão da câmera do iPhone) — formato que a maioria dos
// navegadores de computador não sabe exibir direto. Pra essas (só essas —
// arquivos novos já entram em JPEG), convertemos aqui mesmo no navegador
// do admin só pra exibir; o arquivo original em HEIC continua intacto no
// Storage, nada é sobrescrito.
export function PhotoSlot({ label, url, heightClassName = "h-28" }: PhotoSlotProps) {
  const [open, setOpen] = useState(false);
  const [displayUrl, setDisplayUrl] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);
  const [convertFailed, setConvertFailed] = useState(false);

  const isPdf = !!url && url.split("?")[0].toLowerCase().endsWith(".pdf");
  const needsHeicConversion = !!url && !isPdf && isHeicUrl(url);

  useEffect(() => {
    let cancelled = false;
    let createdObjectUrl: string | null = null;

    async function convert() {
      if (!url || !needsHeicConversion) {
        setDisplayUrl(url);
        return;
      }
      setConverting(true);
      setConvertFailed(false);
      try {
        const heic2any = (await import("heic2any")).default;
        const res = await fetch(url);
        const blob = await res.blob();
        const result = await heic2any({ blob, toType: "image/jpeg", quality: 0.85 });
        const jpegBlob = Array.isArray(result) ? result[0] : result;
        const objectUrl = URL.createObjectURL(jpegBlob);
        createdObjectUrl = objectUrl;
        if (!cancelled) setDisplayUrl(objectUrl);
      } catch {
        if (!cancelled) setConvertFailed(true);
      } finally {
        if (!cancelled) setConverting(false);
      }
    }

    convert();

    return () => {
      cancelled = true;
      if (createdObjectUrl) URL.revokeObjectURL(createdObjectUrl);
    };
  }, [url, needsHeicConversion]);

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
        ) : converting ? (
          <div
            className={`flex ${heightClassName} w-full items-center justify-center rounded-lg border border-sand-300 bg-sand text-[10px] text-[#8A8F98]`}
          >
            Carregando foto...
          </div>
        ) : convertFailed ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className={`flex ${heightClassName} w-full flex-col items-center justify-center gap-1 rounded-lg border border-sand-300 bg-sand text-center text-[10.5px] font-medium text-[#5B6470] hover:border-dourado hover:text-dourado-dark`}
          >
            Não deu pra exibir aqui — abrir/baixar
          </a>
        ) : (
          <>
            <button type="button" onClick={() => setOpen(true)} className="block w-full">
              <img
                src={displayUrl ?? url}
                alt={label}
                className={`${heightClassName} w-full rounded-lg border border-sand-300 object-cover transition-opacity hover:opacity-90`}
              />
            </button>
            {open && <PhotoLightbox url={displayUrl ?? url} alt={label} onClose={() => setOpen(false)} />}
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
