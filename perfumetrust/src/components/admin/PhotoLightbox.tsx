"use client";

import { useEffect, useRef, useState } from "react";

interface PhotoLightboxProps {
  url: string;
  alt: string;
  onClose: () => void;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.5;

// Visualizador de foto em tela cheia, aberto por cima da página (sem sair
// dela nem forçar download). Dá pra dar zoom (roda do mouse, duplo clique,
// ou os botões +/-) e arrastar a imagem quando estiver ampliada. Baixar é
// só uma opção a mais (link "Baixar"), não é mais o comportamento padrão
// de clicar na foto.
export function PhotoLightbox({ url, alt, onClose }: PhotoLightboxProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragState = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  function clampZoom(z: number) {
    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
  }

  function applyZoom(next: number) {
    const clamped = clampZoom(next);
    if (clamped === MIN_ZOOM) setPan({ x: 0, y: 0 });
    setZoom(clamped);
  }

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    applyZoom(zoom + (e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP));
  }

  function handleDoubleClick() {
    applyZoom(zoom > MIN_ZOOM ? MIN_ZOOM : 2.5);
  }

  function handlePointerDown(e: React.PointerEvent<HTMLImageElement>) {
    if (zoom === MIN_ZOOM) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragState.current = { startX: e.clientX, startY: e.clientY, originX: pan.x, originY: pan.y };
    setDragging(true);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLImageElement>) {
    if (!dragState.current) return;
    setPan({
      x: dragState.current.originX + (e.clientX - dragState.current.startX),
      y: dragState.current.originY + (e.clientY - dragState.current.startY),
    });
  }

  function handlePointerUp() {
    dragState.current = null;
    setDragging(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-obsidian-900/95"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex items-center justify-between gap-3 p-3 sm:p-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => applyZoom(zoom - ZOOM_STEP)}
            disabled={zoom <= MIN_ZOOM}
            className="rounded-lg border border-white/20 px-3 py-1.5 text-sm font-medium text-white transition-colors disabled:opacity-30 hover:bg-white/10"
            aria-label="Diminuir zoom"
          >
            −
          </button>
          <span className="min-w-[3.5ch] text-center text-[11px] font-medium text-white/70">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => applyZoom(zoom + ZOOM_STEP)}
            disabled={zoom >= MAX_ZOOM}
            className="rounded-lg border border-white/20 px-3 py-1.5 text-sm font-medium text-white transition-colors disabled:opacity-30 hover:bg-white/10"
            aria-label="Aumentar zoom"
          >
            +
          </button>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={url}
            download
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-white/20 px-3 py-1.5 text-[11.5px] font-medium text-white transition-colors hover:bg-white/10"
          >
            Baixar
          </a>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/20 px-3 py-1.5 text-[11.5px] font-medium text-white transition-colors hover:bg-white/10"
          >
            Fechar ✕
          </button>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center overflow-hidden" onWheel={handleWheel}>
        <img
          src={url}
          alt={alt}
          draggable={false}
          onDoubleClick={handleDoubleClick}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="max-h-full max-w-full touch-none select-none"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transition: dragging ? "none" : "transform 0.15s ease-out",
            cursor: zoom > MIN_ZOOM ? (dragging ? "grabbing" : "grab") : "zoom-in",
          }}
        />
      </div>

      <p className="p-3 text-center text-[11px] text-white/50 sm:p-4">
        Duplo clique ou +/− pra dar zoom · arraste pra mover a imagem ampliada
      </p>
    </div>
  );
}
