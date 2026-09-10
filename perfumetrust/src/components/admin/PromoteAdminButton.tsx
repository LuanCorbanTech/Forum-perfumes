"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { promoteToAdmin } from "@/app/admin/usuarios/actions";

// Reaproveita a conta que a pessoa JÁ TEM (mesmo e-mail/senha que ela já
// usa) e só libera acesso de admin nela — ao contrário do formulário em
// /admin/administradores (que sempre cria uma conta nova do zero), isso
// nunca corre risco de duplicar e-mail nem apaga o histórico da conta
// (avaliações, vendas, nota de confiança).
export function PromoteAdminButton({ userId, fullName }: { userId: string; fullName: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    const result = await promoteToAdmin(userId);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Não foi possível tornar essa conta admin.");
      return;
    }
    setConfirming(false);
    router.refresh();
  }

  if (confirming) {
    return (
      <div className="max-w-sm rounded-lg border border-dourado-tint-border bg-dourado-tint p-3.5">
        <p className="text-[12.5px] font-medium text-dourado-dark">
          Tornar {fullName} administrador? A conta passa a ter acesso total ao painel de admin.
        </p>
        {error && <p className="mt-2 text-[12px] text-crimson">{error}</p>}
        <div className="mt-2.5 flex gap-2">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="rounded-lg bg-obsidian-900 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.02em] text-white transition-colors disabled:opacity-50 hover:bg-dourado hover:text-obsidian-900"
          >
            {loading ? "Confirmando..." : "Sim, tornar admin"}
          </button>
          <button
            type="button"
            onClick={() => {
              setConfirming(false);
              setError(null);
            }}
            disabled={loading}
            className="rounded-lg border border-sand-400 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.02em] text-[#5B6470] transition-colors hover:bg-sand"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="rounded-lg border border-sand-400 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.02em] text-obsidian-900 transition-colors hover:border-dourado hover:text-dourado-dark"
    >
      Tornar admin
    </button>
  );
}
