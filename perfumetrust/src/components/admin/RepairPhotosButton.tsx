"use client";

import { useState } from "react";
import { repairPhotoContentTypes } from "@/app/admin/cadastros/actions";

// Botão de manutenção "rode uma vez": conserta o ícone quebrado das fotos
// que já foram enviadas antes da correção do Content-Type. Depois que
// todo mundo estiver certo, não tem problema nenhum clicar de novo (não
// faz nada de ruim, só reconfirma o que já está certo).
export function RepairPhotosButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  async function handleClick() {
    setLoading(true);
    setMessage(null);
    setIsError(false);
    const result = await repairPhotoContentTypes();
    setLoading(false);
    if (!result.ok) {
      setIsError(true);
      setMessage(result.error ?? "Não foi possível corrigir as fotos.");
      return;
    }
    setMessage(`Conferidas ${result.checked ?? 0} fotos, ${result.fixed ?? 0} corrigidas.`);
  }

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <button
        onClick={handleClick}
        disabled={loading}
        className="text-[12px] font-medium text-[#8A8F98] underline decoration-dotted underline-offset-2 transition-colors disabled:opacity-50 hover:text-dourado-dark"
      >
        {loading ? "Corrigindo..." : "Corrigir fotos com ícone quebrado"}
      </button>
      {message && (
        <p className={`text-[12.5px] ${isError ? "text-crimson" : "text-verde"}`}>{message}</p>
      )}
    </div>
  );
}
