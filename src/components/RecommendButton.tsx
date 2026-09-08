"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Props {
  recommendedId: string;
  currentUserId: string;
  initiallyRecommended: boolean;
}

// Botão de "recomendo este vendedor" — um sinal social simples, separado
// da nota de estrelas. Qualquer usuário logado pode recomendar (ou
// desfazer), sem precisar de uma transação concluída antes.
export function RecommendButton({ recommendedId, currentUserId, initiallyRecommended }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [recommended, setRecommended] = useState(initiallyRecommended);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setLoading(true);
    setError(null);

    if (recommended) {
      const { error } = await supabase
        .from("recommendations")
        .delete()
        .eq("recommender_id", currentUserId)
        .eq("recommended_id", recommendedId);
      setLoading(false);
      if (error) {
        setError(error.message);
        return;
      }
      setRecommended(false);
    } else {
      const { error } = await supabase
        .from("recommendations")
        .insert({ recommender_id: currentUserId, recommended_id: recommendedId });
      setLoading(false);
      if (error) {
        setError(error.message);
        return;
      }
      setRecommended(true);
    }

    router.refresh();
  }

  return (
    <div>
      <button
        onClick={toggle}
        disabled={loading}
        className={`rounded-lg px-[18px] py-3 text-[11.5px] font-semibold uppercase tracking-[0.02em] transition-colors disabled:opacity-50 ${
          recommended
            ? "border border-verde-dark-border bg-verde-dark text-verde-light"
            : "border border-sand-400 bg-white text-obsidian-900 hover:border-dourado hover:text-dourado"
        }`}
      >
        {recommended ? "✓ Recomendado" : "Recomendar"}
      </button>
      {error && <p className="mt-1.5 text-xs text-crimson">{error}</p>}
    </div>
  );
}
