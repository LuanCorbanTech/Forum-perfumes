"use client";

import { useEffect } from "react";

interface DocumentModalProps {
  onClose: () => void;
  children: React.ReactNode;
}

// Casca genérica de modal usada pra mostrar a Política de Privacidade ou
// os Termos de Uso por cima da própria tela de cadastro/reenvio de
// documento (LoginForm.tsx, VerificacaoForm.tsx), em vez de abrir
// /privacidade ou /termos numa aba nova — assim a pessoa lê sem sair da
// aba nem perder o que já preencheu/selecionou no formulário. Substitui o
// antigo PrivacyPolicyModal.tsx (que ficou sem uso, pode ser apagado).
// Mesmo padrão de overlay do PhotoLightbox.tsx (Esc fecha, trava o
// scroll do fundo).
export function DocumentModal({ onClose, children }: DocumentModalProps) {
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian-900/70 p-4 sm:p-8"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Tela de fundo (cadastro/reenvio) fica fixa; só o texto do
          modal rola, por dentro deste card — "Rolagem Interna". O
          botão "Fechar" fica fora da área com scroll, sempre visível. */}
      <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col rounded-card bg-white shadow-[0_20px_60px_rgba(18,22,26,0.25)]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-lg border border-sand-400 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.02em] text-[#3C434C] transition-colors hover:border-obsidian-900 hover:text-obsidian-900"
        >
          Fechar ✕
        </button>
        <div className="overflow-y-auto p-6 sm:p-9">{children}</div>
      </div>
    </div>
  );
}
