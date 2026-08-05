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
            ? "border-green-300 bg-green-50 text-green-700 hover:bg-green-100"
            : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
        }`}
      >
        {recommended ? "✓ Você recomenda" : "👍 Recomendar este vendedor"}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
