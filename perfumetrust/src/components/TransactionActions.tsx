"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Transaction } from "@/lib/types";

interface Props {
  transaction: Transaction;
  currentUserId: string;
  myReviewAlreadyExists: boolean;
}

export function TransactionActions({ transaction, currentUserId, myReviewAlreadyExists }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const isBuyer = currentUserId === transaction.buyer_id;
  const iConfirmed = isBuyer ? !!transaction.buyer_confirmed_at : !!transaction.seller_confirmed_at;
  const otherConfirmed = isBuyer ? !!transaction.seller_confirmed_at : !!transaction.buyer_confirmed_at;
  const reviewedId = isBuyer ? transaction.seller_id : transaction.buyer_id;

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    const { error } = await supabase.rpc("confirm_transaction", {
      p_transaction_id: transaction.id,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  async function handleReview(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.from("reviews").insert({
      transaction_id: transaction.id,
      reviewer_id: currentUserId,
      reviewed_id: reviewedId,
      rating,
      comment: comment.trim() || null,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  if (transaction.status === "cancelled") {
    return <p className="text-sm text-ink-400">Esta transação foi cancelada.</p>;
  }

  return (
    <div className="space-y-4">
      {error && <p className="rounded bg-red-400/10 p-2 text-sm text-red-300">{error}</p>}

      {transaction.status !== "completed" && (
        <div className="rounded-lg border border-ink-700 bg-ink-800/60 p-4">
          <p className="mb-3 text-sm text-ink-300">
            {iConfirmed
              ? "Você já confirmou esta transação. Aguardando confirmação da outra parte."
              : "Confirme abaixo assim que receber o produto e/ou o pagamento combinado."}
            {otherConfirmed && !iConfirmed && " A outra parte já confirmou — falta você."}
          </p>
          <button
            onClick={handleConfirm}
            disabled={loading || iConfirmed}
            className="rounded-lg bg-gold-500 px-4 py-2 font-medium text-ink-950 transition disabled:opacity-50 hover:bg-gold-400"
          >
            {iConfirmed ? "Confirmado ✓" : "Confirmar transação"}
          </button>
        </div>
      )}

      {transaction.status === "completed" && !myReviewAlreadyExists && (
        <form onSubmit={handleReview} className="space-y-3 rounded-lg border border-ink-700 bg-ink-800/60 p-4">
          <p className="font-medium text-ink-100">Avalie a outra parte</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                type="button"
                key={n}
                onClick={() => setRating(n)}
                className={`text-2xl ${n <= rating ? "text-gold-400" : "text-ink-600"}`}
                aria-label={`${n} estrela${n > 1 ? "s" : ""}`}
              >
                ★
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Comentário (opcional)"
            className="w-full rounded-lg border border-ink-600 bg-ink-900/60 p-2 text-sm text-ink-50 placeholder-ink-400 focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400/30"
            rows={3}
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-gold-500 px-4 py-2 font-medium text-ink-950 transition disabled:opacity-50 hover:bg-gold-400"
          >
            Enviar avaliação
          </button>
        </form>
      )}

      {transaction.status === "completed" && myReviewAlreadyExists && (
        <p className="text-sm text-emerald-300">Você já avaliou esta transação. Obrigado!</p>
      )}
    </div>
  );
}
