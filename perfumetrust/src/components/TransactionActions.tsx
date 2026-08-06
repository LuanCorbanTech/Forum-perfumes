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

const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5MB

export function TransactionActions({ transaction, currentUserId, myReviewAlreadyExists }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setPhotoError(null);
    if (file && file.size > MAX_PHOTO_BYTES) {
      setPhotoError("A foto precisa ter até 5MB.");
      setPhoto(null);
      e.target.value = "";
      return;
    }
    setPhoto(file);
  }

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

    let photoUrl: string | null = null;
    if (photo) {
      const ext = photo.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${currentUserId}/${transaction.id}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("review-photos")
        .upload(path, photo, { contentType: photo.type || undefined });
      if (uploadError) {
        setLoading(false);
        setError(`Não foi possível enviar a foto: ${uploadError.message}`);
        return;
      }
      photoUrl = supabase.storage.from("review-photos").getPublicUrl(path).data.publicUrl;
    }

    const { error } = await supabase.from("reviews").insert({
      transaction_id: transaction.id,
      reviewer_id: currentUserId,
      reviewed_id: reviewedId,
      rating,
      comment: comment.trim() || null,
      photo_url: photoUrl,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  if (transaction.status === "cancelled") {
    return <p className="text-sm text-[#8A8F98]">Esta transação foi cancelada.</p>;
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-lg border border-crimson-tint-border bg-crimson-tint p-2.5 text-sm text-crimson">
          {error}
        </p>
      )}

      {transaction.status !== "completed" && (
        <div className="rounded-card border border-sand-300 bg-white p-5">
          <p className="mb-3.5 text-sm font-normal leading-relaxed text-[#5B6470]">
            {iConfirmed
              ? "Você já confirmou esta transação. Aguardando confirmação da outra parte."
              : "Confirme abaixo assim que receber o produto e/ou o pagamento combinado."}
            {otherConfirmed && !iConfirmed && " A outra parte já confirmou, falta você."}
          </p>
          <button
            onClick={handleConfirm}
            disabled={loading || iConfirmed}
            className="rounded-lg bg-obsidian-900 px-4 py-2.5 text-[12px] font-semibold uppercase tracking-[0.02em] text-white transition-colors disabled:opacity-50 hover:bg-dourado hover:text-obsidian-900"
          >
            {iConfirmed ? "Confirmado ✓" : "Confirmar transação"}
          </button>
        </div>
      )}

      {transaction.status === "completed" && !myReviewAlreadyExists && (
        <form onSubmit={handleReview} className="space-y-3.5 rounded-card border border-sand-300 bg-white p-5">
          <p className="text-sm font-semibold text-obsidian-900">Avalie a outra parte</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                type="button"
                key={n}
                onClick={() => setRating(n)}
                className={`text-2xl ${n <= rating ? "text-dourado" : "text-sand-400"}`}
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
            className="w-full rounded-lg border border-sand-400 bg-white p-2.5 text-sm text-obsidian-900 placeholder-[#A0A5AC] focus:border-dourado focus:outline-none focus:ring-2 focus:ring-dourado/20"
            rows={3}
          />
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#8A8F98]">
              Foto do perfume recebido <span className="text-[#A0A5AC]">(opcional)</span>
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="w-full rounded-lg border border-sand-400 bg-white p-2 text-xs text-[#5B6470] file:mr-3 file:rounded file:border-0 file:bg-dourado file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-obsidian-900"
            />
            {photoError && <p className="mt-1 text-xs text-crimson">{photoError}</p>}
            {photo && !photoError && (
              <p className="mt-1 text-xs text-[#8A8F98]">Selecionado: {photo.name}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-obsidian-900 px-4 py-2.5 text-[12px] font-semibold uppercase tracking-[0.02em] text-white transition-colors disabled:opacity-50 hover:bg-dourado hover:text-obsidian-900"
          >
            {loading ? "Enviando..." : "Enviar avaliação"}
          </button>
        </form>
      )}

      {transaction.status === "completed" && myReviewAlreadyExists && (
        <p className="rounded-lg border border-verde-tint-border bg-verde-tint p-3 text-sm text-verde">
          Você já avaliou esta transação. Obrigado!
        </p>
      )}
    </div>
  );
}
