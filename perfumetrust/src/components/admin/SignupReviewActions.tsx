"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { rejectSignup } from "@/app/admin/cadastros/actions";

export function SignupReviewActions({ userId, canApprove }: { userId: string; canApprove: boolean }) {
  const router = useRouter();
  const supabase = createClient();
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailNotice, setEmailNotice] = useState<string | null>(null);

  async function handleReview(approve: boolean) {
    setLoading(true);
    setError(null);
    setEmailNotice(null);

    if (!approve) {
      // Recusar arquiva os dados/documentos em "Clientes reprovados" e
      // apaga a conta ativa de verdade (ver rejectSignup) — CPF, telefone,
      // e-mail e usuário ficam livres pra um cadastro novo.
      const result = await rejectSignup(userId, notes.trim() || null);
      setLoading(false);
      if (!result.ok) {
        setError(result.error ?? "Não foi possível recusar o cadastro.");
        return;
      }
      if (result.notice) setEmailNotice(result.notice);
      router.refresh();
      return;
    }

    // O próprio banco (admin_review_signup, migration_007) recusa a
    // aprovação se faltar alguma das 3 fotos — a mensagem de erro do
    // Postgres aparece direto aqui embaixo se isso acontecer.
    const { error } = await supabase.rpc("admin_review_signup", {
      p_user_id: userId,
      p_approve: true,
      p_notes: notes.trim() || null,
    });
    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }

    // Aviso por e-mail (Brevo) é "melhor esforço": a aprovação acima já
    // valeu de qualquer forma, então uma falha aqui só vira um aviso
    // discreto, nunca um erro bloqueante (ver supabase/functions/notify-signup-review).
    try {
      const { data, error: notifyError } = await supabase.functions.invoke("notify-signup-review", {
        body: { userId, approved: true, notes: notes.trim() || null },
      });
      if (notifyError) {
        setEmailNotice("Cadastro atualizado, mas não deu pra confirmar o envio do e-mail de aviso.");
      } else if (data?.skipped) {
        setEmailNotice("Cadastro atualizado. E-mail de aviso não enviado: " + data.reason);
      }
    } catch {
      setEmailNotice("Cadastro atualizado, mas não deu pra confirmar o envio do e-mail de aviso.");
    }

    setLoading(false);
    router.refresh();
  }

  return (
    <div className="mt-4 space-y-3 border-t border-sand-200 pt-4">
      {error && (
        <p className="rounded-lg border border-crimson-tint-border bg-crimson-tint p-2 text-xs text-crimson">
          {error}
        </p>
      )}
      {emailNotice && (
        <p className="rounded-lg border border-dourado-tint-border bg-dourado-tint p-2 text-xs text-dourado-dark">
          {emailNotice}
        </p>
      )}
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Motivo (a pessoa vê isso em /conta/verificacao se você recusar)"
        className="w-full rounded-lg border border-sand-400 bg-white p-2.5 text-[13px] text-obsidian-900 placeholder-[#A0A5AC] focus:border-dourado focus:outline-none focus:ring-2 focus:ring-dourado/20"
        rows={2}
      />
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => handleReview(true)}
          disabled={loading || !canApprove}
          title={!canApprove ? "Ainda não enviou o(s) documento(s) e a selfie" : undefined}
          className="rounded-lg bg-verde px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.02em] text-white transition-colors disabled:opacity-50 hover:bg-[#116430]"
        >
          Aprovar cadastro
        </button>
        <button
          onClick={() => handleReview(false)}
          disabled={loading}
          className="rounded-lg border border-sand-400 bg-white px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.02em] text-[#3C434C] transition-colors disabled:opacity-50 hover:border-obsidian-900 hover:text-obsidian-900"
        >
          Recusar cadastro
        </button>
      </div>
    </div>
  );
}
