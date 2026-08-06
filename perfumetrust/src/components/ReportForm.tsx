"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { REPORT_REASON_LABELS, type ReportReason } from "@/lib/types";

interface Props {
  reportedId: string;
  reportedName: string;
  transactionId?: string;
  currentUserId: string;
}

export function ReportForm({ reportedId, reportedName, transactionId, currentUserId }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [reason, setReason] = useState<ReportReason>("golpe");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (description.trim().length < 10) {
      setError("Descreva com mais detalhes (mínimo 10 caracteres).");
      return;
    }
    setLoading(true);
    setError(null);

    const { error } = await supabase.from("reports").insert({
      reporter_id: currentUserId,
      reported_id: reportedId,
      transaction_id: transactionId ?? null,
      reason,
      description: description.trim(),
    });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSuccess(true);
    router.refresh();
  }

  if (success) {
    return (
      <p className="rounded-card border border-verde-tint-border bg-verde-tint p-4 text-sm text-verde">
        Denúncia enviada. Nossa equipe irá analisar em breve.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-[560px] space-y-4 rounded-card border border-sand-300 bg-white p-[22px]">
      <p className="text-[13px] font-normal text-[#5B6470]">
        Denunciar <span className="font-semibold text-obsidian-900">{reportedName}</span>
      </p>

      {error && (
        <p className="rounded-lg border border-crimson-tint-border bg-crimson-tint p-3 text-[12.5px] text-crimson">
          {error}
        </p>
      )}

      <div>
        <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.02em] text-[#8A8F98]">
          Motivo
        </label>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value as ReportReason)}
          className="h-11 w-full rounded-lg border border-sand-400 bg-white px-3 text-sm text-obsidian-900 focus:border-dourado focus:outline-none focus:ring-2 focus:ring-dourado/20"
        >
          {Object.entries(REPORT_REASON_LABELS).map(([value, label]) => (
            <option key={value} value={value} className="bg-white text-obsidian-900">
              {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.02em] text-[#8A8F98]">
          Descrição
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descreva o que aconteceu, com datas e valores."
          className="w-full rounded-lg border border-sand-400 bg-white p-3 text-sm text-obsidian-900 placeholder-[#A0A5AC] focus:border-dourado focus:outline-none focus:ring-2 focus:ring-dourado/20"
          rows={4}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-obsidian-900 px-[22px] py-[13px] text-[11.5px] font-semibold uppercase tracking-[0.02em] text-white transition-colors disabled:opacity-50 hover:bg-dourado hover:text-obsidian-900"
      >
        Enviar denúncia
      </button>
    </form>
  );
}
