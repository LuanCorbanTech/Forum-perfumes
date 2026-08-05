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
        className={`rounded-lg border px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${
          recommended
            ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20"
            : "border-ink-600 bg-ink-900/40 text-ink-200 hover:border-gold-400/40 hover:text-gold-200"
        }`}
      >
        {recommended ? "✓ Você recomenda" : "👍 Recomendar este vendedor"}
      </button>
      {error && <p className="mt-1 text-xs text-red-300">{error}</p>}
    </div>
  );
}
